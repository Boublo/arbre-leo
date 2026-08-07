import type { EntreeRappelEmail } from '@/lib/rappels-anniversaires';

const COULEUR_FOND = '#f3eee5';
const COULEUR_CARTE = '#ffffff';
const COULEUR_ACCENT = '#2f5d50';
const COULEUR_OR = '#b08d2f';
const COULEUR_TEXTE = '#211c17';
const COULEUR_DOUX = '#5d5348';

function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function blocEntree(entree: EntreeRappelEmail): string {
  const etiquette =
    entree.type === 'naissance'
      ? 'Naissance'
      : entree.type === 'deces'
        ? 'En mémoire'
        : 'Mariage';
  const couleurEtiquette =
    entree.type === 'deces' ? COULEUR_OR : COULEUR_ACCENT;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:0 0 16px;background:#fbf8f3;border:1px solid #e4dbcc;border-radius:10px;">
      <tr>
        <td style="padding:16px 18px;font-family:Helvetica,Arial,sans-serif;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${couleurEtiquette};margin-bottom:8px;">
            ${etiquette}
          </div>
          <div style="font-size:17px;color:${COULEUR_TEXTE};font-family:Georgia,serif;margin-bottom:6px;">
            ${echapperHtml(entree.titre)}
          </div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:${COULEUR_DOUX};">
            ${echapperHtml(entree.detail)}
          </p>
          <p style="margin:12px 0 0;">
            <a href="${entree.lien}"
               style="font-size:14px;color:${COULEUR_ACCENT};text-decoration:none;font-weight:600;">
              ${entree.type === 'deces' ? 'Laisser un mot →' : 'Voir la fiche →'}
            </a>
          </p>
        </td>
      </tr>
    </table>`;
}

export function genererHtmlRappelAnniversaire(options: {
  prenomDestinataire: string;
  dateLabel: string;
  entrees: EntreeRappelEmail[];
  lienCalendrier: string;
  lienPreferences: string;
  nomSite?: string;
}): string {
  const nomSite = options.nomSite ?? "L'arbre de Léo";
  const corpsEntrees =
    options.entrees.length > 0
      ? options.entrees.map(blocEntree).join('')
      : `<p style="font-size:15px;line-height:1.65;color:${COULEUR_DOUX};font-family:Helvetica,Arial,sans-serif;">
           Rien de particulier aujourd'hui dans le calendrier familial.
         </p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Ces jours-ci — ${echapperHtml(nomSite)}</title></head>
<body style="margin:0;padding:0;background:${COULEUR_FOND};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:${COULEUR_FOND};padding:32px 12px;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="max-width:560px;background:${COULEUR_CARTE};border:1px solid #e4dbcc;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:${COULEUR_ACCENT};padding:28px 32px;text-align:center;">
          <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a8c6bb;">Famille</div>
          <div style="font-size:26px;color:#ffffff;margin-top:6px;">${echapperHtml(nomSite)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;color:${COULEUR_TEXTE};">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:normal;color:${COULEUR_TEXTE};">
            Ces jours-ci
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${COULEUR_DOUX};font-family:Helvetica,Arial,sans-serif;">
            Bonjour ${echapperHtml(options.prenomDestinataire)},<br>
            voici ce que le calendrier de la famille rappelle pour le <strong>${echapperHtml(options.dateLabel)}</strong>.
            ${options.entrees.some((e) => e.type === 'deces')
              ? ' Les lieux de repos sont indiqués pour vous aider à vous recueillir.'
              : ''}
          </p>
          ${corpsEntrees}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
            <tr>
              <td style="border-radius:8px;background:${COULEUR_ACCENT};">
                <a href="${options.lienCalendrier}"
                   style="display:inline-block;padding:13px 28px;font-size:15px;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;">
                  Ouvrir le calendrier
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 28px;border-top:1px solid #e4dbcc;font-size:12px;line-height:1.6;color:#8a7f72;font-family:Helvetica,Arial,sans-serif;text-align:center;">
          Vous recevez ce message parce que les rappels par courriel sont activés sur votre compte.
          <a href="${options.lienPreferences}" style="color:${COULEUR_ACCENT};">Gérer mes rappels</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function sujetRappelAnniversaire(dateLabel: string, nombre: number): string {
  if (nombre === 0) return `Ces jours-ci — ${dateLabel}`;
  if (nombre === 1) return `Un anniversaire aujourd'hui — ${dateLabel}`;
  return `${nombre} anniversaires aujourd'hui — ${dateLabel}`;
}

export async function envoyerCourrielRappel(options: {
  destinataire: string;
  sujet: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const cle = process.env.RESEND_API_KEY;
  const expediteur =
    process.env.RAPPELS_EMAIL_FROM ?? process.env.EMAIL_FROM ?? 'rappels@modulyx.eu';

  if (!cle) {
    return { ok: false, erreur: 'RESEND_API_KEY non configurée.' };
  }

  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cle}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: expediteur,
      to: [options.destinataire],
      subject: options.sujet,
      html: options.html,
    }),
  });

  if (!reponse.ok) {
    const corps = await reponse.text().catch(() => '');
    return { ok: false, erreur: `Resend ${reponse.status} : ${corps.slice(0, 200)}` };
  }

  return { ok: true };
}
