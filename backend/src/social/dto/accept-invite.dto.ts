/**
 * DTO usado para validar e tipar o payload de accept invite dentro do fluxo de recursos sociais.
 */
import { IsUUID } from 'class-validator';

export class AcceptInviteDto {
  @IsUUID()
  accountId: string;

  @IsUUID()
  categoryId: string;
}
