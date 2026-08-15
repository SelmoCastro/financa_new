/**
 * Service do domínio de usuários; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import * as crypto from 'crypto';

const excludePassword = {
  id: true,
  name: true,
  email: true,
  isAdmin: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /** Compute deterministic SHA-256 hash of lowercase email for lookups */
  private hashEmail(email: string): string {
    return crypto
      .createHash('sha256')
      .update(email.toLowerCase().trim())
      .digest('hex');
  }

  /** Encrypt PII fields (email, name) before persisting */
  private encryptUserData(data: { email: string; name?: string | null }) {
    return {
      email: this.encryption.encrypt(data.email),
      emailHash: this.hashEmail(data.email),
      name: data.name != null ? this.encryption.encrypt(data.name) : null,
    };
  }

  /** Decrypt PII fields after reading. Handles plaintext fallback (migration).
   *  Preserves all other properties (id, password, etc.) */
  private decryptUserData<T extends { email: string; name?: string | null }>(
    user: T,
  ): T {
    return {
      ...user,
      email: this.encryption.decrypt(user.email) || user.email,
      name:
        user.name != null
          ? this.encryption.decrypt(user.name) || user.name
          : null,
    };
  }

  /** Versao de create() que permite setar isEmailVerified internamente (auth.service) */
  async createWithEmailVerified(data: {
    email: string;
    name: string;
    password: string;
    isEmailVerified: boolean;
    termsAccepted?: boolean;
    termsAcceptedAt?: Date;
  }) {
    try {
      const encrypted = this.encryptUserData(data);
      return await this.prisma.user
        .create({
          data: {
            ...data,
            email: encrypted.email!,
            emailHash: encrypted.emailHash,
            name: encrypted.name!,
          },
          select: excludePassword,
        })
        .then((user) => this.decryptUserData(user));
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ForbiddenException(
          'Não foi possível criar a conta. Verifique os dados e tente novamente.',
        );
      }
      throw error;
    }
  }

  async findAll(adminId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { isAdmin: true },
    });
    if (!admin?.isAdmin) {
      throw new ForbiddenException('Only administrators can list all users');
    }
    return this.findAllInternal();
  }

  async findAllInternal() {
    return this.prisma.user
      .findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
      .then((users) => users.map((u) => this.decryptUserData(u)));
  }

  async findOne(id: string, requestingUserId?: string) {
    if (requestingUserId !== undefined && requestingUserId !== id) {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.prisma.user
      .findUnique({
        where: { id },
        select: excludePassword,
      })
      .then((user) => (user ? this.decryptUserData(user) : null));
  }

  // WARNING: Returns full user including password hash. Only use for authentication.
  // All other uses should go through findOne() which uses excludePassword.
  // Uses emailHash for lookup — encrypts the lookup email to hash for matching.
  findOneByEmail(email: string) {
    const emailHash = this.hashEmail(email);
    return this.prisma.user
      .findFirst({
        where: { emailHash },
      })
      .then((user) => (user ? this.decryptUserData(user) : null));
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUserId?: string,
  ) {
    // VULN-10: Verify requesting user matches the target user
    if (requestingUserId !== undefined && requestingUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Encrypt PII fields if they're being updated
    // Note: email changes go through auth/change-email flow, not via UpdateUserDto
    const data: Record<string, unknown> = { ...updateUserDto };
    if (updateUserDto.name !== undefined) {
      data.name =
        updateUserDto.name != null
          ? this.encryption.encrypt(updateUserDto.name)
          : null;
    }

    return this.prisma.user
      .updateMany({
        where: { id },
        data,
      })
      .then(() =>
        this.prisma.user.findUnique({
          where: { id },
          select: excludePassword,
        }),
      )
      .then((user) => (user ? this.decryptUserData(user) : null));
  }

  async remove(id: string) {
    // V26: Use hard delete for the user. Linked data will be handled by DB-level Cascade
    // defined in schema.prisma. We first remove tokens and sensitive logs manually
    // to be safe before the big bang.
    return this.prisma.$transaction(async (tx) => {
      // Deleting the user row will cascade to all other tables due to onDelete: Cascade
      return tx.user.delete({ where: { id } });
    });
  }
}
