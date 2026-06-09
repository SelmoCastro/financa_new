/**
 * Service do domínio de envio de e-mails; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private resend: Resend | null = null;
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);
  private fromEmail = 'Finanza <noreply@finanzaai.tech>';
  private useResend = false;

  onModuleInit() {
    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Prioridade 1: Resend (API, mais confiável)
    if (resendApiKey && resendApiKey !== 'placeholder') {
      this.resend = new Resend(resendApiKey);
      this.fromEmail =
        process.env.EMAIL_FROM ||
        process.env.RESEND_FROM_EMAIL ||
        'Finanza <noreply@finanzaai.tech>';
      this.useResend = true;
      this.logger.log(
        `✅ Resend API configurada! Emails via Resend. Remetente: ${this.fromEmail}`,
      );
      return;
    }

    // Prioridade 2: SMTP (Hostinger, Gmail, etc.)
    if (smtpHost && smtpUser && smtpPass) {
      const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
      const secure = smtpPort === 465;

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      this.fromEmail = process.env.EMAIL_FROM || `Finanza <${smtpUser}>`;

      this.transporter
        .verify()
        .then(() => this.logger.log('✅ SMTP conectado com sucesso!'))
        .catch((err) =>
          this.logger.error(`❌ SMTP falhou na verificação: ${err.message}`),
        );
      return;
    }

    this.logger.warn(
      '⚠️  Nenhum serviço de email configurado (RESEND_API_KEY ou SMTP_*). Emails não serão enviados.',
    );
  }

  private getFrontendAppUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return frontendUrl.includes('localhost')
      ? frontendUrl
      : 'https://finanzaai.tech';
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    const frontendAppUrl = this.getFrontendAppUrl();
    const verificationUrl = `${frontendAppUrl}/verify-email?token=${token}`;
    const subject = 'Confirme seu e-mail no Finanza';
    const html = `
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
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const frontendAppUrl = this.getFrontendAppUrl();
    const resetUrl = `${frontendAppUrl}/reset-password?token=${token}`;
    const subject = 'Redefinição de Senha — Finanza';
    const html = `
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
    `;

    await this.sendEmail(email, subject, html);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local[0]}${'*'.repeat(Math.max(0, local.length - 1))}@${domain}`;
  }

  private async sendEmail(to: string, subject: string, html: string) {
    // Prioridade 1: Resend
    if (this.useResend && this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        if (error) {
          this.logger.error(`Resend error: ${error.message}`);
          // Se Resend falhar, tenta SMTP como fallback
          if (this.transporter) {
            this.logger.warn('Tentando fallback SMTP...');
            return this.sendViaSmtp(to, subject, html);
          }
          // Se nao tem SMTP configurado, aviso claro
          if (
            error.message?.includes('verify a domain') ||
            error.message?.includes('testing emails')
          ) {
            this.logger.error(
              '💡 DICA: Configure um domínio verificado no Resend (resend.com/domains) OU adicione credenciais SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) no .env para envio de emails.',
            );
          }
          return;
        }
        this.logger.log(`✅ Email sent to ${this.maskEmail(to)} via Resend`);
        return;
      } catch (error) {
        this.logger.error(`Resend exception: ${error.message}`);
        if (this.transporter) {
          this.logger.warn('Tentando fallback SMTP...');
          return this.sendViaSmtp(to, subject, html);
        }
        return;
      }
    }

    // Prioridade 2: SMTP
    if (this.transporter) {
      return this.sendViaSmtp(to, subject, html);
    }

    this.logger.warn('Nenhum serviço de email configurado. Email não enviado.');
  }

  private async sendViaSmtp(to: string, subject: string, html: string) {
    try {
      await this.transporter!.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      this.logger.log(`✅ Email sent to ${this.maskEmail(to)} via SMTP`);
    } catch (error) {
      this.logger.error(
        `SMTP error sending to ${this.maskEmail(to)}: ${error.message}`,
      );
    }
  }

  /**
   * Verifica se o serviço de email está configurado
   */
  isConfigured(): boolean {
    return this.resend !== null || this.transporter !== null;
  }
}
