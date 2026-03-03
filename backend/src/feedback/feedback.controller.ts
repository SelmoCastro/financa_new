import { Controller, Post, Get, Body, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) { }

    @Post()
    async submitFeedback(@Request() req, @Body() body: { content: string, platform: string }) {
        return this.feedbackService.submitFeedback(req.user.userId, body.content, body.platform);
    }

    @Get()
    async getAllFeedbacks(@Request() req) {
        // Basic verification without making an extra DB call here. 
        // Usually we would fetch the user or rely on the JWT token payload containing 'isAdmin'.
        // For now we trust the service to check.
        return this.feedbackService.findAllFeedbacks(req.user.userId);
    }
}
