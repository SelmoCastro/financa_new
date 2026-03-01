import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller({
  path: 'accounts',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) { }

  @Post()
  create(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    return this.accountsService.create(createAccountDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.accountsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.accountsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto, @Request() req) {
    return this.accountsService.update(id, updateAccountDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.accountsService.remove(id, req.user.userId);
  }
}
