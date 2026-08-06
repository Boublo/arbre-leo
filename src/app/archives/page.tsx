import Link from 'next/link';
import type { Metadata } from 'next';
import { Navigation } from '@/components/navigation';
import { chargerArbre, type PersonneArbre } from '@/lib/arbre';
import { creerClientServeur } from '@/lib/supabase/server';
import type { NiveauPreuve } from '@/lib/types-base';
import { PREUVES } from '@/lib/preuves';

/**
 * Bibliothèque d’archives — les sources étayées (actes, ANOM) à travers
 * toute la famille, pas seulement depuis une fiche. Lecture seule.
 */

export const metadata: Metadata = { title: 'Archives' };

export const dynamic = 'force-dynamic';

const LIBELLE_NIVEAU: Partial<Record<NiveauPreuve, string>> = {
  acte: 'Acte',
  anom: 'ANOM',
};

type SourceArchive = {
  id: string;
  titre: string | null;
  texte: string | null;
  page: string | null;
  depot: string | null;
  niveau: NiveauPreuve;
  creeLe: string;
  personne: PersonneArbre | null;
};

export default async function PageArchives() {
  const supabase = await creerClientServeur();

  const [donnees, sourcesRes] = await Promise.all([
    chargerArbre({ signerPhotosPour: 'aucun' }),
    supabase
      .from('sources')
      .select(
        'id, titre, texte, page, depot, niveau_preuve, cree_le, personne_id, evenements(personne_id)'
      )
      .in('niveau_preuve', ['acte', 'anom'])
      .order('cree_le', { ascending: false })
      .limit(200),
  ]);

  if (sourcesRes.error) {
    throw new Error(`Chargement des archives impossible : ${sourcesRes.error.message}`);
  }

  const archives: SourceArchive[] = (sourcesRes.data ?? []).map((s) => {
    const evtBrut = (s as { evenements?: unknown }).evenements;
    const evt = Array.isArray(evtBrut) ? evtBrut[0] : evtBrut;
    const personneId =
      s.personne_id ??
      (evt && typeof evt === 'object' && 'personne_id' in evt
        ? ((evt as { personne_id: string | null }).personne_id ?? null)
        : null);

    return {
      id: s.id,
      titre: s.titre,
      texte: s.texte,
      page: s.page,
      depot: s.depot,
      niveau: s.niveau_preuve as NiveauPreuve,
      creeLe: s.cree_le,
      personne: personneId ? donnees.personnes.get(personneId) ?? null : null,
    };
  });

  return (
    <>
      <Navigation />
      <main
        id="contenu-principal"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14"
      >
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl sm:text-4xl">Archives</h1>
          <p className="max-w-2xl text-encre-douce">
            Les actes et registres déjà lus pour la famille — une même pièce
            peut servir plusieurs vies. Ouvrir une fiche pour le détail et le
            dépôt de nouvelles sources.
          </p>
        </header>

        {archives.length === 0 ? (
          <p className="carte p-6 text-encre-douce">
            Aucun acte n’est encore versé. Depuis une fiche personne, déposez
            un acte pour commencer la bibliothèque.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {archives.map((source) => {
              const preuve = PREUVES[source.niveau];
              const extrait = extraitCourt(source.texte ?? source.titre, 180);
              return (
                <li key={source.id}>
                  <article className="carte flex flex-col gap-2 p-5 transition hover:border-bordure-forte">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span
                        className={`rounded-[var(--rayon-petit)] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.06em] text-accent-contraste ${preuve?.teinte ?? 'bg-encre-tres-douce'}`}
                      >
                        {LIBELLE_NIVEAU[source.niveau] ?? source.niveau}
                      </span>
                      {source.depot && (
                        <span className="text-xs text-encre-tres-douce">{source.depot}</span>
                      )}
                      {source.page && (
                        <span className="text-xs text-encre-tres-douce">p. {source.page}</span>
                      )}
                    </div>

                    {source.titre && (
                      <h2 className="text-lg leading-snug">{source.titre}</h2>
                    )}
                    {extrait && (
                      <p className="text-sm leading-relaxed text-encre-douce">{extrait}</p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {source.personne ? (
                        <Link
                          href={`/personne/${source.personne.id}`}
                          className="font-medium text-accent underline-offset-4 hover:underline"
                        >
                          {source.personne.nomComplet}
                        </Link>
                      ) : (
                        <span className="text-encre-tres-douce">Personne non rattachée</span>
                      )}
                      <time
                        className="text-xs text-encre-tres-douce"
                        dateTime={source.creeLe}
                      >
                        Versé le{' '}
                        {new Intl.DateTimeFormat('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }).format(new Date(source.creeLe))}
                      </time>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

function extraitCourt(texte: string | null, max: number): string | null {
  if (!texte) return null;
  const propre = texte.trim();
  if (!propre) return null;
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const espace = coupe.lastIndexOf(' ');
  return `${coupe.slice(0, espace > 0 ? espace : max)}…`;
}
