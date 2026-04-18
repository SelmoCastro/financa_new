import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAccountDto } from './create-account.dto';

export class UpdateAccountDto extends OmitType(PartialType(CreateAccountDto), ['balance']) {}
