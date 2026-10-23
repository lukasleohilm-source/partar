// Tilkynningapóstur í gegnum Resend (https://resend.com/docs/api-reference/emails/send-email).

export type EmailMessage = { title: string; body: string; url: string };

const KIND_SUBJECT: Record<string, (m: EmailMessage) => string> = {
  message: (m) => `Ný skilaboð frá ${m.title}`,
  wanted_match: (m) => `Passar við ósk þína: ${m.body}`,
  price_drop: (m) => `Verðið lækkaði: ${m.body}`,
  review: (m) => m.title,
};

const KIND_ACTION: Record<string, string> = {
  message: "Svara",
  wanted_match: "Skoða auglýsingu",
  price_drop: "Skoða auglýsingu",
  review: "Skoða",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(kind: string, m: EmailMessage, siteUrl: string) {
  const subject = (KIND_SUBJECT[kind]?.(m) ?? m.title).slice(0, 150);
  const link = new URL(m.url, siteUrl).href;
  const settings = new URL("/profill", siteUrl).href;
  const heading = kind === "message" ? `${m.title} sendi þér skilaboð` : m.title;
  const action = KIND_ACTION[kind] ?? "Opna";

  const html = `<!doctype html><html lang="is"><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td style="font-size:20px;font-weight:800;color:#ea580c;padding-bottom:20px">Partar</td></tr>
<tr><td style="font-size:18px;font-weight:700;padding-bottom:8px">${escapeHtml(heading)}</td></tr>
<tr><td style="font-size:16px;line-height:1.5;color:#44403c;padding-bottom:24px;white-space:pre-line">${escapeHtml(m.body)}</td></tr>
<tr><td><a href="${link}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">${action}</a></td></tr>
</table>
<p style="max-width:480px;font-size:12px;line-height:1.5;color:#78716c;padding:16px 8px 0;margin:0">
Þú færð þennan póst af því þú ert með aðgang á Partar og ert ekki með tilkynningar í síma.
<a href="${settings}" style="color:#78716c">Breyta eða slökkva á pósti</a>.</p>
</td></tr></table></body></html>`;

  const text = `${heading}\n\n${m.body}\n\n${action}: ${link}\n\n—\nBreyta eða slökkva á pósti: ${settings}`;
  return { subject, html, text, settings };
}

export async function sendEmail(opts: {
  apiKey: string;
  from: string;
  to: string;
  kind: string;
  message: EmailMessage;
  siteUrl: string;
}): Promise<number> {
  const { subject, html, text, settings } = renderEmail(opts.kind, opts.message, opts.siteUrl);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject,
      html,
      text,
      headers: { "List-Unsubscribe": `<${settings}>` },
    }),
  });
  return res.status;
}
