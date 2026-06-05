import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Omit 'password' — password changes MUST go through a dedicated endpoint with old-password verification.
// Omit 'email' — email changes require re-verification and should go through a separate flow.
export class UpdateUserDto extends OmitType(PartialType(CreateUserDto), [
  'password',
  'email',
]) {}
