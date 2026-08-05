import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { chargerFiche, chargerNomPersonne } from '@/components/personne/donnees';
import { LIBELLE_EVENEMENT, LIBELLE_PORTEE, LIBELLE_SEXE, accorder } from '@/components/personne/vocabulaire';
import type {
  EvenementFiche,
  FaitFiche,
  Fiche,
  Foyer,
  LienPersonne,
  MembreFratrie,
  SourceFiche,
} from '@/components/personne/donnees';

/**
 * Version imprimable de la fiche.
 *
 * On peut vouloir emporter une fiche chez un cousin qui n’a pas d’écran, ou la
 * glisser dans un classeur avec les photocopies d’actes. La page se donne pour
 * cela : deux colonnes sobres, tout ce qui compte, aucune image ni fioriture,
 * et une feuille de style qui bascule en noir sur blanc à l’impression pour ne
 * pas gâcher d’encre en fond de parchemin.
 *
 * L’URL /personne/[id]/imprimer suffit à générer un PDF : le navigateur fait le
 * reste avec sa boîte d’impression, sans backend ni bibliothèque.
 *
 * Les couleurs sont ici volontairement fixées (blanc et gris foncés), à l’écran
 * comme à l’impression : la page imite un feuillet dactylographié, pas
 * l’interface de l’application. C’est la seule exception admise à la palette.
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/personne/[id]/imprimer'>): Promise<Metadata> {
  const { id } = await params;
  const nom = await chargerNomPersonne(id);
  return {
    title: nom ? `Fiche imprimable — ${nom}` : 'Fiche introuvable',
    // Une fiche imprimable ne se référence pas.
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PageImprimerPersonne({
  params,
}: PageProps<'/personne/[id]/imprimer'>) {
  const { id } = await params;
  const fiche = await chargerFiche(id);
  if (!fiche) notFound();

  const vieResume = resumerVie(fiche);
  const dateImpression = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());

  return (
    <div className="imprimer-racine">
      <style>{stylesImprimables}</style>

      <div className="imprimer-barre-outils no-imprimer">
        <Link href={`/personne/${id}`} className="imprimer-lien-retour">
          ← Revenir à la fiche
        </Link>
        {/* La confirmation appelle window.print() côté navigateur, branchée par un
            petit script placé plus bas — on évite ainsi un composant client dédié. */}
        <button type="button" className="imprimer-bouton" data-imprimer>
          Imprimer maintenant
        </button>
      </div>

      <article className="imprimer-page">
        <header className="imprimer-entete">
          <p className="imprimer-surtitre">L’arbre de la famille — fiche imprimable</p>
          <h1 className="imprimer-titre">{fiche.nomComplet}</h1>
          {vieResume && <p className="imprimer-vie">{vieResume}</p>}
          {fiche.personne.surnom && (
            <p className="imprimer-surnom">
              {accorder(fiche.personne.sexe, 'dit')} «&nbsp;{fiche.personne.surnom}&nbsp;»
            </p>
          )}
        </header>

        <div className="imprimer-colonnes">
          <section className="imprimer-colonne">
            <BlocIdentite fiche={fiche} />
            <BlocVie evenements={fiche.evenements} />
            <BlocSources sources={fiche.sources} />
          </section>

          <section className="imprimer-colonne">
            <BlocParente fiche={fiche} />
            <BlocNotes notes={fiche.personne.notes} />
            <BlocFaits faits={fiche.faits} />
          </section>
        </div>

        <footer className="imprimer-pied">
          L’arbre de la famille — imprimé le {dateImpression}
        </footer>
      </article>

      {/* Petit script inline pour brancher le bouton, sans faire de composant client. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.querySelector('[data-imprimer]')?.addEventListener('click',function(){window.print();});",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocs
// ---------------------------------------------------------------------------

function BlocIdentite({ fiche }: { fiche: Fiche }) {
  const { personne } = fiche;
  const lignes: { titre: string; valeur: string }[] = [];

  lignes.push({ titre: 'Sexe', valeur: LIBELLE_SEXE[personne.sexe] });

  if (personne.nom_naissance && personne.nom_naissance !== personne.nom) {
    lignes.push({
      titre: 'Nom de naissance',
      valeur: personne.nom_naissance,
    });
  }

  if (personne.branches && personne.branches.length > 0) {
    lignes.push({ titre: 'Branches', valeur: personne.branches.join(', ') });
  }

  if (fiche.naissance) {
    lignes.push({
      titre: 'Naissance',
      valeur: assembler([fiche.naissance.date, fiche.naissance.lieu]),
    });
  }

  if (fiche.deces) {
    lignes.push({
      titre: 'Décès',
      valeur: assembler([fiche.deces.date, fiche.deces.lieu]),
    });
  }

  return (
    <Bloc titre="Identité">
      <dl className="imprimer-liste-def">
        {lignes.map((l) => (
          <div key={l.titre} className="imprimer-ligne-def">
            <dt>{l.titre}</dt>
            <dd>{l.valeur}</dd>
          </div>
        ))}
      </dl>
    </Bloc>
  );
}

function BlocVie({ evenements }: { evenements: EvenementFiche[] }) {
  if (evenements.length === 0) {
    return (
      <Bloc titre="Sa vie">
        <p className="imprimer-rien">Aucun événement consigné.</p>
      </Bloc>
    );
  }

  return (
    <Bloc titre="Sa vie">
      <ol className="imprimer-vie-liste">
        {evenements.map((e) => (
          <li key={e.id} className="imprimer-vie-ligne">
            <div className="imprimer-vie-tete">
              <span className="imprimer-vie-titre">{titreEvenement(e)}</span>
              <span className="imprimer-vie-date">{e.date || 'date inconnue'}</span>
            </div>
            {e.detail && <p className="imprimer-vie-detail">{e.detail}</p>}
            {e.avec && (
              <p className="imprimer-vie-detail">
                avec {e.avec.nomComplet}
                {e.avec.annees ? ` (${e.avec.annees})` : ''}
              </p>
            )}
            {e.lieu && <p className="imprimer-vie-lieu">{e.lieu}</p>}
            {e.notes && <p className="imprimer-vie-notes">{e.notes}</p>}
          </li>
        ))}
      </ol>
    </Bloc>
  );
}

function BlocSources({ sources }: { sources: SourceFiche[] }) {
  if (sources.length === 0) {
    return (
      <Bloc titre="Les sources">
        <p className="imprimer-rien">Aucune source rattachée.</p>
      </Bloc>
    );
  }

  return (
    <Bloc titre="Les sources">
      <ul className="imprimer-sources">
        {sources.map((s) => {
          const reference = [
            s.depot,
            s.cote && `cote ${s.cote}`,
            s.page && `page ${s.page}`,
          ].filter(Boolean);

          return (
            <li key={s.id} className="imprimer-source">
              <p className="imprimer-source-rattachement">{s.rattachement}</p>
              <p className="imprimer-source-titre">{s.titre ?? 'Source sans titre'}</p>
              {reference.length > 0 && (
                <p className="imprimer-source-reference">{reference.join(' · ')}</p>
              )}
              {s.url && (
                <p className="imprimer-source-url">
                  {/* L’URL est imprimée en toutes lettres : le lecteur du papier n’a rien d’autre. */}
                  {s.url}
                </p>
              )}
              {s.texte && <blockquote className="imprimer-source-texte">{s.texte}</blockquote>}
            </li>
          );
        })}
      </ul>
    </Bloc>
  );
}

