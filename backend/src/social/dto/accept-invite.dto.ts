import { IsUUID } from 'class-validator';

export class AcceptInviteDto {
  @IsUUID()
  accountId: string;

  @IsUUID()
  categoryId: string;
}
