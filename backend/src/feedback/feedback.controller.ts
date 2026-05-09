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

@Controller({
  path: 'feedback',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(
    @Request() req,
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
  async getAllFeedbacks(@Request() req) {
    return this.feedbackService.findAllFeedbacks(req.user.userId);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteFeedback(@Param('id') id: string, @Request() req) {
    return this.feedbackService.deleteFeedback(id, req.user.userId);
  }
}
