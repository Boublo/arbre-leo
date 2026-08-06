import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArbreImprimable } from '@/components/arbre/arbre-imprimable';
import { chargerArbre, personneOuDefaut } from '@/lib/arbre';
import { LIBELLE_MODE, type ModeArbre } from '@/lib/layout-arbre';

/**
 * Vue imprimable de l'arbre généalogique.
 *
 * Même principe que la fiche personne imprimable : une page serveur sobre,
 * un SVG statique, et la boîte d'impression du navigateur pour le PDF.
 */

export const dynamic = 'force-dynamic';

const MODES: ModeArbre[] = ['ascendance', 'famille', 'descendance', 'eclate'];

function modeValide(valeur: string | undefined): ModeArbre {
  return MODES.includes(valeur as ModeArbre) ? (valeur as ModeArbre) : 'ascendance';
}

export async function generateMetadata({
  searchParams,
}: PageProps<'/arbre/imprimer'>): Promise<Metadata> {
  const { personne, mode } = await searchParams;
  const donnees = await chargerArbre({ signerPhotosPour: 'aucun' });
  const focus = personneOuDefaut(
    donnees,
    typeof personne === 'string' ? personne : undefined
  );
  const modeAffiche = modeValide(typeof mode === 'string' ? mode : undefined);
  const titre = focus
    ? `Arbre imprimable — ${focus.nomComplet} (${LIBELLE_MODE[modeAffiche].titre})`
    : 'Arbre imprimable';
  return { title: titre, robots: { index: false, follow: false, nocache: true } };
}

export default async function PageArbreImprimer({
  searchParams,
}: PageProps<'/arbre/imprimer'>) {
  const { personne: personneParam, mode: modeParam } = await searchParams;
  const mode = modeValide(typeof modeParam === 'string' ? modeParam : undefined);

  const donnees = await chargerArbre();
  if (donnees.personnes.size === 0) notFound();

  const focus = personneOuDefaut(
    donnees,
    typeof personneParam === 'string' ? personneParam : undefined
  );
  if (!focus) notFound();

  if (!personneParam) {
    redirect(`/arbre/imprimer?personne=${focus.id}&mode=${mode}`);
  }

  const dateImpression = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(
    new Date()
  );
  const vieResume = [
    focus.naissance?.texte,
    focus.deces?.texte ? `† ${focus.deces.texte}` : focus.presumeVivant ? null : '†',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="imprimer-racine">
      <style>{stylesImprimables}</style>

      <div className="imprimer-barre-outils no-imprimer">
        <Link href={`/arbre?personne=${focus.id}`} className="imprimer-lien-retour">
          ← Revenir à l’arbre
        </Link>

        <nav className="arbre-impr-modes" aria-label="Vue à imprimer">
          {MODES.map((m) => (
            <Link
              key={m}
              href={`/arbre/imprimer?personne=${focus.id}&mode=${m}`}
              className={m === mode ? 'arbre-impr-mode-actif' : 'arbre-impr-mode'}
              title={LIBELLE_MODE[m].aide}
            >
              {LIBELLE_MODE[m].titre}
            </Link>
          ))}
        </nav>

        <button type="button" className="imprimer-bouton" data-imprimer>
          Imprimer maintenant
        </button>
      </div>

      <article className="imprimer-page arbre-impr-page">
        <header className="imprimer-entete arbre-impr-entete">
          <p className="imprimer-surtitre">L’arbre de la famille — vue imprimable</p>
          <h1 className="imprimer-titre">{focus.nomComplet}</h1>
          <p className="arbre-impr-sous-titre">
            {LIBELLE_MODE[mode].titre}
            {vieResume ? ` · ${vieResume}` : ''}
          </p>
          <p className="arbre-impr-aide">{LIBELLE_MODE[mode].aide}</p>
        </header>

        <ArbreImprimable donnees={donnees} racineId={focus.id} mode={mode} />

        <footer className="imprimer-pied">
          L’arbre de la famille — {focus.nomComplet} — imprimé le {dateImpression}
        </footer>
      </article>

      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.querySelector('[data-imprimer]')?.addEventListener('click',function(){window.print();});",
        }}
      />
    </div>
  );
}

const stylesImprimables = `
  .imprimer-racine {
    min-height: 100vh;
    background: #e8e8e8;
    font-family: Georgia, 'Times New Roman', serif;
    color: #111111;
  }
  .imprimer-barre-outils {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
    padding: 0.75rem 1.25rem;
    background: #ffffff;
    border-bottom: 1px solid #cccccc;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .imprimer-lien-retour {
    font-size: 0.875rem;
    color: #333333;
    text-decoration: none;
  }
  .imprimer-lien-retour:hover { text-decoration: underline; }
  .imprimer-bouton {
    margin-left: auto;
    padding: 0.5rem 1rem;
    background: #111111;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    font-family: inherit;
  }
  .imprimer-bouton:hover { background: #333333; }

  .arbre-impr-modes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .arbre-impr-mode,
  .arbre-impr-mode-actif {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
    border-radius: 4px;
    text-decoration: none;
    border: 1px solid #cccccc;
    color: #444444;
    background: #fafafa;
  }
  .arbre-impr-mode-actif {
    background: #111111;
    color: #ffffff;
    border-color: #111111;
  }
  .arbre-impr-mode:hover { background: #eeeeee; }

  .imprimer-page {
    max-width: 100%;
    margin: 1.5rem auto;
    padding: 1.5rem 1.25rem 2rem;
    background: #ffffff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }
  .arbre-impr-entete { margin-bottom: 1.25rem; }
  .imprimer-surtitre {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #666666;
    margin: 0;
  }
  .imprimer-titre {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0.25rem 0 0;
    line-height: 1.2;
  }
  .arbre-impr-sous-titre {
    font-size: 0.95rem;
    color: #444444;
    margin: 0.35rem 0 0;
  }
  .arbre-impr-aide {
    font-size: 0.82rem;
    color: #666666;
    margin: 0.25rem 0 0;
    font-style: italic;
  }
  .imprimer-pied {
    margin-top: 1.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #cccccc;
    font-size: 0.75rem;
    color: #666666;
    text-align: center;
  }

  .arbre-impr-figure { margin: 0; }
  .arbre-impr-svg {
    display: block;
    width: 100%;
    height: auto;
    min-height: 200px;
  }
  .arbre-impr-legende {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    margin-top: 0.75rem;
    font-size: 0.72rem;
    color: #666666;
  }
  .arbre-impr-legende span::before {
    content: '';
    display: inline-block;
    width: 1.25rem;
    height: 2px;
    margin-right: 0.35rem;
    vertical-align: middle;
  }
  .arbre-impr-legende span:nth-child(1)::before { background: #2c5f8a; }
  .arbre-impr-legende span:nth-child(2)::before { background: #7a3d6b; }
  .arbre-impr-legende span:nth-child(3)::before { background: #7a5c10; height: 3px; }
  .arbre-impr-rien {
    padding: 2rem;
    text-align: center;
    color: #666666;
    font-style: italic;
  }

  @media print {
    @page { size: A4 landscape; margin: 0.8cm; }
    html, body { background: #ffffff !important; }
    body > *:not(.imprimer-racine) { display: none !important; }
    .imprimer-racine { padding: 0 !important; background: #ffffff !important; }
    .imprimer-page {
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
      max-width: none !important;
    }
    .no-imprimer { display: none !important; }
    .imprimer-titre { font-size: 1.4rem; }
    .arbre-impr-svg { max-height: 17cm; }
    .arbre-impr-legende { font-size: 0.65rem; }
  }
`;
