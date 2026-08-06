import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import { anneesDeVie } from '@/lib/arbre-graphe';
import { TON_COTE } from '@/lib/branches';
import {
  compterPersonnes,
  decouperDispositionParPages,
  filtrerDisposition,
  listePersonnesOrdonnee,
  type OptionsImpressionArbre,
  type TrancheImpression,
} from '@/lib/arbre-impression';
import { planifierLiens, type SegmentLien } from '@/lib/geometrie-liens';
import {
  disposerArbre,
  ESPACEMENT_Y,
  HAUTEUR_NOEUD,
  LARGEUR_NOEUD,
  LARGEUR_PHOTO_NOEUD,
  LIBELLE_MODE,
  nommerRang,
  RAYON_NOEUD,
  type Disposition,
  type ModeArbre,
  type NoeudArbre,
} from '@/lib/layout-arbre';

const IMP = {
  trait: '#333333',
  traitDoux: '#666666',
  or: '#7a5c10',
  texte: '#111111',
  texteDoux: '#555555',
  fond: '#ffffff',
  fondFocus: '#f0f0f0',
  bordureFocus: '#000000',
  paternelle: '#2c5f8a',
  maternelle: '#7a3d6b',
  commune: '#555555',
} as const;

const COULEUR_COTE_IMP = {
  paternelle: { trait: IMP.paternelle, fond: '#e8f0f8' },
  maternelle: { trait: IMP.maternelle, fond: '#f5e8f0' },
  commune: { trait: IMP.commune, fond: '#f5f5f5' },
} as const;

type Props = {
  donnees: DonneesArbre;
  racineId: string;
  mode: ModeArbre;
  options: OptionsImpressionArbre;
};

