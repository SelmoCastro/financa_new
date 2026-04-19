import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequireVerifiedEmail } from '../auth/require-verified-email.decorator';

@Controller({
  path: 'categories',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @RequireVerifiedEmail()
  create(@Body() createCategoryDto: CreateCategoryDto, @Request() req) {
    return this.categoriesService.create(createCategoryDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    console.log(`[CATEGORIES] GET /categories - userId: ${req.user.userId}, isEmailVerified: ${req.user.isEmailVerified}`);
    const result = this.categoriesService.findAll(req.user.userId);
    result.then((cats) => {
      const income = cats.filter(c => c.type === 'INCOME').length;
      const expense = cats.filter(c => c.type === 'EXPENSE').length;
      const transfer = cats.filter(c => c.type === 'TRANSFER').length;
      console.log(`[CATEGORIES] RETURN - userId: ${req.user.userId}, total: ${cats.length}, INCOME: ${income}, EXPENSE: ${expense}, TRANSFER: ${transfer}`);
    }).catch((err) => {
      console.error(`[CATEGORIES] ERROR - userId: ${req.user.userId}`, err.message);
    });
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.categoriesService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @RequireVerifiedEmail()
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req,
  ) {
    return this.categoriesService.update(
      id,
      updateCategoryDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @RequireVerifiedEmail()
  remove(@Param('id') id: string, @Request() req) {
    return this.categoriesService.remove(id, req.user.userId);
  }
}