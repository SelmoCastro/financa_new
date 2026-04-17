import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);
  private fromEmail = 'Finanza <onboarding@resend.dev>';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.warn(
        '⚠️  RESEND_API_KEY não configurada — emails não serão enviados. ' +
        'Obtenha em: https://resend.com/api-keys',
      );
      return;
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'Finanza <onboarding@resend.dev>';
    this.logger.log('✅ Resend API configurada com sucesso!');
  }

  private getFrontendAppUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return frontendUrl.includes('localhost')
      ? frontendUrl
      : 'https://finanzaai.tech';
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    if (!this.resend) {
      this.logger.warn('Resend não configurado. Pulando envio de verification email.');
      return;
    }

    const frontendAppUrl = this.getFrontendAppUrl();
    const verificationUrl = `${frontendAppUrl}/verify-email?token=${token}`;

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Confirme seu e-mail no Finanza',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #10b981;">
              <h1 style="color: #10b981; margin: 0;">Finanza AI</h1>
            </div>
            <h2>Olá, ${name || 'Usuário'}!</h2>
            <p>Falta pouco para você começar a controlar suas finanças com o Finanza.</p>
            <p>Clique no botão abaixo para confirmar seu e-mail e ativar sua conta:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Confirmar E-mail</a>
            </div>
            <p style="font-size: 14px; color: #666;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="font-size: 12px; color: #666; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 6px;">${verificationUrl}</p>
            <p style="font-size: 13px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Se você não criou uma conta no Finanza, pode ignorar este e-mail.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend error sending verification to ${email}: ${error.message}`);
      } else {
        this.logger.log(`✅ Verification email dispatched to ${email}`);
      }
    } catch (error) {
      this.logger.error(`Error sending verification email to ${email}`, error);
    }
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    if (!this.resend) {
      this.logger.warn('Resend não configurado. Pulando envio de reset email.');
      return;
    }

    const frontendAppUrl = this.getFrontendAppUrl();
    const resetUrl = `${frontendAppUrl}/reset-password?token=${token}`;

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Redefinição de Senha — Finanza',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #3b82f6;">
              <h1 style="color: #3b82f6; margin: 0;">Finanza AI</h1>
            </div>
            <h2>Recuperação de Senha</h2>
            <p>Olá, ${name || 'Usuário'}, recebemos um pedido para redefinir a senha da sua conta no Finanza.</p>
            <p>Se foi você, clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Redefinir Senha</a>
            </div>
            <p style="font-size: 12px; color: #666; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 6px;">${resetUrl}</p>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">Se você não solicitou essa mudança, <strong>ignore este e-mail</strong>. O link expira em <strong>1 hora</strong>.</p>
            <p style="font-size: 13px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Por segurança, sua senha atual não será alterada enquanto você não clicar no link acima.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend error sending reset to ${email}: ${error.message}`);
      } else {
        this.logger.log(`✅ Password reset email dispatched to ${email}`);
      }
    } catch (error) {
      this.logger.error(`Error sending password reset email to ${email}`, error);
    }
  }

  /**
   * Verifica se o Resend está configurado e funcionando
   */
  isConfigured(): boolean {
    return this.resend !== null;
  }
}