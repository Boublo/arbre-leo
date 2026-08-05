import Link from 'next/link';
import { formaterDate } from '@/lib/arbre';
import { ChangementStatut } from '@/components/recherches/changement-statut';
import { ConsignerResultat } from '@/components/recherches/consigner-resultat';
import {
  brancheLisible,
  depuis,
  joursDepuis,
  joursEntre,
  priorite,
  SEUIL_RELANCE,
  type ChantierVue,
} from '@/components/recherches/vocabulaire';

/**
 * Une demande, telle qu'on a besoin de la relire six mois plus tard : à qui
 * elle a été adressée, depuis quand elle attend, ce qui la bloque.
 */
export function FicheChantier({
  chantier,
  peutContribuer,
}: {
  chantier: ChantierVue;
  peutContribuer: boolean;
}) {
  const rang = priorite(chantier.priorite);
  const branche = brancheLisible(chantier.branche);
  const attente = joursDepuis(chantier.demandeLe);
  const delaiReponse = joursEntre(chantier.demandeLe, chantier.reponseLe);
  const jourDemande = jourLisible(chantier.demandeLe);

  // Une demande partie il y a plus de deux mois et restée sans réponse ne
  // reviendra pas d'elle-même : c'est le signal que la page doit donner.
  const aRelancer =
    chantier.statut === 'en_attente_reponse' && attente !== null && attente >= SEUIL_RELANCE;

  return (
    <article className="carte flex flex-col gap-2.5 p-3.5">
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 shrink-0 rounded-[var(--rayon-petit)] border px-1.5 py-0.5 text-[0.7rem] font-medium"
          style={{ borderColor: tonPriorite(chantier.priorite), color: tonPriorite(chantier.priorite) }}
        >
          <span aria-hidden>{rang.libelle}</span>
          <span className="sr-only">
            Priorité {chantier.priorite} sur 5 : {rang.aide}
          </span>
        </span>
        <h4 className="flex-1 text-base leading-snug">{chantier.titre}</h4>
      </div>

      {chantier.objectif && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-encre-douce">
          {chantier.objectif}
        </p>
      )}

      <dl className="flex flex-col gap-1.5 text-xs">
        {chantier.organisme && (
          <Ligne terme="Organisme">
            <span className="text-encre">{chantier.organisme}</span>
          </Ligne>
        )}

        {chantier.reference && <Ligne terme="Référence">{chantier.reference}</Ligne>}

        {chantier.personne && (
          <Ligne terme="Concerne">
            <Link href={`/personne/${chantier.personne.id}`} className="lien-discret">
              {chantier.personne.nom}
            </Link>
          </Ligne>
        )}

        {chantier.assigneA && <Ligne terme="Suivi par">{chantier.assigneA}</Ligne>}
      </dl>

      {!chantier.reponseLe && attente !== null && (
        <p
          className={
            aRelancer
              ? 'rounded-[var(--rayon-petit)] border border-alerte/40 bg-alerte/10 px-2.5 py-1.5 text-xs text-alerte'
              : 'text-xs text-encre-douce'
          }
        >
          {aRelancer && <span className="font-medium">À relancer · </span>}
          Demande partie {depuis(attente)}
          {jourDemande && <> (le {jourDemande})</>}
        </p>
      )}

      {chantier.statut === 'en_attente_reponse' && !chantier.demandeLe && (
        <p className="text-xs text-encre-tres-douce">
          Date d’envoi inconnue : impossible de dire depuis quand la demande attend.
        </p>
      )}

      {chantier.reponseLe && (
        <p className="text-xs text-encre-douce">
          Réponse le {jourLisible(chantier.reponseLe)}
          {delaiReponse !== null && <> · {delaiReponse} jours d’attente</>}
        </p>
      )}

      {chantier.blocage && (
        <p className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux px-2.5 py-1.5 text-xs leading-relaxed text-encre-douce">
          <span className="font-medium text-encre">Blocage. </span>
          {chantier.blocage}
        </p>
      )}

      {chantier.resultat && (
        <p className="rounded-[var(--rayon-petit)] border border-succes/40 bg-succes/10 px-2.5 py-1.5 text-xs leading-relaxed text-encre">
          <span className="font-medium">Résultat. </span>
          {chantier.resultat}
        </p>
      )}

      {branche && (
        <p className="mt-auto flex items-center gap-1.5 border-t border-bordure pt-2 text-xs text-encre-tres-douce">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: branche.ton }} />
          {branche.libelle}
        </p>
      )}

      {peutContribuer && (
        <div className="flex flex-col gap-2">
          <ChangementStatut id={chantier.id} titre={chantier.titre} statut={chantier.statut} />
          <ConsignerResultat
            id={chantier.id}
            titre={chantier.titre}
            statut={chantier.statut}
            resultat={chantier.resultat}
          />
        </div>
      )}
    </article>
  );
}

function Ligne({ terme, children }: { terme: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-1.5">
      <dt className="text-encre-tres-douce">{terme} :</dt>
      <dd className="text-encre-douce">{children}</dd>
    </div>
  );
}

/** Le rouge n'est pas donné à la légère : seul le premier rang l'obtient. */
function tonPriorite(valeur: number): string {
  if (valeur <= 1) return 'var(--erreur)';
  if (valeur === 2) return 'var(--alerte)';
  return 'var(--encre-tres-douce)';
}

/** « 12 mars 2026 » à partir d'une date de la base. */
function jourLisible(date: string | null): string | null {
  if (!date) return null;
  const [annee, mois, jour] = date.slice(0, 10).split('-').map(Number);
  if (!annee || Number.isNaN(annee)) return null;
  return formaterDate({ annee, mois: mois || null, jour: jour || null });
}
