import crypto from 'crypto';
import net from 'node:net';
import tls from 'node:tls';

export type EmailTemplate = 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'PASSWORD_CHANGED' | 'EMAIL_CHANGED';

export function createAuthToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashAuthToken(token) };
}

export function hashAuthToken(token: string) {
  return crypto.createHash('sha256').update(`${token}:${process.env.AUTH_SECRET || 'ratestack-auth'}`).digest('hex');
}

function content(template: EmailTemplate, actionUrl?: string) {
  const copy = {
    VERIFY_EMAIL: ['Verify your email address', 'Verify Email'],
    RESET_PASSWORD: ['Reset your RateStack password', 'Reset Password'],
    PASSWORD_CHANGED: ['Your RateStack password was changed', 'Review Account'],
    EMAIL_CHANGED: ['Your RateStack email address was changed', 'Review Account'],
  }[template];
  return {
    subject: copy[0],
    html: `<div style="font-family:Arial;max-width:560px;margin:auto"><h1 style="color:#b7791f">RateStack</h1><h2>${copy[0]}</h2><p>This secure link expires shortly and can be used only once.</p>${actionUrl ? `<p><a href="${actionUrl}" style="background:#d97706;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px">${copy[1]}</a></p>` : ''}<p>If you did not request this, you can ignore this email.</p></div>`,
  };
}

async function command(socket: net.Socket, value: string, expected: number[]) {
  socket.write(`${value}\r\n`);
  const response = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SMTP timeout')), 15_000);
    socket.once('data', (data) => { clearTimeout(timer); resolve(data.toString()); });
  });
  if (!expected.some((code) => response.startsWith(String(code)))) throw new Error('SMTP delivery failed');
}

export async function sendTransactionalEmail(to: string, template: EmailTemplate, actionUrl?: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  if (!host || !user || !password || !fromEmail) {
    if (process.env.NODE_ENV !== 'production') console.info(`[EMAIL PREVIEW] ${template} to ${to}: ${actionUrl || ''}`);
    return process.env.NODE_ENV !== 'production';
  }
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== 'false';
  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const client = secure ? tls.connect({ host, port, servername: host }, () => resolve(client)) : net.connect({ host, port }, () => resolve(client));
    client.once('error', reject);
  });
  try {
    await new Promise<void>((resolve, reject) => socket.once('data', (d) => d.toString().startsWith('220') ? resolve() : reject(new Error('SMTP unavailable'))));
    await command(socket, `EHLO ${host}`, [250]);
    await command(socket, 'AUTH LOGIN', [334]);
    await command(socket, Buffer.from(user).toString('base64'), [334]);
    await command(socket, Buffer.from(password).toString('base64'), [235]);
    await command(socket, `MAIL FROM:<${fromEmail}>`, [250]);
    await command(socket, `RCPT TO:<${to}>`, [250, 251]);
    await command(socket, 'DATA', [354]);
    const body = content(template, actionUrl);
    const fromName = process.env.SMTP_FROM_NAME || 'RateStack';
    await command(socket, `From: ${fromName} <${fromEmail}>\r\nTo: <${to}>\r\nSubject: ${body.subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${body.html}\r\n.`, [250]);
    socket.write('QUIT\r\n');
    return true;
  } finally {
    socket.end();
  }
}
