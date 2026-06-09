/**
 * Controller HTTP do domínio de feedback dos usuários; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RequestWithUser } from '../common/types/request-with-user';

@Controller({
  path: 'feedback',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(
    @Request() req: RequestWithUser,
    @Body() body: CreateFeedbackDto,
  ) {
    return this.feedbackService.submitFeedback(
      req.user.userId,
      body.content,
      body.platform,
    );
  }

  @Get()
  @UseGuards(AdminGuard)
  async getAllFeedbacks(@Request() req: RequestWithUser) {
    return this.feedbackService.findAllFeedbacks();
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteFeedback(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.feedbackService.deleteFeedback(id, req.user.userId);
  }
}
