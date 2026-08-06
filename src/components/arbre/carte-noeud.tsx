'use client';

import type { PersonneArbre } from '@/lib/arbre';
import { anneesDeVie } from '@/lib/arbre-graphe';
import { LIBELLE_COTE, TON_COTE } from '@/lib/branches';
import { iconesPour, IconeSvg } from '@/components/arbre/icones-richesse';
import {
  HAUTEUR_NOEUD,
  LARGEUR_NOEUD,
  LARGEUR_PHOTO_NOEUD,
  RAYON_NOEUD,
  type LienRacine,
  type NoeudArbre,
} from '@/lib/layout-arbre';

const COULEUR_COTE = {
  paternelle: { trait: 'var(--paternelle)', fond: 'var(--paternelle-douce)' },
  maternelle: { trait: 'var(--maternelle)', fond: 'var(--maternelle-douce)' },
  commune: { trait: 'var(--commune)', fond: 'var(--fond-doux)' },
} as const;

const LIBELLE_LIEN: Partial<Record<LienRacine, string>> = {
  collateral: 'Frère ou sœur',
  cousin: 'Cousin ou cousine',
  conjoint: 'Conjoint',
  ancetre: 'Ancêtre',
  descendant: 'Descendant',
};

type Props = {
  noeud: NoeudArbre;
  personne: PersonneArbre;
  estFocus: boolean;
  selectionne: boolean;
  detaille: boolean;
  invitationGuide?: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onMenu: (evenement: React.MouseEvent) => void;
  onAjouterEnfant: (personne: PersonneArbre) => void;
};

/**
 * Carte SVG d'une personne dans l'arbre : bandeau photo à gauche, texte à droite.
 * Toujours une zone portrait (photo ou initiale), même en vue dézoomée.
 */
