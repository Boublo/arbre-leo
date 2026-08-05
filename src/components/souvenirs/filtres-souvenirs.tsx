import Link from 'next/link';
import { Champ } from '@/components/ui/champs';
import { Selecteur } from '@/components/souvenirs/selecteur';
import type { PersonneMentionnee } from '@/lib/souvenirs';

/**
 * Les filtres du mur.
 *
 * Un simple formulaire en GET : l’adresse porte le filtre, elle se partage et
 * se met en favori, et tout fonctionne même si le navigateur n’exécute rien.
 */
export function FiltresSouvenirs({
  personnes,
  valeurs,
  actif,
}: {
  personnes: PersonneMentionnee[];
  valeurs: { personneId: string | null; anneeDebut: number | null; anneeFin: number | null };
  actif: boolean;
}) {
  return (
    <form
      method="get"
      className="carte flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-56 flex-1">
        <Selecteur
          label="Une personne en particulier"
          name="personne"
          defaultValue={valeurs.personneId ?? ''}
        >
          <option value="">Toute la famille</option>
          {personnes.map((personne) => (
            <option key={personne.id} value={personne.id}>
              {personne.nomComplet}
            </option>
          ))}
        </Selecteur>
      </div>

      <div className="w-32">
        <Champ
          label="À partir de"
          name="de"
          type="number"
          inputMode="numeric"
          placeholder="1950"
          defaultValue={valeurs.anneeDebut ?? ''}
        />
      </div>

      <div className="w-32">
        <Champ
          label="Jusqu’à"
          name="a"
          type="number"
          inputMode="numeric"
          placeholder="1980"
          defaultValue={valeurs.anneeFin ?? ''}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
        >
          Filtrer
        </button>

        {actif && (
          <Link href="/souvenirs" className="lien-discret text-sm">
            Tout revoir
          </Link>
        )}
      </div>
    </form>
  );
}
