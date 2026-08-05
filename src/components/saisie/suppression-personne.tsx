import { supprimerPersonne } from '@/app/actions/personnes';
import type { LiensRompus } from '@/components/saisie/donnees';

/**
 * Retirer quelqu’un de l’arbre.
 *
 * Le geste est rare, sans retour, et réservé aux administrateurs : il sert à
 * effacer un doublon d’import ou une fiche créée par erreur, jamais à faire
 * disparaître un parent fâché. On dit donc d’abord, chiffres à l’appui, ce que
 * la suppression romprait — puis on demande une confirmation explicite.
 *
 * Le bouton n’ouvre aucun droit : la Server Action revérifie le rôle, et les
 * politiques RLS tranchent en dernier ressort.
 */
export function SuppressionPersonne({
  personneId,
  nomComplet,
  liens,
}: {
  personneId: string;
  nomComplet: string;
  liens: LiensRompus;
}) {
  const rompus = [
    liens.parents > 0 && 'son rattachement à ses parents',
    liens.unions > 0 && `${liens.unions} union${liens.unions > 1 ? 's' : ''}`,
    liens.enfants > 0 && `le lien vers ${liens.enfants} enfant${liens.enfants > 1 ? 's' : ''}`,
    liens.evenements > 0 && `${liens.evenements} événement${liens.evenements > 1 ? 's' : ''} de sa vie`,
    liens.souvenirs > 0 && `sa mention dans ${liens.souvenirs} souvenir${liens.souvenirs > 1 ? 's' : ''}`,
    liens.photos > 0 && `son nom sur ${liens.photos} photographie${liens.photos > 1 ? 's' : ''}`,
  ].filter((r): r is string => typeof r === 'string');

  return (
    <section className="carte border-erreur/30 p-5 sm:p-6">
      <h2 className="text-lg">Retirer cette personne de l’arbre</h2>

      <p className="mt-2 text-sm leading-relaxed text-encre-douce">
        Réservé aux administrateurs, et sans retour possible : ni la fiche, ni ses dates, ni ses
        liens ne pourront être rétablis. Les souvenirs et les photographies, eux, resteront en
        place — seul le nom de {nomComplet} en disparaîtra.
      </p>

      {rompus.length > 0 ? (
        <div className="mt-4 rounded-[var(--rayon-petit)] border border-alerte/40 bg-alerte/10 px-3 py-2.5">
          <p className="text-sm font-medium text-encre">Ce que la suppression romprait</p>
          <ul className="mt-1.5 list-disc pl-5 text-sm text-encre-douce">
            {rompus.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {liens.enfants > 0 && (
            <p className="mt-2 text-sm text-encre-douce">
              Ses enfants resteront dans l’arbre, mais rattachés à un parent de moins : leur
              ascendance de ce côté sera perdue.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-encre-tres-douce">
          Cette fiche n’est reliée à rien : sa suppression ne rompra aucun lien.
        </p>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-encre-douce transition hover:text-erreur">
          Supprimer quand même
        </summary>

        <form action={supprimerPersonne} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="id" value={personneId} />

          <label className="flex items-start gap-2.5 text-sm text-encre">
            <input
              type="checkbox"
              name="confirmation"
              value="oui"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--erreur)]"
            />
            <span>
              Je confirme vouloir retirer définitivement {nomComplet} de l’arbre, avec les liens
              énumérés ci-dessus.
            </span>
          </label>

          <div>
            <button
              type="submit"
              className="rounded-[var(--rayon-petit)] border border-erreur/50 bg-erreur/10 px-3 py-1.5 text-sm font-medium text-erreur transition hover:bg-erreur/20"
            >
              Oui, supprimer cette fiche
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
