'use client';

import { useActionState, useId, useMemo, useState } from 'react';
import {
  changerRole,
  changerStatut,
  rattacherPersonne,
  type EtatAdmin,
} from '@/app/actions/admin';
import { BoutonEnvoi, Alerte } from '@/components/ui/champs';
import { Selecteur, BoutonSecondaire, Etiquette } from '@/components/admin/champs-admin';
import {
  ORDRE_ROLES,
  ROLES,
  STATUTS,
  formaterJour,
  normaliser,
  type FicheArbre,
  type MembreAdmin,
} from '@/components/admin/vocabulaire';
import type { RoleMembre } from '@/lib/types-base';

/**
 * Les membres dont l'accès est déjà tranché : ceux qui entrent et ceux dont
 * l'accès est suspendu. On y règle le rôle, on y coupe un accès, et on y relie
 * chacun à sa propre fiche dans l'arbre.
 */
export function ListeMembres({
  membres,
  fiches,
  moiId,
}: {
  membres: MembreAdmin[];
  fiches: FicheArbre[];
  moiId: string;
}) {
  return (
    <section aria-labelledby="titre-membres" className="flex flex-col gap-4">
      <header>
        <h2 id="titre-membres" className="text-2xl">
          Membres
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          {membres.length === 0
            ? 'Personne n’a encore d’accès ouvert.'
            : `${membres.length} compte${membres.length > 1 ? 's' : ''} dont l’accès a été tranché.`}
        </p>
      </header>

      {membres.length > 0 && (
        <ul className="flex flex-col gap-4">
          {membres.map((membre) => (
            <li key={membre.id}>
              <CarteMembre membre={membre} fiches={fiches} estMoi={membre.id === moiId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CarteMembre({
  membre,
  fiches,
  estMoi,
}: {
  membre: MembreAdmin;
  fiches: FicheArbre[];
  estMoi: boolean;
}) {
  const [etatRole, actionRole] = useActionState<EtatAdmin, FormData>(changerRole, {});
  const [etatStatut, actionStatut] = useActionState<EtatAdmin, FormData>(changerStatut, {});

  // Le choix est tenu en état pour que l'explication affichée sous la liste
  // corresponde au rôle que l'on est en train de choisir, et non à l'ancien.
  const [roleChoisi, setRoleChoisi] = useState<RoleMembre>(membre.role);

  const statut = STATUTS[membre.statut];
  const suspendu = membre.statut === 'suspendu';

  return (
    <article className="carte flex flex-col gap-4 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg leading-tight">
            {membre.nom_affiche}
            {estMoi && <span className="ml-2 text-sm text-encre-tres-douce">(vous)</span>}
          </h3>
          <p className="text-sm text-encre-douce">{membre.email}</p>
          {membre.lien_famille && (
            <p className="mt-1 text-sm text-encre-tres-douce">{membre.lien_famille}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Etiquette ton={statut.ton}>{statut.libelle}</Etiquette>
          {membre.valide_le && (
            <span className="text-xs text-encre-tres-douce">
              décidé le {formaterJour(membre.valide_le)}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 border-t border-bordure pt-4">
        <form action={actionRole} className="flex flex-1 flex-wrap items-end gap-3">
          <input type="hidden" name="membreId" value={membre.id} />
          <div className="min-w-48 flex-1">
            <Selecteur
              label="Rôle"
              id={`role-membre-${membre.id}`}
              name="role"
              value={roleChoisi}
              onChange={(evenement) => setRoleChoisi(evenement.target.value as RoleMembre)}
              aide={ROLES[roleChoisi].explication}
            >
              {ORDRE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLES[role].libelle}
                </option>
              ))}
            </Selecteur>
          </div>
          <BoutonEnvoi enCours="Enregistrement…" disabled={roleChoisi === membre.role}>
            Enregistrer le rôle
          </BoutonEnvoi>
        </form>

        <form action={actionStatut}>
          <input type="hidden" name="membreId" value={membre.id} />
          <input type="hidden" name="statut" value={suspendu ? 'valide' : 'suspendu'} />
          <BoutonSecondaire
            ton={suspendu ? 'neutre' : 'alerte'}
            enCours="Enregistrement…"
            disabled={estMoi && !suspendu}
            title={
              estMoi && !suspendu
                ? 'Vous ne pouvez pas vous retirer vous-même l’accès.'
                : undefined
            }
          >
            {suspendu ? 'Rétablir l’accès' : 'Suspendre l’accès'}
          </BoutonSecondaire>
        </form>
      </div>

      {etatRole.erreur && <Alerte ton="erreur">{etatRole.erreur}</Alerte>}
      {etatRole.message && <Alerte ton="succes">{etatRole.message}</Alerte>}
      {etatStatut.erreur && <Alerte ton="erreur">{etatStatut.erreur}</Alerte>}
      {etatStatut.message && <Alerte ton="succes">{etatStatut.message}</Alerte>}

      <Rattachement membre={membre} fiches={fiches} />
    </article>
  );
}

/**
 * Rattachement d'un membre à sa fiche dans l'arbre.
 *
 * Cent neuf personnes, c'est trop pour une liste qu'on parcourt à l'œil : un
 * champ de recherche réduit les choix, insensible aux accents — on tape
 * un nom sans accent et l’on trouve sa graphie accentuée. La liste reste une vraie liste
 * déroulante, navigable au clavier.
 */
function Rattachement({ membre, fiches }: { membre: MembreAdmin; fiches: FicheArbre[] }) {
  const [etat, action] = useActionState<EtatAdmin, FormData>(rattacherPersonne, {});
  const [recherche, setRecherche] = useState('');
  const [choix, setChoix] = useState(membre.personne_id ?? '');
  const idRecherche = useId();

  const ficheActuelle = fiches.find((f) => f.id === membre.personne_id) ?? null;

  const proposees = useMemo(() => {
    const terme = normaliser(recherche);
    const retenues = terme
      ? fiches.filter((f) => normaliser(`${f.libelle} ${f.precision ?? ''}`).includes(terme))
      : fiches;

    // La fiche déjà choisie reste toujours proposée, sans quoi la recherche la
    // ferait disparaître de la liste et effacerait le choix en cours.
    const choisie = fiches.find((f) => f.id === choix);
    if (choisie && !retenues.some((f) => f.id === choisie.id)) return [choisie, ...retenues];
    return retenues;
  }, [fiches, recherche, choix]);

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-encre-douce hover:text-encre">
        Fiche dans l’arbre :{' '}
        <span className="text-encre">
          {ficheActuelle?.libelle ?? (membre.personne_id ? 'fiche introuvable' : 'aucune')}
        </span>
      </summary>

      <form action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="membreId" value={membre.id} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={idRecherche} className="text-sm font-medium text-encre">
            Chercher une personne
          </label>
          <input
            id={idRecherche}
            type="search"
            value={recherche}
            onChange={(evenement) => setRecherche(evenement.target.value)}
            placeholder="Un nom, un prénom…"
            className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-carte px-3 py-2.5 text-encre
                       placeholder:text-encre-tres-douce
                       focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <p className="text-xs text-encre-douce" aria-live="polite">
            {proposees.length} personne{proposees.length > 1 ? 's' : ''} sur {fiches.length}.
          </p>
        </div>

        <Selecteur
          label="Fiche rattachée"
          id={`personne-${membre.id}`}
          name="personneId"
          value={choix}
          onChange={(evenement) => setChoix(evenement.target.value)}
          aide="Le membre est ainsi reconnu comme la personne de l’arbre."
        >
          <option value="">— Aucune fiche —</option>
          {proposees.map((fiche) => (
            <option key={fiche.id} value={fiche.id}>
              {fiche.precision ? `${fiche.libelle} (${fiche.precision})` : fiche.libelle}
            </option>
          ))}
        </Selecteur>

        <div>
          <BoutonEnvoi enCours="Enregistrement…" disabled={choix === (membre.personne_id ?? '')}>
            Enregistrer le rattachement
          </BoutonEnvoi>
        </div>

        {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}
        {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}
      </form>
    </details>
  );
}
