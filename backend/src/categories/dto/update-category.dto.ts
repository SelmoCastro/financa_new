/**
 * DTO usado para validar e tipar o payload de update category dentro do fluxo de categorias.
 */
import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
