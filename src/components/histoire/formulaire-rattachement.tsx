'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { rattacherPersonne, detacherPersonne, type EtatFait } from '@/app/actions/faits';
import { ZoneTexte, BoutonEnvoi, Alerte } from '@/components/ui/champs';
import { Selecteur } from '@/components/histoire/champs-histoire';

/**
 * Rattacher quelqu'un à un fait, et dire ce que ce fait a changé pour lui.
 * C'est l'incidence qui fait tout le prix de cette page : « mobilisé »,
 * « embarque à Oran », « perd son atelier ». Sans elle, on n'a qu'un almanach.
 */
export function FormulaireRattachement({
  faitId,
  personnes,
}: {
  faitId: string;
  personnes: { id: string; nomComplet: string }[];
}) {
  const [etat, action] = useActionState<EtatFait, FormData>(rattacherPersonne, {});

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="faitId" value={faitId} />

      <Selecteur
        label="Personne de l’arbre"
        name="personneId"
        required
        defaultValue=""
        aide={
          personnes.length === 0
            ? 'Aucune personne n’est encore visible dans l’arbre.'
            : undefined
        }
      >
        <option value="" disabled>
          Choisissez une personne…
        </option>
        {personnes.map((personne) => (
          <option key={personne.id} value={personne.id}>
            {personne.nomComplet}
          </option>
        ))}
      </Selecteur>

      <ZoneTexte
        label="Ce que cela a changé pour elle"
        name="incidence"
        maxLength={1000}
        placeholder="Mobilisé en août 1914, blessé à la jambe, réformé l’année suivante."
        aide="Facultatif, mais c’est le cœur de cette page. Une ou deux phrases suffisent."
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}
      {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}

      <div>
        <BoutonEnvoi enCours="Enregistrement…">Rattacher</BoutonEnvoi>
      </div>
    </form>
  );
}

/** Retire un rattachement. Le fait et la personne restent : seul le lien tombe. */
export function BoutonDetacher({
  faitId,
  personneId,
  nomComplet,
}: {
  faitId: string;
  personneId: string;
  nomComplet: string;
}) {
  const [etat, action] = useActionState<EtatFait, FormData>(detacherPersonne, {});

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="faitId" value={faitId} />
      <input type="hidden" name="personneId" value={personneId} />
      <PetitBouton libelle={`Retirer ${nomComplet} de ce fait`} />
      {etat.erreur && (
        <span role="alert" className="mt-1 block text-xs text-erreur">
          {etat.erreur}
        </span>
      )}
    </form>
  );
}

function PetitBouton({ libelle }: { libelle: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={libelle}
      aria-busy={pending}
      className="rounded-[var(--rayon-petit)] border border-bordure px-2.5 py-1 text-xs text-encre-douce
                 transition hover:border-erreur hover:text-erreur disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Retrait…' : 'Retirer'}
    </button>
  );
}
