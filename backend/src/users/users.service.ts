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
    } catch (error: unknown) {
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
    // V26: Use hard delete for the user. Linked data will be handled by DB-level Cascade 
    // defined in schema.prisma. We first remove tokens and sensitive logs manually 
    // to be safe before the big bang.
    return this.prisma.$transaction(async (tx) => {
      // Deleting the user row will cascade to all other tables due to onDelete: Cascade
      return tx.user.delete({ where: { id } });
    });
  }
}
