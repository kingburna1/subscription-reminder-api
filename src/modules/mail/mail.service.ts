import { Injectable, Logger } from '@nestjs/common';

export interface SendReminderEmailOptions {
  to: string;
  subscriptionName: string;
  amount: number;
  billingDate: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendReminderEmail(options: SendReminderEmailOptions): Promise<boolean> {
    const { to, subscriptionName, amount, billingDate } = options;

    // Log the notification (fail-safe delivery log)
    this.logger.log(
      `[EMAIL DISPATCH] To: ${to} | Subscription: "${subscriptionName}" | Amount: $${amount} | Due Date: ${billingDate}`,
    );

    // Simulated email delivery (always succeeds by default; throws if recipient is invalid)
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid recipient email address: "${to}"`);
    }

    return true;
  }
}
