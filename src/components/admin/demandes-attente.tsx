'use client';

import { useActionState } from 'react';
import { validerDemande, refuserDemande, type EtatAdmin } from '@/app/actions/admin';
import { ZoneTexte, BoutonEnvoi, Alerte } from '@/components/ui/champs';
import { Selecteur, BoutonSecondaire } from '@/components/admin/champs-admin';
import {
  ORDRE_ROLES,
  ROLES,
  formaterHorodatage,
  type DemandeAdmin,
} from '@/components/admin/vocabulaire';

/**
 * Les demandes d'accès en attente.
 *
 * L'inscription est libre, l'accès ne l'est pas. On affiche ici exactement ce
 * sur quoi la décision se prend : le nom demandé, l'adresse, le lien de famille
 * déclaré et le mot laissé à l'inscription. Rien d'autre n'est connu.
 */
export function DemandesEnAttente({ demandes }: { demandes: DemandeAdmin[] }) {
  return (
    <section aria-labelledby="titre-demandes" className="flex flex-col gap-4">
      <header>
        <h2 id="titre-demandes" className="text-2xl">
          Demandes en attente
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          {demandes.length === 0
            ? 'Aucune demande à examiner pour l’instant.'
            : `${demandes.length} personne${demandes.length > 1 ? 's attendent' : ' attend'} votre décision.`}
        </p>
      </header>

      {demandes.length > 0 && (
        <>
          <div className="carte px-5 py-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-encre-tres-douce">
              Ce que permet chaque rôle
            </p>
            <dl className="mt-2 flex flex-col gap-1.5">
              {ORDRE_ROLES.map((role) => (
                <div key={role} className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-encre">{ROLES[role].libelle}</dt>
                  <dd className="text-encre-douce">{ROLES[role].explication}</dd>
                </div>
              ))}
            </dl>
          </div>

          <ul className="flex flex-col gap-4">
            {demandes.map((demande) => (
              <li key={demande.id}>
                <CarteDemande demande={demande} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CarteDemande({ demande }: { demande: DemandeAdmin }) {
  const [etatValidation, actionValidation] = useActionState<EtatAdmin, FormData>(
    validerDemande,
    {}
  );
  const [etatRefus, actionRefus] = useActionState<EtatAdmin, FormData>(refuserDemande, {});

  return (
    <article className="carte flex flex-col gap-4 p-5">
      <header>
        <h3 className="text-lg leading-tight">{demande.nom_affiche}</h3>
        <p className="text-sm text-encre-douce">{demande.email}</p>
      </header>

      <dl className="flex flex-col gap-3 text-sm">
        <Renseignement terme="Lien de famille déclaré">
          {demande.lien_famille ?? <Absent>Non précisé.</Absent>}
        </Renseignement>

        <Renseignement terme="Mot laissé à l’inscription">
          {demande.message_demande ? (
            <span className="whitespace-pre-line">{demande.message_demande}</span>
          ) : (
            <Absent>Aucun message.</Absent>
          )}
        </Renseignement>

        <Renseignement terme="Demande reçue le">
          {formaterHorodatage(demande.cree_le)}
        </Renseignement>
      </dl>

      <form action={actionValidation} className="flex flex-wrap items-end gap-3 border-t border-bordure pt-4">
        <input type="hidden" name="membreId" value={demande.id} />
        <div className="min-w-48 flex-1">
          <Selecteur
            label="Rôle accordé"
            id={`role-demande-${demande.id}`}
            name="role"
            defaultValue="lecteur"
          >
            {ORDRE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLES[role].libelle}
              </option>
            ))}
          </Selecteur>
        </div>
        <BoutonEnvoi enCours="Ouverture…">Accorder l’accès</BoutonEnvoi>
      </form>

      {etatValidation.erreur && <Alerte ton="erreur">{etatValidation.erreur}</Alerte>}
      {etatValidation.message && <Alerte ton="succes">{etatValidation.message}</Alerte>}

      <details className="text-sm">
        <summary className="cursor-pointer text-encre-douce hover:text-encre">
          Écarter cette demande
        </summary>

        <form action={actionRefus} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="membreId" value={demande.id} />
          <ZoneTexte
            label="Motif"
            id={`motif-${demande.id}`}
            name="motif"
            required
            minLength={3}
            maxLength={500}
            placeholder="Je ne vois pas de qui il s’agit."
            aide="Ce motif sera lu par la personne sur sa page d’attente."
          />
          <div>
            <BoutonSecondaire ton="alerte" enCours="Enregistrement…">
              Écarter la demande
            </BoutonSecondaire>
          </div>
        </form>

        {etatRefus.erreur && (
          <div className="mt-3">
            <Alerte ton="erreur">{etatRefus.erreur}</Alerte>
          </div>
        )}
      </details>
    </article>
  );
}

function Renseignement({ terme, children }: { terme: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-encre-tres-douce">{terme}</dt>
      <dd className="mt-0.5 text-encre">{children}</dd>
    </div>
  );
}

function Absent({ children }: { children: React.ReactNode }) {
  return <span className="text-encre-tres-douce">{children}</span>;
}