function BlocParente({ fiche }: { fiche: Fiche }) {
  const { parents, fratrie, foyers } = fiche;
  const vide = parents.length === 0 && fratrie.length === 0 && foyers.length === 0;

  if (vide) {
    return (
      <Bloc titre="Sa parenté">
        <p className="imprimer-rien">Aucun lien de parenté renseigné.</p>
      </Bloc>
    );
  }

  return (
    <Bloc titre="Sa parenté">
      {parents.length > 0 && (
        <div className="imprimer-groupe">
          <h3 className="imprimer-groupe-titre">Parents</h3>
          <ListePersonnes personnes={parents} />
        </div>
      )}

      {fratrie.length > 0 && (
        <div className="imprimer-groupe">
          <h3 className="imprimer-groupe-titre">Frères et sœurs</h3>
          <ListeFratrie fratrie={fratrie} />
        </div>
      )}

      {foyers.map((foyer) => (
        <FoyerImprime key={foyer.id} foyer={foyer} />
      ))}
    </Bloc>
  );
}

function FoyerImprime({ foyer }: { foyer: Foyer }) {
  const titre = foyer.conjoint ? `Avec ${foyer.conjoint.nomComplet}` : 'Union';
  const personneListe: LienPersonne[] = foyer.conjoint ? [foyer.conjoint] : [];

  return (
    <div className="imprimer-groupe">
      <h3 className="imprimer-groupe-titre">{titre}</h3>

      {personneListe.length > 0 && <ListePersonnes personnes={personneListe} />}

      {foyer.evenements.length > 0 && (
        <ul className="imprimer-liste-simple">
          {foyer.evenements.map((e) => (
            <li key={e.id}>
              {LIBELLE_EVENEMENT[e.type]}
              {e.date && ` le ${e.date}`}
              {e.lieu && ` — ${e.lieu}`}
            </li>
          ))}
        </ul>
      )}

      {foyer.enfants.length > 0 && (
        <>
          <p className="imprimer-sous-titre">Enfants</p>
          <ListePersonnes
            personnes={foyer.enfants.map((e) => e.personne)}
            mentions={foyer.enfants.map((e) => e.nature)}
          />
        </>
      )}

      {foyer.notes && <p className="imprimer-notes-libres">{foyer.notes}</p>}
    </div>
  );
}

