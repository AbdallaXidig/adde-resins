import "server-only";
import nodemailer from "nodemailer";

/** Best effort: submissions are saved first, so a mail failure never loses a customer's request. */
export async function notifyStaff(subject: string, lines: Record<string, string | undefined | null>) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, NOTIFY_EMAIL } = process.env;
  if (!SMTP_HOST || !NOTIFY_EMAIL) return { sent: false as const };
  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    const text = Object.entries(lines)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await transport.sendMail({ from: SMTP_FROM, to: NOTIFY_EMAIL, subject, text });
    return { sent: true as const };
  } catch (error) {
    console.error("Staff notification failed", error);
    return { sent: false as const };
  }
}
