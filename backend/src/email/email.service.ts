import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private resend: Resend;
    private readonly logger = new Logger(EmailService.name);
    private fromEmail = 'Finanza <onboarding@resend.dev>'; // Using resend.dev for testing, user can change later

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
    }

    async sendVerificationEmail(email: string, name: string, token: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const frontendAppUrl = frontendUrl.includes('localhost') ? frontendUrl : 'https://financa-new.vercel.app';
        const verificationUrl = `${frontendAppUrl}/verify-email?token=${token}`;

        try {
            await this.resend.emails.send({
                from: this.fromEmail,
                to: email, // If using resend.dev, the "to" email MUST be the verified identity in Resend unless the domain is fully verified
                subject: 'Confirme seu e-mail no Finanza',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Olá, ${name || 'Usuário'}!</h2>
            <p>Falta pouco para você começar a controlar suas finanças com o Finanza.</p>
            <p>Clique no botão abaixo para confirmar seu e-mail e ativar sua conta:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirmar E-mail</a>
            </div>
            <p style="font-size: 14px; color: #666;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="font-size: 12px; color: #666; word-break: break-all;">${verificationUrl}</p>
          </div>
        `,
            });
            this.logger.log(`Verification email dispatched to ${email}`);
        } catch (error) {
            this.logger.error(`Error sending verification email to ${email}`, error);
        }
    }

    async sendPasswordResetEmail(email: string, name: string, token: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const frontendAppUrl = frontendUrl.includes('localhost') ? frontendUrl : 'https://financa-new.vercel.app';
        const resetUrl = `${frontendAppUrl}/reset-password?token=${token}`;

        try {
            await this.resend.emails.send({
                from: this.fromEmail,
                to: email,
                subject: 'Redefinição de Senha - Finanza',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Recuperação de Senha</h2>
            <p>Olá, ${name || 'Usuário'}, recebemos um pedido para redefinir a senha da sua conta no Finanza.</p>
            <p>Se foi você, clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Redefinir Senha</a>
            </div>
            <p style="font-size: 14px; color: #666;">Se você não solicitou essa mudança, pode ignorar este e-mail. O link expira em 1 hora.</p>
          </div>
        `,
            });
            this.logger.log(`Password reset email dispatched to ${email}`);
        } catch (error) {
            this.logger.error(`Error sending password reset email to ${email}`, error);
        }
    }
}
