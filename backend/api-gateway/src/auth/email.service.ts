import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        // For development, use Ethereal (fake SMTP)
        // For production, configure real SMTP
        this.initializeTransporter();
    }

    private async initializeTransporter() {
        const smtpHost = this.configService.get<string>('SMTP_HOST');

        if (smtpHost) {
            // Use configured SMTP
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: this.configService.get<number>('SMTP_PORT') || 587,
                secure: this.configService.get<boolean>('SMTP_SECURE') || false,
                auth: {
                    user: this.configService.get<string>('SMTP_USER'),
                    pass: this.configService.get<string>('SMTP_PASS'),
                },
            });
        } else {
            // Use Ethereal for development (console logging)
            const testAccount = await nodemailer.createTestAccount();
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log('📧 Using Ethereal email for development');
            console.log(`   User: ${testAccount.user}`);
        }
    }

    async sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

        const mailOptions = {
            from: '"EloInsight" <noreply@eloinsight.dev>',
            to: email,
            subject: 'Verify your EloInsight account',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>♟️ EloInsight</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${username}!</h2>
              <p>Thanks for signing up for EloInsight. Please verify your email address to get started.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
              </p>
              <p>Or copy this link into your browser:</p>
              <p style="word-break: break-all; color: #1976d2;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>If you didn't create an account, you can safely ignore this email.</p>
              <p>© 2026 EloInsight - Chess Analysis Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `
        Welcome to EloInsight, ${username}!
        
        Please verify your email by clicking this link:
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create an account, you can safely ignore this email.
      `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('📧 Verification email sent:', info.messageId);

            // For Ethereal, log the preview URL
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('📧 Preview URL:', previewUrl);
            }
        } catch (error) {
            console.error('Failed to send verification email:', error);
            throw new Error('Failed to send verification email');
        }
    }
}