export function ArbreImprimable({ donnees, racineId, mode, options }: Props) {
  const brute = disposerArbre(donnees, racineId, mode);
  const disposition = filtrerDisposition(brute, options.profondeur, racineId);
  const focus = donnees.personnes.get(racineId);

  if (!focus || disposition.noeuds.length === 0) {
    return <p className="arbre-impr-rien">Aucune personne à afficher pour cette vue.</p>;
  }

  const tranches =
    options.decoupage === 'pages'
      ? decouperDispositionParPages(disposition)
      : [{ disposition, libelle: '', index: 0, total: 1 } satisfies TrancheImpression];

  const nbPersonnes = compterPersonnes(disposition);
  const noms = new Map(
    disposition.noeuds.map((n) => {
      const p = donnees.personnes.get(n.personneId);
      return [n.personneId, p?.nomComplet ?? 'Sans nom'] as const;
    })
  );
  const liste = listePersonnesOrdonnee(disposition.noeuds, noms);
  const prenomFocus = focus.prenoms ?? focus.nomComplet.split(' ')[0] ?? '';

  return (
    <>
      <p className="arbre-impr-stats">
        {nbPersonnes} personne{nbPersonnes > 1 ? 's' : ''} · {disposition.rangMax + 1} rang
        {disposition.rangMax > 0 ? 's' : ''} · {LIBELLE_MODE[mode].titre}
        {options.profondeur !== 'tout' ? ` · ${options.profondeur} générations max` : ''}
        {tranches.length > 1 ? ` · ${tranches.length} pages` : ''}
      </p>

      {tranches.map((tranche) => (
        <figure
          key={tranche.index}
          className={`arbre-impr-figure${tranche.index > 0 ? ' arbre-impr-figure-page' : ''}`}
        >
          {tranche.libelle && (
            <p className="arbre-impr-tranche-titre">
              {tranche.libelle}
              {tranche.total > 1 && (
                <span className="arbre-impr-tranche-num">
                  {' '}
                  — page {tranche.index + 1}/{tranche.total}
                </span>
              )}
            </p>
          )}
          <SvgArbrePage
            donnees={donnees}
            disposition={tranche.disposition}
            racineId={racineId}
            mode={mode}
            focus={focus}
            prenomFocus={prenomFocus}
            options={options}
            idSuffix={tranche.index > 0 ? `-${tranche.index}` : ''}
          />
          {tranche.index === tranches.length - 1 && (
            <figcaption className="arbre-impr-legende">
              <span>Ligne paternelle</span>
              <span>Ligne maternelle</span>
              <span>Union (barre dorée)</span>
              <span className="arbre-impr-legende-focus">Personne choisie (cadre épais)</span>
            </figcaption>
          )}
        </figure>
      ))}

      {liste.length > 12 && (
        <section className="arbre-impr-liste">
          <h2 className="arbre-impr-liste-titre">Liste des personnes ({liste.length})</h2>
          <p className="arbre-impr-liste-aide">
            Index alphabétique pour retrouver un nom lorsque le schéma est imprimé en petit.
          </p>
          <ol className="arbre-impr-liste-colonnes">
            {liste.map((p) => (
              <li key={p.id}>
                <span className="arbre-impr-liste-nom">{p.nom}</span>
                {p.id === racineId && <span className="arbre-impr-liste-focus"> (choisie)</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function SvgArbrePage({
  donnees,
  disposition,
  racineId,
  mode,
  focus,
  prenomFocus,
  options,
  idSuffix,
}: {
  donnees: DonneesArbre;
  disposition: Disposition;
  racineId: string;
  mode: ModeArbre;
  focus: PersonneArbre;
  prenomFocus: string;
  options: OptionsImpressionArbre;
  idSuffix: string;
}) {
  const noeudParId = new Map(disposition.noeuds.map((n) => [n.personneId, n]));
  const { segments } = planifierLiens(
    donnees,
    disposition.liens,
    noeudParId,
    disposition.mode
  );

  const padding = 48;
  const margeGauche = 120;
  const xs = disposition.noeuds.map((n) => n.x);
  const ys = disposition.noeuds.map((n) => n.y);
  const minX = Math.min(...xs) - LARGEUR_NOEUD / 2 - padding - margeGauche;
  const maxX = Math.max(...xs) + LARGEUR_NOEUD / 2 + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + HAUTEUR_NOEUD + padding;
  const viewW = maxX - minX;
  const viewH = maxY - minY;

  const repères = repèresRang(disposition, prenomFocus);
  const ombreId = `ombre-impr${idSuffix}`;

  return (
    <svg
      viewBox={`${minX} ${minY} ${viewW} ${viewH}`}
      className="arbre-impr-svg"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Arbre — ${LIBELLE_MODE[mode].titre} — ${focus.nomComplet}`}
    >
      <defs>
        <filter id={ombreId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
        </filter>
        {options.avecPhotos &&
          disposition.noeuds.map((n) => (
            <clipPath key={n.personneId} id={`clip-impr-${n.personneId}${idSuffix}`}>
              <rect width={LARGEUR_PHOTO_NOEUD} height={HAUTEUR_NOEUD} rx={RAYON_NOEUD} />
            </clipPath>
          ))}
      </defs>

      <g className="arbre-impr-reperes" aria-hidden>
        {repères.map((r) => (
          <text
            key={r.rang}
            x={minX + 12}
            y={r.y}
            textAnchor="start"
            dominantBaseline="middle"
            fill={IMP.texteDoux}
            fontSize={11}
            fontFamily="Georgia, 'Times New Roman', serif"
          >
            {r.libelle}
          </text>
        ))}
      </g>

      <g fill="none">
        {segments.map((s) => (
          <SegmentImprimable key={s.id} segment={s} />
        ))}
      </g>

      {disposition.noeuds.map((noeud) => {
        const personne = donnees.personnes.get(noeud.personneId);
        if (!personne) return null;
        return (
          <CarteImprimable
            key={noeud.personneId}
            noeud={noeud}
            personne={personne}
            estFocus={noeud.personneId === racineId}
            avecPhotos={options.avecPhotos}
            clipSuffix={idSuffix}
            ombreId={ombreId}
          />
        );
      })}
    </svg>
  );
}

function SegmentImprimable({ segment }: { segment: SegmentLien }) {
  const stroke = couleurImpression(segment.stroke);
  const props = {
    stroke,
    strokeWidth: segment.strokeWidth,
    strokeDasharray: segment.strokeDasharray,
    opacity: segment.opacity,
    strokeLinecap: 'round' as const,
  };

  if (segment.kind === 'path') {
    return <path d={segment.d} fill="none" {...props} />;
  }

  return (
    <line
      x1={segment.x1}
      y1={segment.y1}
      x2={segment.x2}
      y2={segment.y2}
      {...props}
      strokeLinecap="square"
    />
  );
}

function CarteImprimable({
  noeud,
  personne,
  estFocus,
  avecPhotos,
  clipSuffix,
  ombreId,
}: {
  noeud: NoeudArbre;
  personne: PersonneArbre;
  estFocus: boolean;
  avecPhotos: boolean;
  clipSuffix: string;
  ombreId: string;
}) {
  const couleurs = COULEUR_COTE_IMP[noeud.cote];
  const vie = anneesDeVie(personne);
  const initiale = (personne.nomComplet.trim().charAt(0) || '?').toUpperCase();
  const texteX = avecPhotos ? LARGEUR_PHOTO_NOEUD + 10 : 10;
  const x = noeud.x - LARGEUR_NOEUD / 2;
  const y = noeud.y;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={LARGEUR_NOEUD}
        height={HAUTEUR_NOEUD}
        rx={RAYON_NOEUD}
        fill={estFocus ? IMP.fondFocus : IMP.fond}
        stroke={estFocus ? IMP.bordureFocus : couleurs.trait}
        strokeWidth={estFocus ? 2.5 : 1}
        filter={`url(#${ombreId})`}
      />

      {avecPhotos && (
        <g clipPath={`url(#clip-impr-${personne.id}${clipSuffix})`}>
          <rect width={LARGEUR_PHOTO_NOEUD} height={HAUTEUR_NOEUD} fill={couleurs.fond} />
          {personne.photoUrl ? (
            <image
              href={personne.photoUrl}
              x={0}
              y={0}
              width={LARGEUR_PHOTO_NOEUD}
              height={HAUTEUR_NOEUD}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <text
              x={LARGEUR_PHOTO_NOEUD / 2}
              y={HAUTEUR_NOEUD / 2 + 6}
              textAnchor="middle"
              fill={IMP.texteDoux}
              fontSize={22}
              fontWeight={600}
              fontFamily="Georgia, 'Times New Roman', serif"
            >
              {initiale}
            </text>
          )}
          <rect x={0} y={0} width={3} height={HAUTEUR_NOEUD} fill={TON_COTE[noeud.cote]} />
        </g>
      )}

      {!avecPhotos && (
        <rect x={0} y={0} width={4} height={HAUTEUR_NOEUD} fill={TON_COTE[noeud.cote]} rx={2} />
      )}

      {avecPhotos && (
        <line
          x1={LARGEUR_PHOTO_NOEUD}
          y1={8}
          x2={LARGEUR_PHOTO_NOEUD}
          y2={HAUTEUR_NOEUD - 8}
          stroke={couleurs.trait}
          strokeWidth={0.75}
          opacity={0.4}
        />
      )}

      <text
        x={texteX}
        y={personne.surnom ? 22 : 28}
        fill={IMP.texte}
        fontSize={13}
        fontWeight={600}
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        {tronquer(personne.nomComplet, 22)}
      </text>

      {personne.surnom && (
        <text x={texteX} y={36} fill={IMP.texteDoux} fontSize={10} fontStyle="italic">
          {personne.sexe === 'F' ? 'dite' : 'dit'} {tronquer(personne.surnom, 18)}
        </text>
      )}

      {vie && (
        <text x={texteX} y={personne.surnom ? 52 : 44} fill={IMP.texteDoux} fontSize={11}>
          {vie}
        </text>
      )}

      {personne.profession && (
        <text
          x={texteX}
          y={personne.surnom ? (vie ? 66 : 52) : vie ? 58 : 50}
          fill={IMP.texteDoux}
          fontSize={9.5}
        >
          {tronquer(personne.profession, 24)}
        </text>
      )}
    </g>
  );
}

function repèresRang(disposition: Disposition, prenomFocus: string) {
  const result: { rang: number; y: number; libelle: string }[] = [];
  for (let rang = 0; rang <= disposition.rangMax; rang++) {
    if (!disposition.noeuds.some((n) => n.rang === rang)) continue;
    result.push({
      rang,
      y: rang * ESPACEMENT_Y + HAUTEUR_NOEUD / 2,
      libelle: nommerRang(rang, disposition.mode, prenomFocus, disposition.rangRacine),
    });
  }
  return result;
}

function couleurImpression(stroke: string): string {
  if (stroke.includes('--or')) return IMP.or;
  if (stroke.includes('--encre-douce')) return IMP.traitDoux;
  return IMP.trait;
}

function tronquer(texte: string, max: number): string {
  return texte.length <= max ? texte : `${texte.slice(0, max - 1)}…`;
}
