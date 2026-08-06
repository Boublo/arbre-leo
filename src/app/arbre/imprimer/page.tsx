import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ActionsImpressionArbre } from '@/components/arbre/actions-impression-arbre';
import { ArbreImprimable } from '@/components/arbre/arbre-imprimable';
import { OptionsImpressionArbre } from '@/components/arbre/options-impression-arbre';
import { chargerArbre, personneOuDefaut } from '@/lib/arbre';
import { parserOptionsImpression, urlOptionsImpression } from '@/lib/arbre-impression';
import { LIBELLE_MODE, type ModeArbre } from '@/lib/layout-arbre';

export const dynamic = 'force-dynamic';

const MODES: ModeArbre[] = ['ascendance', 'famille', 'descendance', 'eclate'];

function modeValide(valeur: string | undefined): ModeArbre {
  return MODES.includes(valeur as ModeArbre) ? (valeur as ModeArbre) : 'ascendance';
}

export async function generateMetadata({
  searchParams,
}: PageProps<'/arbre/imprimer'>): Promise<Metadata> {
  const params = await searchParams;
  const donnees = await chargerArbre({ signerPhotosPour: 'aucun' });
  const focus = personneOuDefaut(
    donnees,
    typeof params.personne === 'string' ? params.personne : undefined
  );
  const modeAffiche = modeValide(typeof params.mode === 'string' ? params.mode : undefined);
  const titre = focus
    ? `Arbre imprimable — ${focus.nomComplet} (${LIBELLE_MODE[modeAffiche].titre})`
    : 'Arbre imprimable';
  return { title: titre, robots: { index: false, follow: false, nocache: true } };
}