function BlocNotes({ notes }: { notes: string | null }) {
  if (!notes || notes.trim() === '') return null;
  return (
    <Bloc titre="Notes d’enquête">
      <div className="imprimer-notes-libres">{notes}</div>
    </Bloc>
  );
}

function BlocFaits({ faits }: { faits: FaitFiche[] }) {
  if (faits.length === 0) return null;
  return (
    <Bloc titre="Ce que l’Histoire lui a fait traverser">
      <ul className="imprimer-faits">
        {faits.map((f) => (
          <li key={f.id} className="imprimer-fait">
            <div className="imprimer-fait-tete">
              <span className="imprimer-fait-titre">{f.titre}</span>
              <span className="imprimer-fait-periode">{f.periode}</span>
            </div>
            <p className="imprimer-fait-portee">{LIBELLE_PORTEE[f.portee]}</p>
            {f.resume && <p className="imprimer-fait-resume">{f.resume}</p>}
            {f.incidence && <p className="imprimer-fait-incidence">{f.incidence}</p>}
          </li>
        ))}
      </ul>
    </Bloc>
  );
}

// ---------------------------------------------------------------------------
// Petits composants partagés
// ---------------------------------------------------------------------------

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="imprimer-bloc">
      <h2 className="imprimer-bloc-titre">{titre}</h2>
      {children}
    </section>
  );
}

