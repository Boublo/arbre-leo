'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bloc, CaseACocher, Selecteur } from '@/components/saisie/champs-saisie';
import { ChoixPersonne, ChoixPersonnesMultiple } from '@/components/saisie/choix-personne';
import { NATURES_FILIATION } from '@/lib/saisie-personne';
import type { LiensExistants, OptionPersonne, OptionUnion } from '@/components/saisie/donnees';

/**
 * Rattacher quelqu’un à sa famille.
 *
 * C’est le point délicat de toute saisie généalogique : la base ne connaît ni
 * « père » ni « frère », elle connaît des unions et des filiations. Un enfant
 * n’est donc pas relié à deux personnes, mais à l’union qui les joint — et
 * cette union, si elle n’existe pas encore, doit être créée au passage.
 *
 * Trois gestes sont proposés, dans l’ordre où ils viennent à l’esprit :
 * rattacher la personne à ses parents, lui donner un conjoint, lui déclarer des
 * enfants déjà présents dans l’arbre. Chacun est facultatif ; on peut enregistrer
 * quelqu’un sans le relier à rien et y revenir plus tard.
 */
export function Rattachement({
  personnes,
  unions,
  valeurs,
  soiMeme,
  liens,
}: {
  personnes: OptionPersonne[];
  unions: OptionUnion[];
  valeurs: {
    unionParents: string;
    pereId: string;
    mereId: string;
    natureFiliation: string;
    conjointId: string;
    enfants: string[];
  };
  /** La personne modifiée : elle ne peut être ni son propre parent ni son propre conjoint. */
  soiMeme: string | null;
  liens?: LiensExistants;
}) {
  const [modeUnion, setModeUnion] = useState(Boolean(valeurs.unionParents));
  const [pereId, setPereId] = useState(valeurs.pereId);
  const [mereId, setMereId] = useState(valeurs.mereId);
  const [conjointId, setConjointId] = useState(valeurs.conjointId);
  const [unionParents, setUnionParents] = useState(valeurs.unionParents);
  const [enfants, setEnfants] = useState(valeurs.enfants);

  const moi = soiMeme ? [soiMeme] : [];

  return (
    <div className="flex flex-col gap-6">
      <ApercuRattachement
        personnes={personnes}
        unions={unions}
        modeUnion={modeUnion}
        unionParents={unionParents}
        pereId={pereId}
        mereId={mereId}
        conjointId={conjointId}
        enfants={enfants}
      />
      <Bloc
        id="parents"
        legende="Ses parents"
        aide="Facultatif. Choisissez une union déjà enregistrée, ou désignez un père et une mère : l’union sera créée si elle manque."
      >
        {liens && liens.parents.length > 0 && (
          <DejaLa titre="Parents déjà enregistrés" personnes={liens.parents} />
        )}

        {liens && liens.parents.length > 0 && (
          <CaseACocher
            name="detacherParents"
            label="Retirer le rattachement aux parents enregistrés"
            aide="À cocher seulement si cette personne n’est plus rattachée à ce couple. Sinon, laissez décoché : les parents restent inchangés même si les champs ci-dessus sont vides."
          />
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-encre">Comment les désigner</legend>
          <Choix
            nom="modeParents"
            valeur="personnes"
            coche={!modeUnion}
            onChoix={() => setModeUnion(false)}
            libelle="Désigner un père et une mère"
          />
          <Choix
            nom="modeParents"
            valeur="union"
            coche={modeUnion}
            onChoix={() => setModeUnion(true)}
            libelle="Choisir une union déjà enregistrée"
          />
        </fieldset>

        {modeUnion ? (
          <Selecteur
            label="Union des parents"
            name="unionParents"
            value={unionParents}
            onChange={(event) => setUnionParents(event.target.value)}
            aide={
              unions.length === 0
                ? 'Aucune union n’est encore enregistrée dans l’arbre.'
                : 'Les unions portent les années de vie de chaque conjoint : deux homonymes ne s’y confondent pas.'
            }
          >
            <option value="">Aucune pour l’instant</option>
            {unions.map((union) => (
              <option key={union.id} value={union.id}>
                {union.libelle}
              </option>
            ))}
          </Selecteur>
        ) : (
          <div className="flex flex-col gap-5">
            <ChoixPersonne
              nom="pereId"
              label="Son père"
              personnes={personnes}
              valeur={valeurs.pereId}
              exclus={[...moi, mereId].filter(Boolean)}
              onChoix={setPereId}
            />
            <ChoixPersonne
              nom="mereId"
              label="Sa mère"
              personnes={personnes}
              valeur={valeurs.mereId}
              exclus={[...moi, pereId].filter(Boolean)}
              onChoix={setMereId}
            />
          </div>
        )}

        <Selecteur
          label="Nature de la filiation"
          name="natureFiliation"
          defaultValue={valeurs.natureFiliation}
          aide="La filiation ordinaire ne s’affiche pas sur la fiche ; une adoption, si."
        >
          {NATURES_FILIATION.map((n) => (
            <option key={n.valeur} value={n.valeur}>
              {n.libelle}
            </option>
          ))}
        </Selecteur>
      </Bloc>

      <Bloc
        legende="Son conjoint"
        aide="Facultatif. Le choix d’un conjoint crée l’union qui les joint, à laquelle leurs enfants pourront être rattachés."
      >
        {liens && liens.foyers.length > 0 && (
          <DejaLa
            titre="Unions déjà enregistrées"
            personnes={liens.foyers
              .map((f) => f.conjoint)
              .filter((c): c is OptionPersonne => c !== null)}
          />
        )}

        <ChoixPersonne
          nom="conjointId"
          label="Son conjoint ou sa conjointe"
          personnes={personnes}
          valeur={valeurs.conjointId}
          exclus={[...moi, pereId, mereId].filter(Boolean)}
          onChoix={setConjointId}
        />
      </Bloc>

      <Bloc
        id="enfants"
        legende="Ses enfants déjà dans l’arbre"
        aide="Pour un enfant pas encore dans l’arbre, utilisez « Ajouter un enfant » sur la fiche du parent : les deux parents seront préremplis si le couple est connu. Ce bloc sert à rattacher des personnes déjà saisies."
      >
        {liens && liens.foyers.some((f) => f.enfants.length > 0) && (
          <EnfantsDejaLa foyers={liens.foyers} />
        )}

        {liens && liens.foyers.length > 0 && (
          <Selecteur
            label="Dans quel foyer les inscrire"
            name="foyerEnfants"
            defaultValue={liens.foyers.length === 1 ? liens.foyers[0].id : ''}
            aide="Un enfant appartient à une union, pas à une personne seule : c’est ainsi que se retrouvent ses frères et sœurs."
          >
            <option value="">
              {conjointId ? 'Avec le conjoint choisi ci-dessus' : 'Dans un foyer sans autre parent connu'}
            </option>
            {liens.foyers.map((foyer) => (
              <option key={foyer.id} value={foyer.id}>
                {foyer.conjoint ? `Avec ${foyer.conjoint.nomComplet} (${foyer.conjoint.repere})` : 'Foyer sans autre parent connu'}
              </option>
            ))}
          </Selecteur>
        )}

        <ChoixPersonnesMultiple
          nom="enfants"
          label="Enfants à rattacher"
          personnes={personnes}
          valeurs={valeurs.enfants}
          exclus={[...moi, pereId, mereId, conjointId].filter(Boolean)}
          onChoix={setEnfants}
        />
      </Bloc>
    </div>
  );
}

/** L’aperçu suit la saisie, mais ne déclenche aucune écriture. */
function ApercuRattachement({
  personnes,
  unions,
  modeUnion,
  unionParents,
  pereId,
  mereId,
  conjointId,
  enfants,
}: {
  personnes: OptionPersonne[];
  unions: OptionUnion[];
  modeUnion: boolean;
  unionParents: string;
  pereId: string;
  mereId: string;
  conjointId: string;
  enfants: string[];
}) {
  const parId = new Map(personnes.map((personne) => [personne.id, personne]));
  const lignes: string[] = [];
  const pere = parId.get(pereId);
  const mere = parId.get(mereId);
  const conjoint = parId.get(conjointId);
  const union = unions.find((foyer) => foyer.id === unionParents);
  const enfantsChoisis = enfants.map((id) => parId.get(id)).filter((p): p is OptionPersonne => Boolean(p));

  if (modeUnion && union) lignes.push(`Filiation proposée via le foyer ${union.libelle}.`);
  if (!modeUnion && (pere || mere)) {
    lignes.push(`Parents proposés : ${[pere?.nomComplet, mere?.nomComplet].filter(Boolean).join(' et ')}.`);
  }
  if (conjoint) lignes.push(`Union proposée avec ${conjoint.nomComplet}.`);
  if (enfantsChoisis.length > 0) {
    lignes.push(`Enfants à rattacher : ${enfantsChoisis.map((enfant) => enfant.nomComplet).join(', ')}.`);
  }

  return (
    <aside className="rounded-[var(--rayon)] border border-accent/30 bg-accent-clair p-4" aria-live="polite">
      <h2 className="text-sm font-medium text-encre">Aperçu avant enregistrement</h2>
      {lignes.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1 text-sm leading-6 text-encre-douce">
          {lignes.map((ligne) => <li key={ligne}>{ligne}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-encre-douce">
          Aucun rattachement n’est proposé : cette fiche sera créée ou corrigée sans lien familial.
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-encre-tres-douce">
        Vérifiez chaque proposition : cet aperçu ne confirme aucun lien et ne remplace pas un acte.
      </p>
    </aside>
  );
}

/** Enfants déjà rattachés : affichage + option de détachement explicite. */
function EnfantsDejaLa({
  foyers,
}: {
  foyers: { id: string; conjoint: OptionPersonne | null; enfants: OptionPersonne[] }[];
}) {
  const lignes = foyers.flatMap((foyer) =>
    foyer.enfants.map((enfant) => ({
      enfant,
      foyer,
    }))
  );
  if (lignes.length === 0) return null;

  return (
    <div className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-2.5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">
        Enfants déjà rattachés
      </h3>
      <ul className="mt-1.5 flex flex-col gap-2">
        {lignes.map(({ enfant, foyer }) => (
          <li key={`${foyer.id}-${enfant.id}`} className="text-sm text-encre">
            <label className="flex cursor-pointer items-baseline gap-2.5">
              <input
                type="checkbox"
                name="detacherEnfants"
                value={enfant.id}
                className="h-4 w-4 shrink-0 self-center accent-[var(--accent)]"
              />
              <span>
                <Link href={`/personne/${enfant.id}`} className="lien-discret">
                  {enfant.nomComplet}
                </Link>
                <span className="text-xs text-encre-douce"> — {enfant.repere}</span>
                <span className="text-xs text-encre-tres-douce">
                  {' '}
                  ·{' '}
                  {foyer.conjoint
                    ? `foyer avec ${foyer.conjoint.nomComplet}`
                    : 'foyer sans autre parent'}
                </span>
              </span>
            </label>
            <span className="sr-only">Retirer {enfant.nomComplet} de ce foyer</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-encre-douce">
        Cochez puis enregistrez pour retirer un enfant de ce foyer uniquement — sa fiche reste
        dans l’arbre.
      </p>
    </div>
  );
}

/** Ce qui est déjà écrit se montre, plutôt que de se redemander. */
function DejaLa({ titre, personnes }: { titre: string; personnes: OptionPersonne[] }) {
  if (personnes.length === 0) return null;

  return (
    <div className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-3 py-2.5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-encre-tres-douce">{titre}</h3>
      <ul className="mt-1.5 flex flex-col gap-1">
        {personnes.map((p) => (
          <li key={p.id} className="text-sm text-encre">
            <Link href={`/personne/${p.id}`} className="lien-discret">
              {p.nomComplet}
            </Link>
            <span className="text-xs text-encre-douce"> — {p.repere}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Choix({
  nom,
  valeur,
  coche,
  onChoix,
  libelle,
}: {
  nom: string;
  valeur: string;
  coche: boolean;
  onChoix: () => void;
  libelle: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-encre">
      <input
        type="radio"
        name={nom}
        value={valeur}
        checked={coche}
        onChange={onChoix}
        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
      />
      {libelle}
    </label>
  );
}
