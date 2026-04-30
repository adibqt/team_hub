import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 8080,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",

  // ── SMTP / Nodemailer ──────────────────────────────────────────
  // Leave SMTP_HOST blank to disable outbound mail (invite links will
  // still be created and copyable; the mailer just no-ops).
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE:
    typeof process.env.SMTP_SECURE === "string"
      ? process.env.SMTP_SECURE.toLowerCase() === "true"
      : Number(process.env.SMTP_PORT) === 465,
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "",
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || "Team Hub",
};
