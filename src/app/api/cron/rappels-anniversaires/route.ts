import { NextResponse } from 'next/server';
import { executerRappelsAnniversaires } from '@/lib/executer-rappels-anniversaires';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Cron quotidien : rappels d'anniversaires par courriel et notification in-app.
 * Protégé par CRON_SECRET (header Authorization: Bearer … ou ?secret=).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ erreur: 'CRON_SECRET non configuré.' }, { status: 503 });
  }

  const url = new URL(request.url);
  const header = request.headers.get('authorization');
  const fourni =
    url.searchParams.get('secret') === secret ||
    header === `Bearer ${secret}`;

  if (!fourni) {
    return NextResponse.json({ erreur: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const resultat = await executerRappelsAnniversaires();
    return NextResponse.json({ ok: true, ...resultat });
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : 'Erreur inconnue';
    return NextResponse.json({ ok: false, erreur: message }, { status: 500 });
  }
}