function ListePersonnes({
  personnes,
  mentions,
}: {
  personnes: LienPersonne[];
  mentions?: (string | null)[];
}) {
  return (
    <ul className="imprimer-personnes">
      {personnes.map((p, i) => {
        const mention = mentions?.[i] ?? null;
        return (
          <li key={p.id}>
            <span className="imprimer-personne-nom">{p.nomComplet}</span>
            {p.surnom && <span className="imprimer-personne-surnom"> «&nbsp;{p.surnom}&nbsp;»</span>}
            {(p.annees || mention) && (
              <span className="imprimer-personne-annees">
                {' — '}
                {[mention, p.annees].filter(Boolean).join(' · ')}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ListeFratrie({ fratrie }: { fratrie: MembreFratrie[] }) {
  return (
    <ul className="imprimer-personnes">
      {fratrie.map((f) => {
        const demi = f.demi ? motDemi(f.personne) : null;
        return (
          <li key={f.personne.id}>
            <span className="imprimer-personne-nom">{f.personne.nomComplet}</span>
            {(f.personne.annees || demi) && (
              <span className="imprimer-personne-annees">
                {' — '}
                {[demi, f.personne.annees].filter(Boolean).join(' · ')}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function motDemi(personne: LienPersonne): string {
  if (personne.sexe === 'F') return 'demi-sœur';
  if (personne.sexe === 'M') return 'demi-frère';
  return 'demi-fratrie';
}

function titreEvenement(e: EvenementFiche): string {
  if (e.type === 'autre' && e.libelle) return e.libelle;
  return LIBELLE_EVENEMENT[e.type];
}

function assembler(morceaux: (string | null | undefined)[]): string {
  return morceaux.filter((m): m is string => Boolean(m && m.trim() !== '')).join(' — ');
}

function resumerVie(fiche: Fiche): string | null {
  const debut = fiche.naissance?.annee ? String(fiche.naissance.annee) : null;
  const fin = fiche.deces?.annee ? String(fiche.deces.annee) : null;
  if (debut && fin) return `${debut} – ${fin}`;
  if (debut) return `${accorder(fiche.personne.sexe, 'né')} en ${debut}`;
  if (fin) return `${accorder(fiche.personne.sexe, 'mort')} en ${fin}`;
  return null;
}

// ---------------------------------------------------------------------------
// Feuille de style de la page imprimable
// ---------------------------------------------------------------------------

// Encapsulée en `<style>` pour ne pas peser sur le CSS global : cette page est
// consultée à l’occasion, aucune raison d’allonger la feuille commune. Les
// couleurs sont fixées ici à dessein — la page imite un feuillet, pas
// l’application.
const stylesImprimables = `
  .imprimer-racine {
    background: #ffffff;
    color: #111111;
    min-height: 100vh;
    font-family: var(--font-sans);
    padding: 2rem 1.5rem 3rem;
  }

  .imprimer-barre-outils {
    max-width: 21cm;
    margin: 0 auto 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .imprimer-lien-retour {
    color: #4a4a4a;
    text-decoration: underline;
    text-decoration-color: #cccccc;
    text-underline-offset: 3px;
    font-size: 0.9rem;
  }

  .imprimer-bouton {
    background: #111111;
    color: #ffffff;
    border: 1px solid #111111;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .imprimer-page {
    max-width: 21cm;
    min-height: 27cm;
    margin: 0 auto;
    background: #ffffff;
    color: #111111;
    padding: 2cm 2cm 1.5cm;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06);
    box-sizing: border-box;
    line-height: 1.5;
  }

  .imprimer-entete {
    border-bottom: 1px solid #111111;
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }
  .imprimer-surtitre {
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #555555;
    margin: 0 0 0.35rem;
  }
  .imprimer-titre {
    font-family: var(--font-titre);
    font-size: 1.8rem;
    line-height: 1.15;
    margin: 0;
    letter-spacing: -0.015em;
  }
  .imprimer-vie {
    margin: 0.35rem 0 0;
    font-size: 1rem;
    color: #333333;
  }
  .imprimer-surnom {
    margin: 0.25rem 0 0;
    font-style: italic;
    color: #444444;
  }

  .imprimer-colonnes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.75rem;
  }
  .imprimer-colonne {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 0;
  }

  .imprimer-bloc {
    break-inside: avoid;
  }
  .imprimer-bloc-titre {
    font-family: var(--font-titre);
    font-size: 1.05rem;
    margin: 0 0 0.6rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid #999999;
    letter-spacing: -0.005em;
  }

  .imprimer-rien {
    font-size: 0.85rem;
    color: #666666;
    font-style: italic;
    margin: 0;
  }

  .imprimer-liste-def {
    margin: 0;
    font-size: 0.85rem;
  }
  .imprimer-ligne-def {
    display: grid;
    grid-template-columns: 7.5rem 1fr;
    gap: 0.5rem;
    padding: 0.15rem 0;
  }
  .imprimer-ligne-def dt {
    color: #555555;
    font-weight: 500;
  }
  .imprimer-ligne-def dd {
    margin: 0;
    color: #111111;
  }

  .imprimer-vie-liste {
    list-style: none;
    padding: 0;
    margin: 0;
    border-left: 1px solid #cccccc;
  }
  .imprimer-vie-ligne {
    padding: 0 0 0.9rem 0.75rem;
    break-inside: avoid;
  }
  .imprimer-vie-ligne:last-child { padding-bottom: 0; }
  .imprimer-vie-tete {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
  }
  .imprimer-vie-titre {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .imprimer-vie-date {
    font-size: 0.8rem;
    color: #444444;
  }
  .imprimer-vie-detail,
  .imprimer-vie-lieu,
  .imprimer-vie-notes {
    margin: 0.15rem 0 0;
    font-size: 0.82rem;
    color: #333333;
    white-space: pre-line;
  }
  .imprimer-vie-lieu { color: #555555; }
  .imprimer-vie-notes { color: #444444; font-style: italic; }

  .imprimer-sources {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .imprimer-source {
    border: 1px solid #dddddd;
    padding: 0.6rem 0.75rem;
    break-inside: avoid;
  }
  .imprimer-source-rattachement {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666666;
    margin: 0 0 0.15rem;
  }
  .imprimer-source-titre {
    font-weight: 600;
    font-size: 0.9rem;
    margin: 0;
  }
  .imprimer-source-reference {
    font-size: 0.8rem;
    color: #444444;
    margin: 0.2rem 0 0;
  }
  .imprimer-source-url {
    font-size: 0.75rem;
    color: #555555;
    word-break: break-all;
    margin: 0.2rem 0 0;
    font-family: ui-monospace, monospace;
  }
  .imprimer-source-texte {
    margin: 0.5rem 0 0;
    padding: 0.4rem 0.6rem;
    border-left: 2px solid #999999;
    background: #f5f5f5;
    font-family: var(--font-titre);
    font-size: 0.85rem;
    line-height: 1.55;
    white-space: pre-line;
  }

  .imprimer-groupe {
    margin-bottom: 1rem;
    break-inside: avoid;
  }
  .imprimer-groupe:last-child { margin-bottom: 0; }
  .imprimer-groupe-titre {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 0.35rem;
    color: #222222;
  }
  .imprimer-sous-titre {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666666;
    margin: 0.5rem 0 0.25rem;
  }

  .imprimer-personnes {
    list-style: disc inside;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
  }
  .imprimer-personnes li {
    padding: 0.1rem 0;
  }
  .imprimer-personne-nom { font-weight: 500; }
  .imprimer-personne-surnom { color: #555555; font-style: italic; }
  .imprimer-personne-annees { color: #555555; font-size: 0.8rem; }

  .imprimer-liste-simple {
    list-style: none;
    padding: 0;
    margin: 0.25rem 0 0;
    font-size: 0.82rem;
    color: #333333;
  }

  .imprimer-notes-libres {
    font-size: 0.85rem;
    line-height: 1.55;
    color: #333333;
    white-space: pre-line;
    margin: 0.35rem 0 0;
  }

  .imprimer-faits {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .imprimer-fait { break-inside: avoid; }
  .imprimer-fait-tete {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
  }
  .imprimer-fait-titre { font-weight: 600; font-size: 0.9rem; }
  .imprimer-fait-periode { font-size: 0.8rem; color: #555555; }
  .imprimer-fait-portee {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #666666;
    margin: 0.1rem 0 0;
  }
  .imprimer-fait-resume {
    font-size: 0.82rem;
    color: #333333;
    margin: 0.3rem 0 0;
  }
  .imprimer-fait-incidence {
    font-size: 0.82rem;
    color: #222222;
    border-left: 2px solid #555555;
    padding: 0.2rem 0 0.2rem 0.6rem;
    margin: 0.35rem 0 0;
  }

  .imprimer-pied {
    margin-top: 2rem;
    padding-top: 0.75rem;
    border-top: 1px solid #cccccc;
    font-size: 0.75rem;
    color: #666666;
    text-align: center;
  }

  /* Impression : noir sur blanc, aucun outil, sauts de page propres. */
  @media print {
    @page { size: A4; margin: 1.5cm; }
    html, body { background: #ffffff !important; }
    body > *:not(.imprimer-racine) { display: none !important; }
    .imprimer-racine { padding: 0 !important; background: #ffffff !important; }
    .imprimer-page {
      box-shadow: none !important;
      max-width: none !important;
      min-height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .no-imprimer { display: none !important; }
    .imprimer-titre { font-size: 1.6rem; }
    .imprimer-bloc-titre { font-size: 1rem; }
    .imprimer-bloc { break-inside: avoid; page-break-inside: avoid; }
    .imprimer-vie-ligne,
    .imprimer-source,
    .imprimer-fait,
    .imprimer-groupe {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    /* Économiser l’encre : pas de couleurs de fond hors les cadres essentiels. */
    .imprimer-source-texte { background: transparent !important; }
    .imprimer-source { border-color: #000000 !important; }
    .imprimer-bloc-titre { border-color: #000000 !important; }
  }
`;
