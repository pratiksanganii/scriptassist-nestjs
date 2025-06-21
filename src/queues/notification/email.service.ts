// src/modules/notification/email.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendStatusChangeEmail(email: string, taskTitle: string, status: string) {
    // Call Brevo API or mock
    this.logger.log(`Sending status update to ${email} for task "${taskTitle}" -> ${status}`);
    // TODO: Implement real API call here
  }
}
