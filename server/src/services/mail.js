import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

export const mailEnabled = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f4f1fb;font-family:Nunito,Segoe UI,Arial,sans-serif;color:#1f2340">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:28px;padding:36px;box-shadow:0 18px 40px -20px rgba(70,60,130,.35)">
    <div style="font-size:22px;font-weight:800;color:#5b4bdb;margin-bottom:8px">${env.appName}</div>
    <h1 style="font-size:24px;margin:0 0 12px">${title}</h1>
    ${body}
    <p style="margin-top:32px;font-size:12px;color:#8a8fa8">You are receiving this because you have an account on ${env.appName}. If this wasn't you, you can safely ignore this email.</p>
  </div></body></html>`;
}

/**
 * Send an email. When SMTP is not configured the message is logged to the console instead so
 * development still works; callers can check `mailEnabled()` to tell the user.
 */
export async function sendMail({ to, subject, html, text }) {
  if (!mailEnabled()) {
    console.log(`[mail] (SMTP not configured) To: ${to} | Subject: ${subject}\n${text || html}`);
    return { delivered: false };
  }
  await getTransporter().sendMail({ from: env.smtp.from, to, subject, html, text });
  return { delivered: true };
}

export function passwordResetEmail({ to, name, resetUrl }) {
  return sendMail({
    to,
    subject: `Reset your ${env.appName} password`,
    text: `Hi ${name},\n\nReset your password using this link (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: layout('Reset your password', `
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one. The link is valid for <strong>30 minutes</strong>.</p>
      <p style="margin:28px 0"><a href="${resetUrl}" style="background:#5b4bdb;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;display:inline-block">Reset password</a></p>
      <p style="font-size:13px;color:#8a8fa8">Or paste this link into your browser:<br><a href="${resetUrl}" style="color:#5b4bdb">${resetUrl}</a></p>`),
  });
}

export function welcomeEmail({ to, name }) {
  return sendMail({
    to,
    subject: `Welcome to ${env.appName}, ${name.split(' ')[0]}!`,
    text: `Hi ${name}, welcome to ${env.appName}. Open the app, press Start Session at the gym and let the coach guide you.`,
    html: layout(`Welcome, ${name.split(' ')[0]}! 👋`, `
      <p>Your account is ready. Here is how to get the most out of ${env.appName}:</p>
      <ol>
        <li>Set your weekly schedule in <strong>Schedule</strong>.</li>
        <li>At the gym, press <strong>Start Session</strong> and follow the guided exercises and timers.</li>
        <li>Log water, meals and weight so the AI coach can personalise its advice.</li>
      </ol>
      <p style="margin:28px 0"><a href="${env.clientUrl}" style="background:#5b4bdb;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;display:inline-block">Open ${env.appName}</a></p>`),
  });
}
