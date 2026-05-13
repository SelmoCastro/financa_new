     1|import {
     2|  Injectable,
     3|  UnauthorizedException,
     4|  BadRequestException,
     5|  NotFoundException,
     6|  ForbiddenException,
     7|} from '@nestjs/common';
     8|import { UsersService } from '../users/users.service';
     9|import { JwtService } from '@nestjs/jwt';
    10|import * as bcrypt from 'bcrypt';
    11|import { CreateUserDto } from '../users/dto/create-user.dto';
    12|import { PrismaService } from '../prisma/prisma.service';
    13|import { EmailService } from '../email/email.service';
    14|import { AuditService } from '../audit/audit.service';
    15|import * as crypto from 'crypto';
    16|
    17|@Injectable()
    18|export class AuthService {
    19|  constructor(
    20|    private usersService: UsersService,
    21|    private jwtService: JwtService,
    22|    private prisma: PrismaService,
    23|    private emailService: EmailService,
    24|    private auditService: AuditService,
    25|  ) {}
    26|
    27|  async validateUser(email: string, pass: string): Promise<any> {
    28|    const user = await this.usersService.findOneByEmail(email);
    29|    if (!user) {
    30|      throw new UnauthorizedException('Credenciais inválidas');
    31|    }
    32|
    33|    // Check if account is locked
    34|    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    35|      const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
    36|      const remainingMin = Math.ceil(remainingMs / 60000);
    37|      throw new UnauthorizedException(
    38|        `Conta temporariamente bloqueada. Tente novamente em ${remainingMin} minuto(s).`,
    39|      );
    40|    }
    41|
    42|    if (await bcrypt.compare(pass, user.password)) {
    43|      // Successful login — reset failed attempts and lock
    44|      await this.prisma.user.update({
    45|        where: { id: user.id },
    46|        data: { failedLoginAttempts: 0, lockedUntil: null },
    47|      });
    48|      // Audit log - successful login
    49|      this.auditService.log({ action: 'auth.login', actorId: user.id, targetType: 'User', targetId: user.id });
    50|      const { password, ...result } = user;
    51|      return result;
    52|    }
    53|
    54|    // Failed login — increment counter
    55|    const newAttempts = user.failedLoginAttempts + 1;
    56|    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
    57|      failedLoginAttempts: newAttempts,
    58|    };
    59|
    60|    if (newAttempts >= 5) {
    61|      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    62|    }
    63|
    64|    await this.prisma.user.update({
    65|      where: { id: user.id },
    66|      data: updateData,
    67|    });
    68|
    69|    // Audit log - failed login
    70|    this.auditService.log({ action: 'auth.login_failed', actorId: user.id, targetType: 'User', targetId: user.id, severity: 'warn' });
    71|
    72|    throw new UnauthorizedException('Credenciais inválidas');
    73|  }
    74|
    75|  async generateTokens(userId: string, email: string, isEmailVerified: boolean, isAdmin: boolean = false) {
    76|    const payload = { sub: userId, email, isEmailVerified, isAdmin };
    77|
    78|    // Build separate tokens
    79|    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    80|    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    81|
    82|    // Store a hashed version of the refresh token in the database to allow remote invalidation
    83|    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    84|    await this.prisma.user.update({
    85|      where: { id: userId },
    86|      data: { hashedRefreshToken },
    87|    });
    88|
    89|    return {
    90|      accessToken,
    91|      refreshToken,
    92|    };
    93|  }
    94|
    95|  async login(user: { id: string; email: string; password?: string; name?: string | null; isEmailVerified: boolean; isAdmin: boolean }) {
    96|    const tokens = await this.generateTokens(user.id, user.email, user.isEmailVerified, user.isAdmin);
    97|
    98|    return {
    99|      access_token: tokens.accessToken, // Keeping for backward compatibility with mobile initially
   100|      refreshToken: tokens.refreshToken,
   101|      user: {
   102|        id: user.id,
   103|        name: user.name,
   104|        email: user.email,
   105|        isAdmin: user.isAdmin,
   106|        isEmailVerified: user.isEmailVerified,
   107|      },
   108|    };
   109|  }
   110|
   111|  async logout(userId: string) {
   112|    await this.prisma.user.update({
   113|      where: { id: userId },
   114|      data: { hashedRefreshToken: null },
   115|    });
   116|    return { message: 'Desconectado com sucesso' };
   117|  }
   118|
   119|  async refreshTokens(userId: string, refreshToken: string) {
   120|    const user = await this.prisma.user.findUnique({
   121|      where: { id: userId },
   122|    });
   123|
   124|    if (!user || !user.hashedRefreshToken) {
   125|      throw new UnauthorizedException('Access Denied');
   126|    }
   127|
   128|    const refreshTokenMatches = await bcrypt.compare(
   129|      refreshToken,
   130|      user.hashedRefreshToken,
   131|    );
   132|
   133|    if (!refreshTokenMatches) {
   134|      // Reuse detection: se o refresh token nao bate, possivel roubo.
   135|      // Invalidar TODOS os tokens do usuario para forcar re-login.
   136|      await this.prisma.user.update({
   137|        where: { id: userId },
   138|        data: { hashedRefreshToken: null },
   139|      });
   140|      throw new UnauthorizedException('Access Denied: Invalid Refresh Token');
   141|    }
   142|
   143|    const tokens = await this.generateTokens(user.id, user.email, user.isEmailVerified, user.isAdmin);
   144|    return {
   145|      access_token: tokens.accessToken,
   146|      refreshToken: tokens.refreshToken,
   147|    };
   148|  }
   149|
   150|  async register(createUserDto: CreateUserDto) {
   151|    if (!createUserDto.termsAccepted) {
   152|      throw new ForbiddenException('Você deve aceitar os termos de uso para criar uma conta');
   153|    }
   154|
   155|    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
   156|    const { email, name } = createUserDto;
   157|    const user = await this.usersService.createWithEmailVerified({
   158|      email,
   159|      name: name || '',
   160|      password: hashedPassword,
   161|      isEmailVerified: false,
   162|      termsAccepted: true,
   163|      termsAcceptedAt: new Date(),
   164|    });
   165|
   166|    // Gerar token de verificação de email e enviar
   167|    const verifyToken = crypto.randomBytes(32).toString('hex');
   168|    const hashedVerifyToken = await bcrypt.hash(verifyToken, 10);
   169|    await this.prisma.verificationToken.create({
   170|      data: {
   171|        token: hashedVerifyToken,
   172|        type: 'EMAIL_VERIFY',
   173|        userId: user.id,
   174|        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
   175|      },
   176|    });
   177|
   178|    // Dispara email de verificação em background (fire-and-forget)
   179|    this.emailService
   180|      .sendVerificationEmail(user.email, user.name || 'Usuário', verifyToken)
   181|      .catch(() => {
   182|        if (process.env.NODE_ENV !== 'production') {
   183|          console.error('Falha ao enviar verification email');
   184|        }
   185|      });
   186|
   187|    const loginData = await this.login(user);
   188|
   189|    return {
   190|      message: 'Cadastro realizado com sucesso!',
   191|      userId: user.id,
   192|      ...loginData,
   193|    };
   194|  }
   195|
   196|  async verifyEmail(token: string) {
   197|    // Find all EMAIL_VERIFY tokens and compare with bcrypt
   198|    // (tokens are stored hashed, so we can't look up by plaintext)
   199|    const candidates = await this.prisma.verificationToken.findMany({
   200|      where: { type: 'EMAIL_VERIFY', expiresAt: { gte: new Date() }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
   201|      include: { user: true },
   202|    });
   203|
   204|    let verificationToken: typeof candidates[number] | null = null;
   205|    for (const candidate of candidates) {
   206|      if (await bcrypt.compare(token, candidate.token)) {
   207|        verificationToken = candidate;
   208|        break;
   209|      }
   210|    }
   211|
   212|    if (!verificationToken) {
   213|      throw new BadRequestException('Invalid verification token');
   214|    }
   215|
   216|    await this.prisma.user.update({
   217|      where: { id: verificationToken.userId },
   218|      data: { isEmailVerified: true },
   219|    });
   220|
   221|    await this.prisma.verificationToken.delete({
   222|      where: { id: verificationToken.id },
   223|    });
   224|    return { message: 'Email successfully verified' };
   225|  }
   226|
   227|  async forgotPassword(email: string) {
   228|    const user = await this.usersService.findOneByEmail(email);
   229|    if (!user) {
   230|      // Return success anyway to prevent email enumeration
   231|      return {
   232|        message: 'If that email is registered, a reset link will be sent.',
   233|      };
   234|    }
   235|
   236|    // Per-user rate limit: max 1 reset email per 5 minutes
   237|    const recentToken = await this.prisma.verificationToken.findFirst({
   238|      where: {
   239|        userId: user.id,
   240|        type: 'PASSWORD_RESET',
   241|        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
   242|      },
   243|    });
   244|    if (recentToken) {
   245|      return {
   246|        message: 'If that email is registered, a reset link will be sent.',
   247|      };
   248|    }
   249|
   250|    const token = crypto.randomBytes(32).toString('hex');
   251|    const hashedToken = await bcrypt.hash(token, 10);
   252|    await this.prisma.verificationToken.create({
   253|      data: {
   254|        token: hashedToken,
   255|        type: 'PASSWORD_RESET',
   256|        userId: user.id,
   257|        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
   258|      },
   259|    });
   260|
   261|    // Dispara o email em background (fire-and-forget) para não travar a requisição HTTP caso o SMTP falhe/demore
   262|    this.emailService
   263|      .sendPasswordResetEmail(user.email, user.name || 'Usuário', token)
   264|      .catch(() => {
   265|        if (process.env.NODE_ENV !== 'production') {
   266|          console.error('Falha ao enviar password reset email');
   267|        }
   268|      });
   269|
   270|    return {
   271|      message: 'If that email is registered, a reset link will be sent.',
   272|    };
   273|  }
   274|
   275|  async resetPassword(token: string, newPassword: string) {
   276|    // Find all PASSWORD_RESET tokens and compare with bcrypt (tokens are stored hashed)
   277|    const candidates = await this.prisma.verificationToken.findMany({
   278|      where: { type: 'PASSWORD_RESET', expiresAt: { gte: new Date() }, createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
   279|      include: { user: true },
   280|    });
   281|
   282|    let verificationToken: typeof candidates[number] | null = null;
   283|    for (const candidate of candidates) {
   284|      if (await bcrypt.compare(token, candidate.token)) {
   285|        verificationToken = candidate;
   286|        break;
   287|      }
   288|    }
   289|
   290|    if (!verificationToken) {
   291|      throw new BadRequestException('Invalid or expired reset token');
   292|    }
   293|
   294|    const hashedPassword = await bcrypt.hash(newPassword, 12);
   295|    await this.prisma.user.update({
   296|      where: { id: verificationToken.userId },
   297|      data: { password: hashedPassword, hashedRefreshToken: null },
   298|    });
   299|
   300|    // Revoke token
   301|    await this.prisma.verificationToken.deleteMany({
   302|      where: { userId: verificationToken.userId, type: 'PASSWORD_RESET' },
   303|    });
   304|
   305|    // Audit log - password reset
   306|    this.auditService.log({ action: 'auth.password_change', actorId: verificationToken.userId, targetType: 'User', targetId: verificationToken.userId, severity: 'warn' });
   307|
   308|    return { message: 'Password has been successfully updated' };
   309|  }
   310|
   311|  /** V2: Verify JWT signature instead of just decoding (prevents token forgery) */
   312|  decodeJwt(token: string): { sub: string; email: string; [key: string]: unknown } {
   313|    return this.jwtService.verify(token, { ignoreExpiration: true });
   314|  }
   315|
   316|  async getFullProfile(userId: string) {
   317|    const user = await this.prisma.user.findUnique({
   318|      where: { id: userId },
   319|      select: {
   320|        id: true,
   321|        name: true,
   322|        email: true,
   323|        isAdmin: true,
   324|        isEmailVerified: true,
   325|        subscription: {
   326|          select: { plan: true, status: true, expiresAt: true },
   327|        },
   328|      },
   329|    });
   330|
   331|    if (!user) {
   332|      throw new NotFoundException('Usuário não encontrado');
   333|    }
   334|
   335|    const { subscription, ...rest } = user;
   336|    return {
   337|      ...rest,
   338|      plan: subscription?.status === 'active' ? subscription.plan : 'free',
   339|    };
   340|  }
   341|
   342|  async changeName(userId: string, name: string) {
   343|    await this.prisma.user.update({
   344|      where: { id: userId },
   345|      data: { name },
   346|    });
   347|    return { name };
   348|  }
   349|
   350|  async changePassword(userId: string, currentPassword: string, newPassword: string) {
   351|    const user = await this.prisma.user.findUnique({ where: { id: userId } });
   352|    if (!user) {
   353|      throw new NotFoundException('Usuário não encontrado');
   354|    }
   355|
   356|    const isMatch = await bcrypt.compare(currentPassword, user.password);
   357|    if (!isMatch) {
   358|      throw new BadRequestException('Senha atual incorreta');
   359|    }
   360|
   361|    if (newPassword.length < 8) {
   362|      throw new BadRequestException('A nova senha deve ter pelo menos 8 caracteres');
   363|    }
   364|
   365|    const hashedPassword = await bcrypt.hash(newPassword, 12);
   366|    await this.prisma.user.update({
   367|      where: { id: userId },
   368|      data: { password: hashedPassword, hashedRefreshToken: null },
   369|    });
   370|
   371|    this.auditService.log({ action: 'auth.password_change', actorId: userId, targetType: 'User', targetId: userId, severity: 'warn' });
   372|
   373|    return { message: 'Senha alterada com sucesso' };
   374|  }
   375|
   376|  async changeEmail(userId: string, newEmail: string, password: string) {
   377|    const user = await this.prisma.user.findUnique({ where: { id: userId } });
   378|    if (!user) {
   379|      throw new NotFoundException('Usuário não encontrado');
   380|    }
   381|
   382|    const isMatch = await bcrypt.compare(password, user.password);
   383|    if (!isMatch) {
   384|      throw new BadRequestException('Senha incorreta');
   385|    }
   386|
   387|    // Check if email is already in use
   388|    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
   389|    if (existing) {
   390|      throw new BadRequestException('Este e-mail já está em uso');
   391|    }
   392|
   393|    // Update email and mark as unverified, revoke all sessions
   394|    await this.prisma.user.update({
   395|      where: { id: userId },
   396|      data: { email: newEmail, isEmailVerified: false, hashedRefreshToken: null },
   397|    });
   398|
   399|    // Send verification email to the new address
   400|    const verifyToken = crypto.randomBytes(32).toString('hex');
   401|    const hashedVerifyToken = await bcrypt.hash(verifyToken, 10);
   402|    await this.prisma.verificationToken.create({
   403|      data: {
   404|        token: hashedVerifyToken,
   405|        type: 'EMAIL_VERIFY',
   406|        userId,
   407|        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
   408|      },
   409|    });
   410|
   411|    this.emailService
   412|      .sendVerificationEmail(newEmail, user.name || 'Usuário', verifyToken)
   413|      .catch(() => {
   414|        if (process.env.NODE_ENV !== 'production') {
   415|          console.error('Falha ao enviar verification email para novo endereço');
   416|        }
   417|      });
   418|
   419|    return { message: 'E-mail alterado. Verifique seu novo endereço para confirmar.', email: newEmail };
   420|  }
   421|
   422|  async deleteAccount(userId: string, password: string) {
   423|    const user = await this.prisma.user.findUnique({ where: { id: userId } });
   424|    if (!user) {
   425|      throw new NotFoundException('Usuário não encontrado');
   426|    }
   427|
   428|    const isMatch = await bcrypt.compare(password, user.password);
   429|    if (!isMatch) {
   430|      throw new BadRequestException('Senha incorreta');
   431|    }
   432|
   433|    await this.usersService.remove(userId);
   434|
   435|    return { message: 'Conta excluída com sucesso' };
   436|  }
   437|
   438|  async resendVerification(userId: string) {
   439|    const user = await this.prisma.user.findUnique({
   440|      where: { id: userId },
   441|    });
   442|
   443|    if (!user) {
   444|      throw new NotFoundException('Usuário não encontrado');
   445|    }
   446|
   447|    if (user.isEmailVerified) {
   448|      return { message: 'Email já verificado' };
   449|    }
   450|
   451|    // Delete any existing EMAIL_VERIFY tokens for this user
   452|    await this.prisma.verificationToken.deleteMany({
   453|      where: { userId: user.id, type: 'EMAIL_VERIFY' },
   454|    });
   455|
   456|    // Generate a new verification token
   457|    const verifyToken = crypto.randomBytes(32).toString('hex');
   458|    const hashedVerifyToken = await bcrypt.hash(verifyToken, 10);
   459|    await this.prisma.verificationToken.create({
   460|      data: {
   461|        token: hashedVerifyToken,
   462|        type: 'EMAIL_VERIFY',
   463|        userId: user.id,
   464|        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
   465|      },
   466|    });
   467|
   468|    // Fire-and-forget email
   469|    this.emailService
   470|      .sendVerificationEmail(user.email, user.name || 'Usuário', verifyToken)
   471|      .catch(() => {
   472|        if (process.env.NODE_ENV !== 'production') {
   473|          console.error('Falha ao enviar verification email');
   474|        }
   475|      });
   476|
   477|    return { message: 'Email de verificação reenviado com sucesso' };
   478|  }
   479|}
   480|