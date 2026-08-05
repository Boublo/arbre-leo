import Link from 'next/link';
import { Champ } from '@/components/ui/champs';
import { Selecteur } from '@/components/souvenirs/selecteur';
import type { PersonneMentionnee, TypeSouvenir } from '@/lib/souvenirs';

/**
 * Les filtres du mur.
 *
 * Un simple formulaire en GET : l’adresse porte le filtre, elle se partage et
 * se met en favori, et tout fonctionne même si le navigateur n’exécute rien.
 * Le filtre par décennie coexiste avec les bornes libres — l’un remplit
 * l’autre lorsqu’il est choisi, sans l’effacer.
 */
export function FiltresSouvenirs({
  personnes,
  decennies,
  valeurs,
  actif,
  vue,
}: {
  personnes: PersonneMentionnee[];
  decennies: number[];
  valeurs: {
    personneId: string | null;
    anneeDebut: number | null;
    anneeFin: number | null;
    decennie: number | null;
    type: TypeSouvenir;
  };
  actif: boolean;
  vue: 'mur' | 'calendrier';
}) {
  return (
    <form
      method="get"
      className="carte flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {/* La vue courante voyage avec les filtres : basculer sur le calendrier
          ne doit pas repartir de zéro. */}
      {vue !== 'mur' && <input type="hidden" name="vue" value={vue} />}

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

      {decennies.length > 0 && (
        <div className="w-40">
          <Selecteur
            label="Une décennie"
            name="decennie"
            defaultValue={valeurs.decennie ?? ''}
          >
            <option value="">Toutes</option>
            {decennies.map((d) => (
              <option key={d} value={d}>
                Années {d}
              </option>
            ))}
          </Selecteur>
        </div>
      )}

      <div className="w-40">
        <Selecteur
          label="Ce que porte la carte"
          name="type"
          defaultValue={valeurs.type}
        >
          <option value="tous">Récits et photos</option>
          <option value="photos">Avec photos</option>
          <option value="recits">Récits seuls</option>
        </Selecteur>
      </div>

      <div className="w-28">
        <Champ
          label="À partir de"
          name="de"
          type="number"
          inputMode="numeric"
          placeholder="1950"
          defaultValue={valeurs.anneeDebut ?? ''}
        />
      </div>

      <div className="w-28">
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
          <Link href={vue === 'calendrier' ? '/souvenirs?vue=calendrier' : '/souvenirs'} className="lien-discret text-sm">
            Tout revoir
          </Link>
        )}
      </div>
    </form>
  );
}
