import nodemailer from "nodemailer";

function createTransport() {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendTempPasswordEmail(to: string, name: string, tempPassword: string) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM ?? "B300 Dashboard <noreply@b300.com>";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#1e293b;margin-bottom:8px">Redefinição de senha</h2>
      <p style="color:#475569;margin-bottom:24px">Olá, ${name}. Sua senha temporária é:</p>
      <div style="background:#fff;border:2px dashed #3b82f6;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
        <span style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#1e40af">${tempPassword}</span>
      </div>
      <p style="color:#64748b;font-size:14px">Use essa senha para entrar. Você será solicitado a criar uma nova senha imediatamente após o login.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Se você não solicitou a redefinição, ignore este e-mail.</p>
    </div>
  `;

  if (!transport) {
    console.log("\n=== EMAIL DE RECUPERAÇÃO (modo dev — sem SMTP configurado) ===");
    console.log(`Para: ${to}`);
    console.log(`Senha temporária: ${tempPassword}`);
    console.log("==============================================================\n");
    return;
  }

  await transport.sendMail({ from, to, subject: "Sua senha temporária — B300 Dashboard", html });
}

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(4)}-${part(4)}`;
}
