import { Resend } from "resend";

/**
 * Versturen van e-mail.
 *
 * Zonder RESEND_API_KEY wordt er niets verstuurd maar alleen gelogd. Dat is
 * bewust: zo kun je de hele keten lokaal doorlopen zonder account of DNS, en
 * zie je in de terminal precies wat er de deur uit zou gaan.
 */
export type Mail = {
  to: string[];
  subject: string;
  html: string;
};

export function mailIsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(mail: Mail): Promise<{ sent: number; error?: string }> {
  const recipients = [...new Set(mail.to.filter(Boolean))];
  if (recipients.length === 0) return { sent: 0 };

  if (!mailIsConfigured()) {
    console.info(
      `[mail] niet verstuurd (RESEND_API_KEY of MAIL_FROM ontbreekt)\n` +
        `       aan: ${recipients.join(", ")}\n` +
        `       onderwerp: ${mail.subject}`,
    );
    return { sent: 0, error: "Mail is niet geconfigureerd" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM!,
    to: recipients,
    subject: mail.subject,
    html: mail.html,
  });

  if (error) {
    console.error("[mail] versturen mislukt:", error.message);
    return { sent: 0, error: error.message };
  }
  return { sent: recipients.length };
}
