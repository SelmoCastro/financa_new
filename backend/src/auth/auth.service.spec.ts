import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { RefreshTokenService } from './refresh-token.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { createWithEmailVerified: jest.Mock };
  let prisma: { verificationToken: { create: jest.Mock } };
  let emailService: { sendVerificationEmail: jest.Mock };
  let subscriptionService: { upgrade: jest.Mock };

  beforeEach(async () => {
    usersService = {
      createWithEmailVerified: jest.fn(),
    };

    prisma = {
      verificationToken: {
        create: jest.fn(),
      },
    };

    emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    subscriptionService = {
      upgrade: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: RefreshTokenService, useValue: {} },
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('creates new users on the free plan instead of granting premium trial', async () => {
      const createdUser = {
        id: 'user-1',
        email: 'novo@finanzaai.tech',
        name: 'Novo Usuário',
        isEmailVerified: false,
        isAdmin: false,
      };

      usersService.createWithEmailVerified.mockResolvedValue(createdUser);
      subscriptionService.upgrade.mockResolvedValue({
        userId: createdUser.id,
        plan: 'free',
        status: 'active',
      });
      prisma.verificationToken.create.mockResolvedValue({ id: 'vt-1' });
      jest.spyOn(service, 'login').mockResolvedValue({
        access_token: 'access-token',
        refreshToken: 'refresh-token',
        user: createdUser,
      });

      const result = await service.register({
        email: createdUser.email,
        password: 'Senha1234',
        name: createdUser.name,
        termsAccepted: true,
      });

      expect(subscriptionService.upgrade).toHaveBeenCalledWith(
        createdUser.id,
        'free',
      );
      expect(subscriptionService.upgrade).not.toHaveBeenCalledWith(
        createdUser.id,
        'premium',
        expect.any(Date),
      );
      expect(result.userId).toBe(createdUser.id);
      expect(prisma.verificationToken.create).toHaveBeenCalledTimes(1);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });
  });
});