export default async function PageArbreImprimer({
  searchParams,
}: PageProps<'/arbre/imprimer'>) {
  const params = await searchParams;
  const mode = modeValide(typeof params.mode === 'string' ? params.mode : undefined);
  const options = parserOptionsImpression({
    profondeur: typeof params.profondeur === 'string' ? params.profondeur : undefined,
    photos: typeof params.photos === 'string' ? params.photos : undefined,
    format: typeof params.format === 'string' ? params.format : undefined,
    decoupage: typeof params.decoupage === 'string' ? params.decoupage : undefined,
  });

  const donnees = await chargerArbre();
  if (donnees.personnes.size === 0) notFound();

  const focus = personneOuDefaut(
    donnees,
    typeof params.personne === 'string' ? params.personne : undefined
  );
  if (!focus) notFound();

  if (!params.personne) {
    redirect(urlOptionsImpression({ personne: focus.id, mode }, options));
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

  const formatPage = options.format === 'portrait' ? 'portrait' : 'landscape';

  return (
    <div className="imprimer-racine" data-format={formatPage}>
      <style>{stylesImprimables(formatPage)}</style>

      <div className="imprimer-barre-outils no-imprimer">
        <Link href={`/arbre?personne=${focus.id}`} className="imprimer-lien-retour">
          ← Revenir à l’arbre
        </Link>
        <ActionsImpressionArbre />
      </div>

      <OptionsImpressionArbre personneId={focus.id} mode={mode} options={options} />

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

        <ArbreImprimable
          donnees={donnees}
          racineId={focus.id}
          mode={mode}
          options={options}
        />

        <footer className="imprimer-pied">
          L’arbre de la famille — {focus.nomComplet} — imprimé le {dateImpression}
        </footer>
      </article>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  var btnPrint=document.querySelector('[data-imprimer]');
  if(btnPrint)btnPrint.addEventListener('click',function(){window.print();});
  var btnSvg=document.querySelector('[data-telecharger-svg]');
  if(btnSvg)btnSvg.addEventListener('click',function(){
    var svg=document.querySelector('.arbre-impr-svg');
    if(!svg)return;
    var clone=svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    var src=new XMLSerializer().serializeToString(clone);
    var blob=new Blob([src],{type:'image/svg+xml;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='arbre-${focus.nomComplet.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\\-\\s]/g,'').trim().replace(/\\s+/g,'-').toLowerCase() || 'famille'}.svg';
    a.click();
    URL.revokeObjectURL(url);
  });
})();
          `.trim(),
        }}
      />
    </div>
  );
}

function stylesImprimables(format: 'landscape' | 'portrait'): string {
  return `
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
  .arbre-impr-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-left: auto;
  }
  .imprimer-bouton {
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
  .imprimer-bouton-secondaire {
    padding: 0.5rem 1rem;
    background: #ffffff;
    color: #111111;
    border: 1px solid #cccccc;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    font-family: inherit;
  }
  .imprimer-bouton-secondaire:hover { background: #f5f5f5; }

  .arbre-impr-options {
    padding: 0.75rem 1.25rem;
    background: #fafafa;
    border-bottom: 1px solid #dddddd;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .arbre-impr-modes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .arbre-impr-mode,
  .arbre-impr-mode-actif,
  .arbre-impr-opt,
  .arbre-impr-opt-actif {
    padding: 0.35rem 0.65rem;
    font-size: 0.78rem;
    border-radius: 4px;
    text-decoration: none;
    border: 1px solid #cccccc;
    color: #444444;
    background: #ffffff;
    white-space: nowrap;
  }
  .arbre-impr-mode-actif,
  .arbre-impr-opt-actif {
    background: #111111;
    color: #ffffff;
    border-color: #111111;
  }
  .arbre-impr-mode:hover,
  .arbre-impr-opt:hover { background: #eeeeee; }
  .arbre-impr-reglages {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
  }
  .arbre-impr-groupe {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }
  .arbre-impr-groupe-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #888888;
    margin-right: 0.25rem;
  }
  .arbre-impr-groupe-boutons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .imprimer-page {
    max-width: min(100%, 1400px);
    margin: 1.5rem auto;
    padding: 1.5rem 1.25rem 2rem;
    background: #ffffff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }
  .arbre-impr-entete { margin-bottom: 1rem; }
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
  .arbre-impr-stats {
    font-size: 0.8rem;
    color: #666666;
    margin: 0 0 0.75rem;
  }
  .imprimer-pied {
    margin-top: 1.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #cccccc;
    font-size: 0.75rem;
    color: #666666;
    text-align: center;
  }

  .arbre-impr-figure { margin: 0 0 1.5rem; }
  .arbre-impr-figure-page {
    break-before: page;
    page-break-before: always;
    padding-top: 0.5rem;
  }
  .arbre-impr-tranche-titre {
    font-size: 0.85rem;
    font-weight: 600;
    color: #333333;
    margin: 0 0 0.5rem;
  }
  .arbre-impr-tranche-num {
    font-weight: 400;
    color: #666666;
  }
  .arbre-impr-svg {
    display: block;
    width: 100%;
    height: auto;
    min-height: 180px;
    max-height: 75vh;
  }
  .arbre-impr-legende {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
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
  .arbre-impr-legende-focus::before {
    background: transparent !important;
    width: 0.85rem !important;
    height: 0.85rem !important;
    border: 2px solid #000000 !important;
    border-radius: 2px;
  }
  .arbre-impr-rien {
    padding: 2rem;
    text-align: center;
    color: #666666;
    font-style: italic;
  }

  .arbre-impr-liste {
    margin-top: 2rem;
    padding-top: 1.25rem;
    border-top: 1px solid #dddddd;
    break-before: page;
    page-break-before: always;
  }
  .arbre-impr-liste-titre {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.25rem;
  }
  .arbre-impr-liste-aide {
    font-size: 0.8rem;
    color: #666666;
    margin: 0 0 0.75rem;
    font-style: italic;
  }
  .arbre-impr-liste-colonnes {
    columns: 2;
    column-gap: 2rem;
    font-size: 0.82rem;
    line-height: 1.6;
    margin: 0;
    padding-left: 1.25rem;
  }
  .arbre-impr-liste-nom { font-weight: 500; }
  .arbre-impr-liste-focus {
    font-size: 0.75rem;
    color: #666666;
    font-style: italic;
  }

  @media (min-width: 768px) {
    .arbre-impr-liste-colonnes { columns: 3; }
  }

  @media print {
    @page { size: A4 ${format}; margin: 0.7cm; }
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
    .imprimer-titre { font-size: 1.3rem; }
    .arbre-impr-svg {
      max-height: none;
      max-width: 100%;
    }
    .arbre-impr-legende { font-size: 0.6rem; }
    .arbre-impr-figure-page { break-before: page; page-break-before: always; }
    .arbre-impr-liste-colonnes { columns: 3; font-size: 0.7rem; }
    /* Pas d'ombre à l'impression */
    .arbre-impr-svg filter { display: none; }
    .arbre-impr-svg [filter] { filter: none !important; }
  }
`;
}
