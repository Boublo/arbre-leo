import type { DonneesArbre, PersonneArbre } from '@/lib/arbre';
import { anneesDeVie } from '@/lib/arbre-graphe';
import { TON_COTE } from '@/lib/branches';
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

/** Couleurs fixes pour l'impression (pas de variables CSS de l'app). */
const IMP = {
  trait: '#333333',
  traitDoux: '#666666',
  or: '#7a5c10',
  texte: '#111111',
  texteDoux: '#555555',
  fond: '#ffffff',
  fondFocus: '#f0f0f0',
  bordureFocus: '#000000',
  bordure: '#888888',
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
};

/**
 * Arbre généalogique statique pour l'impression.
 *
 * Réutilise le même layout et la même géométrie de liens que la vue interactive,
 * mais en SVG serveur, noir sur blanc, sans zoom ni interactions.
 */
export function ArbreImprimable({ donnees, racineId, mode }: Props) {
  const disposition = disposerArbre(donnees, racineId, mode);
  const focus = donnees.personnes.get(racineId);
  if (!focus || disposition.noeuds.length === 0) {
    return <p className="arbre-impr-rien">Aucune personne à afficher pour cette vue.</p>;
  }

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

  const repères = repèresRang(disposition, focus.prenoms ?? focus.nomComplet.split(' ')[0] ?? '');

  return (
    <figure className="arbre-impr-figure">
      <svg
        viewBox={`${minX} ${minY} ${viewW} ${viewH}`}
        className="arbre-impr-svg"
        role="img"
        aria-label={`Arbre généalogique — ${LIBELLE_MODE[mode].titre} — ${focus.nomComplet}`}
      >
        <defs>
          <filter id="ombre-impr" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Repères de génération */}
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

        {/* Liens familiaux */}
        <g fill="none">
          {segments.map((s) => (
            <SegmentImprimable key={s.id} segment={s} />
          ))}
        </g>

        {/* Cartes */}
        {disposition.noeuds.map((noeud) => {
          const personne = donnees.personnes.get(noeud.personneId);
          if (!personne) return null;
          return (
            <CarteImprimable
              key={noeud.personneId}
              noeud={noeud}
              personne={personne}
              estFocus={noeud.personneId === racineId}
            />
          );
        })}
      </svg>
      <figcaption className="arbre-impr-legende">
        <span>Ligne paternelle</span>
        <span>Ligne maternelle</span>
        <span>Union (barre dorée)</span>
      </figcaption>
    </figure>
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
}: {
  noeud: NoeudArbre;
  personne: PersonneArbre;
  estFocus: boolean;
}) {
  const couleurs = COULEUR_COTE_IMP[noeud.cote];
  const vie = anneesDeVie(personne);
  const initiale = (personne.nomComplet.trim().charAt(0) || '?').toUpperCase();
  const texteX = LARGEUR_PHOTO_NOEUD + 10;
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
        filter="url(#ombre-impr)"
      />

      {/* Bandeau photo ou initiale */}
      <g clipPath={`url(#clip-impr-${personne.id})`}>
        <defs>
          <clipPath id={`clip-impr-${personne.id}`}>
            <rect width={LARGEUR_PHOTO_NOEUD} height={HAUTEUR_NOEUD} rx={RAYON_NOEUD} />
          </clipPath>
        </defs>
        <rect width={LARGEUR_PHOTO_NOEUD} height={HAUTEUR_NOEUD} fill={couleurs.fond} />
        {personne.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- SVG image pour impression
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

      <line
        x1={LARGEUR_PHOTO_NOEUD}
        y1={8}
        x2={LARGEUR_PHOTO_NOEUD}
        y2={HAUTEUR_NOEUD - 8}
        stroke={couleurs.trait}
        strokeWidth={0.75}
        opacity={0.4}
      />

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
        <text
          x={texteX}
          y={personne.surnom ? 52 : 44}
          fill={IMP.texteDoux}
          fontSize={11}
        >
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
