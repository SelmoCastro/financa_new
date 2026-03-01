import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CreditCardsService } from './credit-cards.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller({
  path: 'credit-cards',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) { }

  @Post()
  create(@Body() createCreditCardDto: CreateCreditCardDto, @Request() req) {
    return this.creditCardsService.create(createCreditCardDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.creditCardsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.creditCardsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCreditCardDto: UpdateCreditCardDto, @Request() req) {
    return this.creditCardsService.update(id, updateCreditCardDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.creditCardsService.remove(id, req.user.userId);
  }
}
