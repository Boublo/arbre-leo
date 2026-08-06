import { NextResponse } from 'next/server';
import { z } from 'zod';
import { creerClientServeur } from '@/lib/supabase/server';

const schema = z.object({
  ids: z.array(z.string().uuid()).max(120),
});

/**
 * Renouvelle les URL signées des portraits visibles sur l'arbre.
 * Les liens expirent au bout d'une heure : cet endpoint permet de les
 * rafraîchir sans recharger toute la page.
 */
export async function POST(request: Request) {
  const corps = schema.safeParse(await request.json().catch(() => null));
  if (!corps.success) {
    return NextResponse.json({ erreur: 'Requête invalide.' }, { status: 400 });
  }

  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erreur: 'Non authentifié.' }, { status: 401 });
  }

  const { data: personnes } = await supabase
    .from('personnes')
    .select('id, photo_id')
    .in('id', corps.data.ids);

  const photoIds = [
    ...new Set(
      (personnes ?? [])
        .map((p) => p.photo_id)
        .filter((id): id is string => typeof id === 'string')
    ),
  ];

  if (photoIds.length === 0) {
    return NextResponse.json({ urls: {} as Record<string, string | null> });
  }

  const { data: medias } = await supabase
    .from('medias')
    .select('id, chemin')
    .in('id', photoIds);

  const cheminParPhotoId = new Map((medias ?? []).map((m) => [m.id, m.chemin]));
  const chemins = new Set<string>();
  const cheminParPersonne = new Map<string, string>();

  for (const personne of personnes ?? []) {
    if (!personne.photo_id) continue;
    const chemin = cheminParPhotoId.get(personne.photo_id);
    if (!chemin) continue;
    chemins.add(chemin);
    cheminParPersonne.set(personne.id, chemin);
  }

  if (chemins.size === 0) {
    return NextResponse.json({ urls: {} as Record<string, string | null> });
  }

  const { data: urlsSignees, error } = await supabase.storage
    .from('arbre-medias')
    .createSignedUrls([...chemins], 3600);

  if (error) {
    return NextResponse.json({ erreur: error.message }, { status: 500 });
  }

  const urlParChemin = new Map<string, string>();
  for (const entree of urlsSignees ?? []) {
    if (entree.path && entree.signedUrl) urlParChemin.set(entree.path, entree.signedUrl);
  }

  const urls: Record<string, string | null> = {};
  for (const [personneId, chemin] of cheminParPersonne) {
    urls[personneId] = urlParChemin.get(chemin) ?? null;
  }

  return NextResponse.json({ urls });
}
