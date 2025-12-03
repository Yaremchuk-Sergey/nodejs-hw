import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } =
  process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(SMTP_PORT, 10) || 587,
  secure: parseInt(SMTP_PORT, 10) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

export const sendEmail = async (options) => {
  return await transporter.sendMail({
    from: options.from || SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
};
