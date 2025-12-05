// src/config/email.ts
import nodemailer from "nodemailer";
import { ENV } from "./env";

export const mailTransporter = nodemailer.createTransport({
  host: ENV.EMAIL_HOST,
  port: ENV.EMAIL_PORT,
  secure: ENV.EMAIL_SECURE, // false for TLS upgrade (STARTTLS) on 587
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASS
  }
});

export async function sendEmail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  if (!ENV.EMAIL_USER || !ENV.EMAIL_PASS) {
    console.warn(
      "[email] EMAIL_USER or EMAIL_PASS not set. Skipping sendEmail."
    );
    return;
  }

  const info = await mailTransporter.sendMail({
    from: ENV.EMAIL_FROM || ENV.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  });

  console.log("[email] Sent email:", info.messageId);
}
