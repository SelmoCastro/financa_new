import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isEmailVerified: user.isEmailVerified,
      }
    };
  }

  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Generate Verification Token
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: {
        token,
        type: 'EMAIL_VERIFY',
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }
    });

    // Send Email
    await this.emailService.sendVerificationEmail(user.email, user.name || 'Usuário', token);

    return { message: 'User registered. Please check your email to verify your account.', userId: user.id };
  }

  async verifyEmail(token: string) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!verificationToken || verificationToken.type !== 'EMAIL_VERIFY') {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { isEmailVerified: true },
    });

    await this.prisma.verificationToken.delete({ where: { id: verificationToken.id } });
    return { message: 'Email successfully verified' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      // Return success anyway to prevent email enumeration
      return { message: 'If that email is registered, a reset link will be sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: {
        token,
        type: 'PASSWORD_RESET',
        userId: user.id,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      }
    });

    await this.emailService.sendPasswordResetEmail(user.email, user.name || 'Usuário', token);
    return { message: 'If that email is registered, a reset link will be sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!verificationToken || verificationToken.type !== 'PASSWORD_RESET') {
      throw new BadRequestException('Invalid reset token');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { password: hashedPassword },
    });

    // Revoke token
    await this.prisma.verificationToken.deleteMany({
      where: { userId: verificationToken.userId, type: 'PASSWORD_RESET' }
    });

    return { message: 'Password has been successfully updated' };
  }
}
