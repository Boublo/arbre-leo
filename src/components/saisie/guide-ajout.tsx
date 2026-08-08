'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChoixPersonne } from '@/components/saisie/choix-personne';
import type { OptionPersonne } from '@/components/saisie/donnees';

type Relation = 'enfant' | 'fratrie' | 'parent' | 'conjoint';

const RELATIONS: Array<{ valeur: Relation; libelle: string; aide: string }> = [
  { valeur: 'enfant', libelle: 'Un enfant', aide: 'Préremplit le parent connu, sans inventer l’autre parent.' },
  { valeur: 'fratrie', libelle: 'Un frère ou une sœur', aide: 'Reprend les parents depuis la fiche quand ils sont connus.' },
  { valeur: 'parent', libelle: 'Un père ou une mère', aide: 'Préremplit l’enfant concerné et demande le rôle du parent.' },
  { valeur: 'conjoint', libelle: 'Un conjoint ou une conjointe', aide: 'Préremplit la personne concernée ; le foyer reste à confirmer.' },
];

export function GuideAjout({ personnes }: { personnes: OptionPersonne[] }) {
  const [relation, setRelation] = useState<Relation>('enfant');
  const [personneId, setPersonneId] = useState('');
  const [roleParent, setRoleParent] = useState<'M' | 'F'>('M');
  const personne = personnes.find((candidate) => candidate.id === personneId) ?? null;

  return (
    <div className="flex flex-col gap-7">
      <fieldset className="flex flex-col gap-3 rounded-[var(--rayon)] border border-bordure p-4">
        <legend className="px-1.5 text-sm font-medium text-encre">Le lien recherché</legend>
        {RELATIONS.map((option) => (
          <label key={option.valeur} className="flex cursor-pointer items-start gap-2.5 text-sm text-encre">
            <input
              type="radio"
              name="relation"
              value={option.valeur}
              checked={relation === option.valeur}
              onChange={() => setRelation(option.valeur)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              <span className="font-medium">{option.libelle}</span>
              <span className="block text-xs leading-5 text-encre-douce">{option.aide}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <ChoixPersonne
        nom="personne-guide"
        label="À partir de quelle personne ?"
        aide="Choisissez-la avec ses années de vie pour éviter les homonymes."
        personnes={personnes}
        valeur={personneId}
        onChoix={setPersonneId}
      />

      {relation === 'parent' && (
        <fieldset className="flex flex-col gap-2 rounded-[var(--rayon-petit)] border border-bordure p-4">
          <legend className="px-1.5 text-sm font-medium text-encre">Quel parent ajouter ?</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-encre">
            <input type="radio" name="role-parent" checked={roleParent === 'M'} onChange={() => setRoleParent('M')} className="h-4 w-4 accent-[var(--accent)]" />
            Son père
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-encre">
            <input type="radio" name="role-parent" checked={roleParent === 'F'} onChange={() => setRoleParent('F')} className="h-4 w-4 accent-[var(--accent)]" />
            Sa mère
          </label>
        </fieldset>
      )}

      <Destination relation={relation} personne={personne} roleParent={roleParent} />
    </div>
  );
}

function Destination({
  relation,
  personne,
  roleParent,
}: {
  relation: Relation;
  personne: OptionPersonne | null;
  roleParent: 'M' | 'F';
}) {
  if (!personne) {
    return <p className="text-sm text-encre-douce">Choisissez une personne pour préparer le formulaire adapté.</p>;
  }

  if (relation === 'fratrie') {
    return <CarteDestination href={`/personne/${personne.id}`}>
      Ouvrir la fiche de {personne.nomComplet} pour ajouter un frère ou une sœur avec les parents déjà connus.
    </CarteDestination>;
  }

  if (relation === 'conjoint') {
    return <CarteDestination href={`/personne/nouvelle?conjoint=${encodeURIComponent(personne.id)}`}>
      Préparer l’ajout d’un conjoint ou d’une conjointe de {personne.nomComplet}.
    </CarteDestination>;
  }

  if (relation === 'parent') {
    return <CarteDestination href={`/personne/nouvelle?enfant=${encodeURIComponent(personne.id)}&sexe=${roleParent}`}>
      Préparer l’ajout de {roleParent === 'M' ? 'son père' : 'sa mère'}.
    </CarteDestination>;
  }

  const parent = personne.sexe === 'F' ? 'mere' : personne.sexe === 'M' ? 'pere' : '';
  const href = parent ? `/personne/nouvelle?${parent}=${encodeURIComponent(personne.id)}` : '/personne/nouvelle';
  const message = parent
    ? `Préparer l’ajout d’un enfant de ${personne.nomComplet}.`
    : `Le rôle parental de ${personne.nomComplet} n’est pas renseigné : ouvrez le formulaire sans préremplissage plutôt que d’inventer un rôle.`;
  return <CarteDestination href={href}>{message}</CarteDestination>;
}

function CarteDestination({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--rayon)] border border-accent/35 bg-accent-clair p-4">
      <p className="text-sm leading-6 text-encre">{children}</p>
      <Link href={href} className="mt-3 inline-flex lien-discret">
        Ouvrir le formulaire préparé →
      </Link>
    </div>
  );
}
