import nodemailer, { type Transporter } from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { env } from "../config/env";
import { AppError } from "./app-error";

let transporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(env.smtp.user && env.smtp.password && env.smtp.from);
}

function getTransporter(): Transporter {
  if (!isMailConfigured()) {
    throw new AppError("Email is not configured. Add SMTP_USER, SMTP_PASSWORD and MAIL_FROM in backend .env", 503);
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    });
  }
  return transporter;
}

export type SendMailInput = {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Mail.Attachment[];
};

export async function sendMail(input: SendMailInput) {
  return getTransporter().sendMail({
    from: env.smtp.from,
    to: input.to,
    cc: input.cc?.length ? input.cc : undefined,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments,
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
