import nodemailer from 'nodemailer';

export interface SendVerificationOptions {
  email: string;
  code: string;
  assetSymbol?: string;
}

export interface SendAlertOptions {
  email: string;
  symbol: string;
  assetName?: string;
  price?: number;
  changePercent?: number;
  condition?: string;
  threshold?: number;
  takeaway?: string;
}

export class ServerEmailService {
  /**
   * Determine active email provider without leaking credentials
   */
  static getProviderStatus(): {
    configured: boolean;
    provider: 'resend' | 'smtp' | 'simulation';
    sender: string;
  } {
    if (process.env.RESEND_API_KEY) {
      return {
        configured: true,
        provider: 'resend',
        sender: process.env.SENDER_EMAIL || 'Sentrune Alerts <onboarding@resend.dev>'
      };
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return {
        configured: true,
        provider: 'smtp',
        sender: process.env.SENDER_EMAIL || process.env.SMTP_USER
      };
    }

    return {
      configured: false,
      provider: 'simulation',
      sender: 'Sentrune Terminal <simulation@sentrune.internal>'
    };
  }

  /**
   * Dispatch 6-digit confirmation email
   */
  static async sendVerificationCode(options: SendVerificationOptions): Promise<{
    success: boolean;
    provider: string;
    message: string;
    deliveryId?: string;
  }> {
    const { email, code, assetSymbol } = options;
    const subject = `[Sentrune] Your 6-Digit Email Verification PIN: ${code}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050b14; color: #f1f5f9; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background: #081322; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
          .header { background: #060e1a; padding: 24px; border-bottom: 1px solid #1e293b; text-align: center; }
          .brand { color: #06b6d4; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .subtitle { color: #94a3b8; font-size: 13px; margin-top: 4px; }
          .body { padding: 32px 24px; text-align: center; }
          .pin-box { background: #0c1a2d; border: 2px dashed #0891b2; border-radius: 12px; padding: 18px; margin: 24px 0; }
          .pin { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; margin: 0; }
          .hint { color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 16px 0; }
          .footer { background: #050b14; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">Sentrune Terminal</div>
            <div class="subtitle">Institutional Market Intelligence & Price Alerts</div>
          </div>
          <div class="body">
            <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Confirm Your Email Ownership</h2>
            <p class="hint">
              You requested automated price alerts${assetSymbol ? ` for <strong>${assetSymbol}</strong>` : ''}. 
              Enter the 6-digit confirmation PIN below to activate your subscription:
            </p>
            <div class="pin-box">
              <div class="pin">${code}</div>
            </div>
            <p class="hint">
              This single-use code expires in 10 minutes. If you did not make this request, you can safely disregard this email.
            </p>
          </div>
          <div class="footer">
            Sentrune Workstation • Zero-Cost High-Frequency Market Feeds
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.dispatchEmail({
      to: email,
      subject,
      html: htmlContent
    });
  }

  /**
   * Dispatch Market Alert / Newsletter
   */
  static async sendMarketAlert(options: SendAlertOptions): Promise<{
    success: boolean;
    provider: string;
    message: string;
    deliveryId?: string;
  }> {
    const { email, symbol, assetName, price, changePercent, condition, takeaway } = options;
    const isUp = (changePercent || 0) >= 0;
    const formattedPrice = price ? `$${price.toLocaleString()}` : '';
    const formattedChange = changePercent ? `${isUp ? '+' : ''}${changePercent.toFixed(2)}%` : '';

    const subject = `[Alert] ${symbol} Market Trigger Met: ${formattedChange} (${formattedPrice})`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #050b14; color: #f1f5f9; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background: #081322; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
          .header { background: #060e1a; padding: 20px 24px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
          .brand { color: #06b6d4; font-size: 18px; font-weight: 800; }
          .badge { background: ${isUp ? '#064e3b' : '#881337'}; color: ${isUp ? '#34d399' : '#fb7185'}; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; font-family: monospace; }
          .body { padding: 24px; }
          .price-row { margin: 16px 0; }
          .price { font-size: 28px; font-weight: 800; color: #ffffff; font-family: monospace; }
          .change { font-size: 16px; font-weight: 700; color: ${isUp ? '#34d399' : '#fb7185'}; font-family: monospace; margin-left: 8px; }
          .takeaway-card { background: #050c17; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 6px; margin: 18px 0; }
          .takeaway-title { color: #f59e0b; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
          .takeaway-text { color: #e2e8f0; font-size: 13px; line-height: 1.5; margin: 0; }
          .footer { background: #050b14; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">Sentrune Market Alert</div>
            <div class="badge">${symbol} TRIGGER</div>
          </div>
          <div class="body">
            <div style="font-size: 13px; color: #94a3b8;">${assetName || symbol} Automated Trigger</div>
            <div class="price-row">
              <span class="price">${formattedPrice}</span>
              <span class="change">${formattedChange}</span>
            </div>
            <div class="takeaway-card">
              <div class="takeaway-title">Market Takeaway</div>
              <p class="takeaway-text">${takeaway || 'Institutional orderflow absorption exceeded standard volatility corridors. Momentum favorable.'}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
              Trigger criteria: <strong>${condition || 'Price shift threshold'}</strong>. 
              This automated notification was dispatched from your Sentrune Workstation.
            </p>
          </div>
          <div class="footer">
            Sentrune Workstation • Zero-Cost Automated Alerts Service
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.dispatchEmail({
      to: email,
      subject,
      html: htmlContent
    });
  }

  /**
   * Internal dispatcher: Resend REST API -> SMTP -> Simulation
   */
  private static async dispatchEmail(payload: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{
    success: boolean;
    provider: string;
    message: string;
    deliveryId?: string;
  }> {
    const { to, subject, html } = payload;
    const resendKey = process.env.RESEND_API_KEY;

    // 1. Try Resend REST API (3,000 free emails/month, 0 extra SDK needed)
    if (resendKey) {
      try {
        const from = process.env.SENDER_EMAIL || 'Sentrune Alerts <onboarding@resend.dev>';
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from,
            to: [to],
            subject,
            html
          })
        });

        const data: any = await resp.json();
        if (resp.ok && data.id) {
          return {
            success: true,
            provider: 'resend',
            message: `Real email successfully delivered via Resend to ${to}!`,
            deliveryId: data.id
          };
        } else {
          console.error('[Resend Error]', data);
          // Return clear diagnostic without crashing
          return {
            success: false,
            provider: 'resend',
            message: `Resend API returned: ${data.message || 'Check RESEND_API_KEY and verified domain'}`
          };
        }
      } catch (err: any) {
        console.error('[Resend Network Error]', err);
      }
    }

    // 2. Try SMTP (e.g. Gmail App Password or custom SMTP)
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const info = await transporter.sendMail({
          from: process.env.SENDER_EMAIL || `"Sentrune Terminal" <${smtpUser}>`,
          to,
          subject,
          html
        });

        return {
          success: true,
          provider: 'smtp',
          message: `Real email successfully delivered via SMTP to ${to}!`,
          deliveryId: info.messageId
        };
      } catch (err: any) {
        console.error('[SMTP Error]', err);
        return {
          success: false,
          provider: 'smtp',
          message: `SMTP delivery failed: ${err.message || 'Check credentials'}`
        };
      }
    }

    // 3. Fallback: Instant Zero-Cost Interactive Simulation
    // Provides immediate functional response without blocking or throwing errors
    return {
      success: true,
      provider: 'simulation',
      message: `[Zero-Cost Ready] Code/Alert prepared for ${to}. To receive on your real physical inbox, add RESEND_API_KEY (Free at resend.com) or SMTP credentials to your Settings panel.`
    };
  }
}
