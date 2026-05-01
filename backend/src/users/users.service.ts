import { Injectable, ForbiddenException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

  /** Versao de create() que permite setar isEmailVerified internamente (auth.service) */
  async createWithEmailVerified(data: { email: string; name: string; password: string; isEmailVerified: boolean; termsAccepted?: boolean; termsAcceptedAt?: Date }) {
    try {
      return await this.prisma.user.create({
        data,
        select: excludePassword,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ForbiddenException(
          'Este e-mail já está cadastrado em nossa base.',
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
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  async findOne(id: string, requestingUserId?: string) {
    if (requestingUserId !== undefined && requestingUserId !== id) {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.prisma.user.findUnique({
      where: { id },
      select: excludePassword,
    });
  }

  // WARNING: Returns full user including password hash. Only use for authentication.
  // All other uses should go through findOne() which uses excludePassword.
  findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestingUserId?: string) {
    // VULN-10: Verify requesting user matches the target user
    if (requestingUserId !== undefined && requestingUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.user.updateMany({
      where: { id },
      data: updateUserDto,
    }).then(() =>
      this.prisma.user.findUnique({
        where: { id },
        select: excludePassword,
      })
    );
  }

  async remove(id: string) {
    // Soft delete all dependent records and hard delete non-soft-delete ones
    return this.prisma.$transaction([
      this.prisma.verificationToken.deleteMany({ where: { userId: id } }),
      this.prisma.feedback.deleteMany({ where: { userId: id } }),
      this.prisma.importedFitId.deleteMany({ where: { userId: id } }),
      this.prisma.transactionInvite.deleteMany({ where: { senderId: id } }),
      this.prisma.transactionInvite.deleteMany({ where: { recipientId: id } }),
      this.prisma.notification.deleteMany({ where: { userId: id } }),
      this.prisma.aiRequestLog.deleteMany({ where: { userId: id } }),
      this.prisma.subscription.deleteMany({ where: { userId: id } }),
      this.prisma.auditLog.deleteMany({ where: { userId: id } }),
      this.prisma.transaction.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: new Date() } }),
      this.prisma.category.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: new Date() } }),
      this.prisma.creditCard.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: new Date() } }),
      this.prisma.account.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: new Date() } }),
      this.prisma.budget.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: new Date() } }),
      this.prisma.goal.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: new Date() } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
  }
}
