import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedException(
        `Conta temporariamente bloqueada. Tente novamente em ${remainingMin} minuto(s).`,
      );
    }

    if (await bcrypt.compare(pass, user.password)) {
      // Successful login — reset failed attempts and lock
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      // Audit log - successful login
      this.auditService.log(user.id, AuditAction.LOGIN, 'User', user.id);
      const { password, ...result } = user;
      return result;
    }

    // Failed login — increment counter
    const newAttempts = user.failedLoginAttempts + 1;
    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: newAttempts,
    };

    if (newAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Audit log - failed login
    this.auditService.log(user.id, AuditAction.LOGIN_FAILED, 'User', user.id);

    throw new UnauthorizedException('Credenciais inválidas');
  }

  async generateTokens(userId: string, email: string, isEmailVerified: boolean, isAdmin: boolean = false) {
    const payload = { sub: userId, email, isEmailVerified, isAdmin };

    // Build separate tokens
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Store a hashed version of the refresh token in the database to allow remote invalidation
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async login(user: { id: string; email: string; password?: string; name?: string | null; isEmailVerified: boolean; isAdmin: boolean }) {
    const tokens = await this.generateTokens(user.id, user.email, user.isEmailVerified, user.isAdmin);

    return {
      access_token: tokens.accessToken, // Keeping for backward compatibility with mobile initially
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
    return { message: 'Desconectado com sucesso' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (!refreshTokenMatches) {
      // Reuse detection: se o refresh token nao bate, possivel roubo.
      // Invalidar TODOS os tokens do usuario para forcar re-login.
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      });
      throw new UnauthorizedException('Access Denied: Invalid Refresh Token');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.isEmailVerified, user.isAdmin);
    return {
      access_token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async register(createUserDto: CreateUserDto) {
    if (!createUserDto.termsAccepted) {
      throw new ForbiddenException('Você deve aceitar os termos de uso para criar uma conta');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    const { email, name } = createUserDto;
    const user = await this.usersService.createWithEmailVerified({
      email,
      name: name || '',
      password: hashedPassword,
      isEmailVerified: false,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    // Gerar token de verificação de email e enviar
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = await bcrypt.hash(verifyToken, 10);
    await this.prisma.verificationToken.create({
      data: {
        token: hashedVerifyToken,
        type: 'EMAIL_VERIFY',
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    // Dispara email de verificação em background (fire-and-forget)
    this.emailService
      .sendVerificationEmail(user.email, user.name || 'Usuário', verifyToken)
      .catch(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Falha ao enviar verification email');
        }
      });

    const loginData = await this.login(user);

    return {
      message: 'Cadastro realizado com sucesso!',
      userId: user.id,
      ...loginData,
    };
  }

  async verifyEmail(token: string) {
    // Find all EMAIL_VERIFY tokens and compare with bcrypt
    // (tokens are stored hashed, so we can't look up by plaintext)
    const candidates = await this.prisma.verificationToken.findMany({
      where: { type: 'EMAIL_VERIFY', expiresAt: { gte: new Date() }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      include: { user: true },
    });

    let verificationToken: typeof candidates[number] | null = null;
    for (const candidate of candidates) {
      if (await bcrypt.compare(token, candidate.token)) {
        verificationToken = candidate;
        break;
      }
    }

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { isEmailVerified: true },
    });

    await this.prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });
    return { message: 'Email successfully verified' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      // Return success anyway to prevent email enumeration
      return {
        message: 'If that email is registered, a reset link will be sent.',
      };
    }

    // Per-user rate limit: max 1 reset email per 5 minutes
    const recentToken = await this.prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });
    if (recentToken) {
      return {
        message: 'If that email is registered, a reset link will be sent.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);
    await this.prisma.verificationToken.create({
      data: {
        token: hashedToken,
        type: 'PASSWORD_RESET',
        userId: user.id,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      },
    });

    // Dispara o email em background (fire-and-forget) para não travar a requisição HTTP caso o SMTP falhe/demore
    this.emailService
      .sendPasswordResetEmail(user.email, user.name || 'Usuário', token)
      .catch(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Falha ao enviar password reset email');
        }
      });

    return {
      message: 'If that email is registered, a reset link will be sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find all PASSWORD_RESET tokens and compare with bcrypt (tokens are stored hashed)
    const candidates = await this.prisma.verificationToken.findMany({
      where: { type: 'PASSWORD_RESET', expiresAt: { gte: new Date() }, createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
      include: { user: true },
    });

    let verificationToken: typeof candidates[number] | null = null;
    for (const candidate of candidates) {
      if (await bcrypt.compare(token, candidate.token)) {
        verificationToken = candidate;
        break;
      }
    }

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { password: hashedPassword, hashedRefreshToken: null },
    });

    // Revoke token
    await this.prisma.verificationToken.deleteMany({
      where: { userId: verificationToken.userId, type: 'PASSWORD_RESET' },
    });

    // Audit log - password reset
    this.auditService.log(verificationToken.userId, AuditAction.PASSWORD_RESET, 'User', verificationToken.userId);

    return { message: 'Password has been successfully updated' };
  }

  /** V2: Verify JWT signature instead of just decoding (prevents token forgery) */
  decodeJwt(token: string): { sub: string; email: string; [key: string]: unknown } {
    return this.jwtService.verify(token, { ignoreExpiration: true });
  }

  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isEmailVerified: true,
        subscription: {
          select: { plan: true, status: true, expiresAt: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { subscription, ...rest } = user;
    return {
      ...rest,
      plan: subscription?.status === 'active' ? subscription.plan : 'free',
    };
  }

  async changeName(userId: string, name: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    return { name };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Senha atual incorreta');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('A nova senha deve ter pelo menos 8 caracteres');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, hashedRefreshToken: null },
    });

    this.auditService.log(userId, AuditAction.PASSWORD_RESET, 'User', userId);

    return { message: 'Senha alterada com sucesso' };
  }

  async changeEmail(userId: string, newEmail: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Senha incorreta');
    }

    // Check if email is already in use
    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      throw new BadRequestException('Este e-mail já está em uso');
    }

    // Update email and mark as unverified, revoke all sessions
    await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, isEmailVerified: false, hashedRefreshToken: null },
    });

    // Send verification email to the new address
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = await bcrypt.hash(verifyToken, 10);
    await this.prisma.verificationToken.create({
      data: {
        token: hashedVerifyToken,
        type: 'EMAIL_VERIFY',
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    this.emailService
      .sendVerificationEmail(newEmail, user.name || 'Usuário', verifyToken)
      .catch(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Falha ao enviar verification email para novo endereço');
        }
      });

    return { message: 'E-mail alterado. Verifique seu novo endereço para confirmar.', email: newEmail };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Senha incorreta');
    }

    await this.usersService.remove(userId);

    return { message: 'Conta excluída com sucesso' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.isEmailVerified) {
      return { message: 'Email já verificado' };
    }

    // Delete any existing EMAIL_VERIFY tokens for this user
    await this.prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'EMAIL_VERIFY' },
    });

    // Generate a new verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = await bcrypt.hash(verifyToken, 10);
    await this.prisma.verificationToken.create({
      data: {
        token: hashedVerifyToken,
        type: 'EMAIL_VERIFY',
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    // Fire-and-forget email
    this.emailService
      .sendVerificationEmail(user.email, user.name || 'Usuário', verifyToken)
      .catch(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Falha ao enviar verification email');
        }
      });

    return { message: 'Email de verificação reenviado com sucesso' };
  }
}