export function CarteNoeud({
  noeud,
  personne,
  estFocus,
  selectionne,
  detaille,
  invitationGuide = false,
  onClick,
  onDoubleClick,
  onMenu,
  onAjouterEnfant,
}: Props) {
  const couleurs = COULEUR_COTE[noeud.cote];
  const vie = anneesDeVie(personne);
  const icones = detaille ? iconesPour(personne) : [];
  const couleurIcone = estFocus ? 'var(--accent-contraste)' : 'var(--encre-douce)';
  const initiale = (personne.nomComplet.trim().charAt(0) || '?').toUpperCase();
  const texteX = LARGEUR_PHOTO_NOEUD + 10;
  const largeurTexte = LARGEUR_NOEUD - LARGEUR_PHOTO_NOEUD - 14;
  const libelle =
    `${personne.nomComplet}${vie ? `, ${vie}` : ''}` +
    (personne.profession ? `, ${personne.profession}` : '') +
    `. ${LIBELLE_COTE[noeud.cote]}.`;

  const metaLigne = [personne.profession, personne.naissance?.lieuCourt].filter(Boolean).join(' · ');

  return (
    <g
      transform={`translate(${noeud.x - LARGEUR_NOEUD / 2}, ${noeud.y})`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onMenu}
      className="cursor-pointer"
      role="button"
      tabIndex={estFocus || selectionne ? 0 : -1}
      aria-label={libelle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <title>
        {libelle}
        {noeud.lien !== 'racine' && LIBELLE_LIEN[noeud.lien] ? ` ${LIBELLE_LIEN[noeud.lien]}.` : ''}
      </title>

      {/* Ombre portée */}
      <rect
        width={LARGEUR_NOEUD}
        height={HAUTEUR_NOEUD}
        rx={RAYON_NOEUD}
        fill="transparent"
        transform="translate(0, 2)"
        filter="url(#ombre-noeud)"
      />

      {/* Corps de la carte */}
      <rect
        width={LARGEUR_NOEUD}
        height={HAUTEUR_NOEUD}
        rx={RAYON_NOEUD}
        fill={estFocus ? 'var(--accent)' : 'var(--fond-carte)'}
        stroke={selectionne ? 'var(--accent)' : estFocus ? 'var(--accent)' : couleurs.trait}
        strokeWidth={selectionne ? 3 : estFocus ? 2.5 : noeud.lien === 'conjoint' ? 1.5 : 1}
        strokeDasharray={noeud.lien === 'conjoint' ? '5 4' : undefined}
      />

      {invitationGuide && (
        <rect
          x={-4}
          y={-4}
          width={LARGEUR_NOEUD + 8}
          height={HAUTEUR_NOEUD + 8}
          rx={RAYON_NOEUD + 2}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={3}
          className="invitation-guide-noeud"
        />
      )}

      {/* Teinte de branche en fond doux (sauf focus) */}
      {!estFocus && (
        <rect
          x={LARGEUR_PHOTO_NOEUD}
          width={LARGEUR_NOEUD - LARGEUR_PHOTO_NOEUD}
          height={HAUTEUR_NOEUD}
          rx={RAYON_NOEUD}
          fill={couleurs.fond}
          opacity={0.55}
          clipPath={`url(#clip-corps-${personne.id})`}
        />
      )}

      {/* Bandeau photo */}
      <defs>
        <clipPath id={`clip-photo-${personne.id}`}>
          <rect x={0} y={0} width={LARGEUR_PHOTO_NOEUD} height={HAUTEUR_NOEUD} rx={RAYON_NOEUD} />
        </clipPath>
        <clipPath id={`clip-corps-${personne.id}`}>
          <rect
            x={LARGEUR_PHOTO_NOEUD}
            y={0}
            width={LARGEUR_NOEUD - LARGEUR_PHOTO_NOEUD}
            height={HAUTEUR_NOEUD}
            rx={RAYON_NOEUD}
          />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-photo-${personne.id})`}>
        <rect
          width={LARGEUR_PHOTO_NOEUD}
          height={HAUTEUR_NOEUD}
          fill={estFocus ? 'var(--accent-clair)' : couleurs.fond}
        />
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
            y={HAUTEUR_NOEUD / 2 + (detaille ? 6 : 4)}
            textAnchor="middle"
            className={estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-douce)]'}
            style={{ fontFamily: 'var(--font-titre)', fontSize: detaille ? 26 : 20, fontWeight: 600 }}
            opacity={0.85}
          >
            {initiale}
          </text>
        )}
        {/* Liseré de branche sur le portrait */}
        <rect
          x={0}
          y={0}
          width={3}
          height={HAUTEUR_NOEUD}
          fill={TON_COTE[noeud.cote]}
          opacity={estFocus ? 0.9 : 0.75}
        />
      </g>

      {/* Séparateur photo / texte */}
      <line
        x1={LARGEUR_PHOTO_NOEUD}
        y1={8}
        x2={LARGEUR_PHOTO_NOEUD}
        y2={HAUTEUR_NOEUD - 8}
        stroke={estFocus ? 'var(--accent-contraste)' : couleurs.trait}
        strokeWidth={1}
        opacity={0.25}
      />

      {/* Vivant : pastille verte sur le portrait */}
      {personne.presumeVivant && (
        <circle
          cx={LARGEUR_PHOTO_NOEUD - 6}
          cy={HAUTEUR_NOEUD - 8}
          r={5}
          fill="var(--succes)"
          stroke={estFocus ? 'var(--accent)' : 'var(--fond-carte)'}
          strokeWidth={1.5}
        />
      )}

      {/* Fratrie / cousin : pastille pour ne pas confondre avec un conjoint (pointillé). */}
      {detaille && (noeud.lien === 'collateral' || noeud.lien === 'cousin') && !estFocus && (
        <PastilleLien
          libelle={noeud.lien === 'collateral' ? 'FRATRIE' : 'COUSIN'}
          couleurTrait={couleurs.trait}
        />
      )}

      {/* Nom — toujours visible */}
      <text
        x={texteX}
        y={detaille ? (personne.surnom ? 20 : 22) : HAUTEUR_NOEUD / 2 + 5}
        textAnchor="start"
        className={estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre)]'}
        style={{ fontFamily: 'var(--font-titre)', fontSize: detaille ? 15 : 13, fontWeight: 600 }}
      >
        {tronquer(personne.nomComplet, detaille ? 22 : 18, largeurTexte)}
      </text>

      {detaille && (
        <>
          {personne.surnom && (
            <text
              x={texteX}
              y={34}
              textAnchor="start"
              className={estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-douce)]'}
              style={{ fontSize: 10.5, fontStyle: 'italic' }}
              opacity={0.92}
            >
              {personne.sexe === 'F' ? 'dite' : 'dit'}{' '}
              {tronquer(personne.surnom, 20, largeurTexte)}
            </text>
          )}

          {vie && (
            <text
              x={texteX}
              y={personne.surnom ? 48 : 40}
              textAnchor="start"
              className={estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-douce)]'}
              style={{ fontSize: 11.5 }}
              opacity={0.92}
            >
              {vie}
            </text>
          )}

          {metaLigne && (
            <text
              x={texteX}
              y={personne.surnom ? (vie ? 62 : 48) : vie ? 54 : 40}
              textAnchor="start"
              className={
                estFocus ? 'fill-[var(--accent-contraste)]' : 'fill-[var(--encre-tres-douce)]'
              }
              style={{ fontSize: 10 }}
              opacity={0.88}
            >
              {tronquer(metaLigne, 28, largeurTexte)}
            </text>
          )}

          {icones.length > 0 && (
            <g>
              {icones.map((type, index) => (
                <IconeSvg
                  key={type}
                  type={type}
                  x={LARGEUR_NOEUD - 10 - index * 13}
                  y={HAUTEUR_NOEUD - 10}
                  couleur={couleurIcone}
                />
              ))}
            </g>
          )}

          {personne.descendanceIncomplete && (
            <IndicateurDescendance
              personne={personne}
              estFocus={estFocus}
              onAjouterEnfant={onAjouterEnfant}
            />
          )}
        </>
      )}
    </g>
  );
}

function PastilleLien({ libelle, couleurTrait }: { libelle: string; couleurTrait: string }) {
  const largeur = libelle.length > 6 ? 52 : 46;
  return (
    <g aria-hidden>
      <rect
        x={LARGEUR_NOEUD - largeur - 6}
        y={6}
        width={largeur}
        height={14}
        rx={7}
        fill="var(--fond-carte)"
        stroke={couleurTrait}
        strokeWidth={0.75}
        opacity={0.95}
      />
      <text
        x={LARGEUR_NOEUD - largeur / 2 - 6}
        y={16}
        textAnchor="middle"
        className="fill-[var(--encre-douce)]"
        style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.02em' }}
      >
        {libelle}
      </text>
    </g>
  );
}

function IndicateurDescendance({
  personne,
  estFocus,
  onAjouterEnfant,
}: {
  personne: PersonneArbre;
  estFocus: boolean;
  onAjouterEnfant: (personne: PersonneArbre) => void;
}) {
  const cx = LARGEUR_NOEUD - 4;
  const cy = HAUTEUR_NOEUD - 4;
  const rayon = 8;
  const traitTeinte = estFocus ? 'var(--accent-contraste)' : 'var(--encre-douce)';
  const fondTeinte = estFocus ? 'var(--accent)' : 'var(--fond-carte)';
  const libelle = 'Descendance à compléter ? Ajouter un enfant';

  return (
    <g
      className="cursor-pointer"
      role="button"
      aria-label={libelle}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onAjouterEnfant(personne);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onAjouterEnfant(personne);
        }
      }}
    >
      <title>{libelle}</title>
      <circle
        cx={cx}
        cy={cy}
        r={rayon}
        fill={fondTeinte}
        stroke={traitTeinte}
        strokeWidth={1}
        opacity={0.95}
      />
      <path
        d={`M ${cx - 3} ${cy - 1.5} L ${cx} ${cy + 1.5} L ${cx + 3} ${cy - 1.5}`}
        fill="none"
        stroke={traitTeinte}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Tronque en caractères avec une estimation grossière de la largeur SVG. */
function tronquer(texte: string, maxChars: number, _largeurPx?: number) {
  return texte.length <= maxChars ? texte : `${texte.slice(0, maxChars - 1)}…`;
}
