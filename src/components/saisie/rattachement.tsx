'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bloc, Selecteur } from '@/components/saisie/champs-saisie';
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
  const [modeUnion, setModeUnion] = useState(false);
  const [pereId, setPereId] = useState(valeurs.pereId);
  const [mereId, setMereId] = useState(valeurs.mereId);
  const [conjointId, setConjointId] = useState(valeurs.conjointId);

  const moi = soiMeme ? [soiMeme] : [];

  return (
    <div className="flex flex-col gap-6">
      <Bloc
        legende="Ses parents"
        aide="Facultatif. Choisissez une union déjà enregistrée, ou désignez un père et une mère : l’union sera créée si elle manque."
      >
        {liens && liens.parents.length > 0 && (
          <DejaLa titre="Parents déjà enregistrés" personnes={liens.parents} />
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
            defaultValue={valeurs.unionParents}
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
        legende="Ses enfants déjà dans l’arbre"
        aide="Facultatif, et réservé aux personnes déjà saisies. Pour un enfant qui n’y figure pas encore, enregistrez d’abord cette fiche, puis ajoutez-le depuis la sienne."
      >
        {liens && liens.foyers.some((f) => f.enfants.length > 0) && (
          <DejaLa
            titre="Enfants déjà rattachés"
            personnes={liens.foyers.flatMap((f) => f.enfants)}
          />
        )}

        {liens && liens.foyers.length > 0 && (
          <Selecteur
            label="Dans quel foyer les inscrire"
            name="foyerEnfants"
            defaultValue=""
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
        />
      </Bloc>
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
