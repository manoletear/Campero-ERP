/**
 * Poppins Email Service — SMTP via nodemailer
 *
 * Secrets (Cloudflare):
 *   SMTP_HOST        default: smtp.gmail.com
 *   SMTP_PORT        default: 587
 *   SMTP_USER        cuenta Gmail
 *   SMTP_PASSWORD    app password
 *   SMTP_FROM_EMAIL  From header
 */

import nodemailer from 'nodemailer';

export interface EmailAttachment {
  filename: string;
  content: string;     // base64
  contentType?: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail({ to, subject, html, attachments }: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  const host   = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port   = parseInt(process.env.SMTP_PORT || '587', 10);
  const user   = (process.env.SMTP_USER || '').trim();
  const pass   = (process.env.SMTP_PASSWORD || '').trim();
  const from   = (process.env.SMTP_FROM_EMAIL || '').trim() || `Poppins <${user}>`;

  if (!user || !pass) {
    console.warn('[Email] SMTP_USER o SMTP_PASSWORD no configurados');
    return { ok: false, error: 'SMTP no configurado' };
  }

  console.log(`[Email] Enviando a ${to} via ${host}:${port} (user=${user})`);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
      tls: {},
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const mail: nodemailer.SendMailOptions = { from, to, subject, html };
    if (attachments?.length) {
      mail.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
        contentType: a.contentType,
      }));
    }

    const info = await transporter.sendMail(mail);
    console.log('[Email] Enviado:', info.messageId);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Email] Error SMTP:', msg);
    return { ok: false, error: msg };
  }
}

// ── Templates ──

export function emailInvitacionHogar(opts: {
  nombreInvitante: string;
  etiqueta: string;
  activationUrl: string;
}): EmailPayload {
  const { nombreInvitante, etiqueta, activationUrl } = opts;
  return {
    to: '',
    subject: `¡${nombreInvitante} te invitó a Poppins! 🏡✨`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">

        <!-- Header con emoji grande -->
        <tr>
          <td style="background:linear-gradient(135deg,#18181b 0%,#3f3f46 100%);padding:40px 40px 32px;text-align:center">
            <div style="font-size:52px;line-height:1;margin-bottom:12px">🏡</div>
            <p style="margin:0;font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">Poppins</p>
            <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;letter-spacing:1.5px;text-transform:uppercase">La magia en tu casa</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 12px">

            <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:#18181b;line-height:1.2">
              ¡Te invitaron a Poppins!
            </p>
            <p style="margin:0 0 28px;font-size:16px;color:#52525b;line-height:1.7">
              <strong style="color:#18181b">${nombreInvitante}</strong> te agregó como
              <strong style="color:#18181b"> ${etiqueta}</strong> en su hogar. 🎉<br>
              Eso significa que ahora eres parte oficial del equipo doméstico.
              Sin sueldo, pero con acceso a Poppins — que tampoco está nada mal.
            </p>

            <!-- Qué vas a poder hacer -->
            <div style="background:#fafafa;border-left:4px solid #18181b;border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:28px">
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#18181b">¿Qué es Poppins?</p>
              <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;line-height:1.6">
                La app que organiza el hogar de verdad: tareas, listas de compras,
                recordatorios, y todo lo del personal doméstico — en un solo lugar.
              </p>
              <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6">
                Y lo mejor: <strong style="color:#18181b">${nombreInvitante}</strong> ya decidió qué puedes ver.
                Así que ni preguntes si hay plata en la cuenta. 😅
              </p>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:32px">
                <a href="${activationUrl}"
                   style="display:inline-block;background:#18181b;color:#ffffff;font-size:16px;font-weight:700;
                          padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px">
                  Activar mi cuenta →
                </a>
                <p style="margin:12px 0 0;font-size:12px;color:#a1a1aa">
                  Este link es personal y expira en 24 horas ⏰
                </p>
              </td></tr>
            </table>

            <div style="border-top:1px solid #e4e4e7;padding-top:20px;margin-bottom:8px">
              <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6">
                Si no esperabas esta invitación, ignora este mensaje sin drama.<br>
                Nadie se va a enterar, prometido. 🤫
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e4e4e7;padding:18px 40px;text-align:center">
            <p style="margin:0;font-size:12px;color:#a1a1aa">
              Poppins — Hecho con ♥ para familias chilenas 🇨🇱
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function emailLiquidacionLista(nombre: string, periodo: string, monto: string): EmailPayload {
  return {
    to: '',
    subject: `Tu liquidación de ${periodo} está lista — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu liquidación del período <strong>${periodo}</strong> por <strong>${monto}</strong> está lista para revisar y firmar.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/portal/liquidaciones" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Ver Liquidación
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Este email fue enviado por Poppins. Si no esperabas este mensaje, puedes ignorarlo.</p>
      </div>`,
  };
}

export function emailSolicitudAprobada(nombre: string, tipo: string, estado: string): EmailPayload {
  const esAprobada = estado === 'aprobada';
  return {
    to: '',
    subject: `Solicitud ${esAprobada ? 'aprobada' : 'rechazada'} — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu solicitud de <strong>${tipo}</strong> ha sido <strong style="color:${esAprobada ? '#16a34a' : '#dc2626'}">${estado}</strong> por tu empleador.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/portal/solicitudes" style="display:inline-block;background:#2D2D90;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Ver Detalles
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}

export function emailRecordatorioFirma(nombre: string, periodo: string): EmailPayload {
  return {
    to: '',
    subject: `Recuerda firmar tu liquidación de ${periodo} — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu empleador te recuerda firmar la liquidación del período <strong>${periodo}</strong>.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/portal/liquidaciones" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Firmar Ahora
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}

export function emailPagoConfirmado(nombre: string, monto: string, cuentas: number): EmailPayload {
  return {
    to: '',
    subject: `Pago confirmado por ${monto} — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu pago por <strong>${monto}</strong> (${cuentas} cuenta${cuentas > 1 ? 's' : ''}) ha sido procesado exitosamente.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/hogar/pagos" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Ver Comprobante
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}

export function emailAlertaVencimiento(nombre: string, cuenta: string, diasRestantes: number): EmailPayload {
  return {
    to: '',
    subject: `⚠️ ${cuenta} vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''} — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu cuenta <strong>${cuenta}</strong> vence en <strong>${diasRestantes} día${diasRestantes > 1 ? 's' : ''}</strong>.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/hogar/pagos" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Pagar Ahora
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}
