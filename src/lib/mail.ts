/** Parol tiklash email — Resend API orqali */
export async function sendPasswordResetEmail(
  to: string,
  code: string,
  resetUrl: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const from = process.env.MAIL_FROM || "Tcall <noreply@tcall.vizara.uz>";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#4f46e5">Tcall — Parolni tiklash</h2>
      <p>Parolni tiklash kodi:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#1c1c1e">${code}</p>
      <p>Yoki havolaga bosing (15 daqiqa amal qiladi):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Tcall — Parolni tiklash kodi",
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
