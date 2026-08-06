import { Navigation } from '@/components/navigation';
import { CarteStat } from '@/components/statistiques/carte-stat';
import {
  BarreHorizontale,
  type EntreeBarre,
} from '@/components/statistiques/barre-horizontale';
import { FriseDecennies } from '@/components/statistiques/frise-decennies';
import { chargerArbre } from '@/lib/arbre';
import { anneesDeVie } from '@/lib/arbre-graphe';
import { coteDUneBranche, LIBELLE_COTE } from '@/lib/branches';
import {
  agesAuDeces,
  ageMoyenAuDeces,
  ageMoyenAuMariage,
  avecOuSansActe,
  longevite,
  repartitionParBranche,
  repartitionParDecennie,
  repartitionParMetier,
  repartitionParPays,
  tailleFamille,
} from '@/lib/statistiques';

/**
 * Statistiques visuelles de l'arbre.
 *
 * La page réunit ce que la base mesure d'elle-même : effectifs, âges,
 * géographie, métiers, longévité. Rien n'est saisi en dur — les chiffres
 * sont recomptés à chaque visite, et une famille qui reprendrait
 * l'application y trouverait les siens.
 *
 * Server Component : tout le calcul se fait ici, le navigateur ne reçoit que
 * du SVG et du texte déjà mis en forme.
 */

export const metadata = { title: 'Statistiques' };

// Toute nouvelle date saisie doit se voir à la visite suivante.
export const dynamic = 'force-dynamic';

export default async function PageStatistiques() {
  const donnees = await chargerArbre();
  const total = donnees.personnes.size;

  // Base entièrement vide : on annonce ce qu'il faut faire, plutôt qu'un mur de zéros.
  if (total === 0) {
    return (
      <>
        <Navigation />
        <main id="contenu-principal" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
          <h1 className="text-3xl">Statistiques</h1>
          <p className="mt-4 carte p-6 text-encre-douce">
            L&apos;arbre est encore vide. Aucun chiffre à afficher tant que la
            base n&apos;a pas reçu ses premières personnes.
          </p>
        </main>
      </>
    );
  }

  // --- Toutes les mesures --------------------------------------------------

  const decennies = repartitionParDecennie(donnees);
  const pays = repartitionParPays(donnees);
  const branches = repartitionParBranche(donnees);
  const metiers = repartitionParMetier(donnees).slice(0, 10);
  const ages = agesAuDeces(donnees);
  const longs = longevite(donnees, 10);
  const tailles = tailleFamille(donnees);
  const acteMoyenDeces = ageMoyenAuDeces(donnees);
  const acteMoyenMariage = ageMoyenAuMariage(donnees);
  const actes = avecOuSansActe(donnees);

  // --- Manquants documentaires --------------------------------------------

  const personnes = [...donnees.personnes.values()];
  const sansNaissance = personnes.filter((p) => !p.naissance?.annee).length;
  const sansDeces = personnes.filter(
    (p) => !p.deces?.annee && !p.presumeVivant
  ).length;
  const sansPhoto = personnes.filter((p) => !p.photoId).length;
  const sansMetier = personnes.filter((p) => !p.profession).length;

  const nbUnions = donnees.unions.size;
  const partActe =
    total === 0 ? 0 : Math.round((actes.avecActe / total) * 100);

  // --- Mise en forme pour les barres --------------------------------------

  const barresPays: EntreeBarre[] = pays.map((p) => ({
    libelle: p.pays,
    valeur: p.personnes,
  }));

  // Plusieurs codes de branche peuvent partager le même côté : on regroupe
  // pour éviter des doublons de libellé dans la barre.
  const parCote = new Map<string, number>();
  for (const b of branches) {
    const libelle = LIBELLE_COTE[coteDUneBranche(b.branche)];
    parCote.set(libelle, (parCote.get(libelle) ?? 0) + b.personnes);
  }
  const barresBranches: EntreeBarre[] = [...parCote.entries()]
    .map(([libelle, valeur]) => ({ libelle, valeur }))
    .sort((a, b) => b.valeur - a.valeur);

  const barresMetiers: EntreeBarre[] = metiers.map((m) => ({
    libelle: m.metier,
    valeur: m.personnes,
  }));

  const barresAges: EntreeBarre[] = ages.map((a) => ({
    libelle: a.tranche,
    valeur: a.personnes,
  }));

  const barresLongevite: EntreeBarre[] = longs.map((l) => ({
    cle: l.personne.id,
    libelle: l.personne.nomComplet,
    detail: anneesDeVie(l.personne),
    valeur: l.age,
  }));

  return (
    <>
      <Navigation />
      <main id="contenu-principal" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14">
        {/* a) En-tête et intro */}
        <section className="flex flex-col gap-4">
          <h1 className="text-4xl leading-tight sm:text-5xl">Statistiques</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-encre-douce">
            Ce que la base compte, mesure et raconte d&apos;elle-même. Toutes
            les valeurs sont calculées en direct sur les personnes
            enregistrées — un acte versé aujourd&apos;hui les déplace demain.
          </p>
        </section>

        {/* b) Grille de chiffres clés */}
        <section
          aria-labelledby="chiffres-titre"
          className="flex flex-col gap-4"
        >
          <h2 id="chiffres-titre" className="text-xl">
            Les grands chiffres
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <li>
              <CarteStat
                valeur={total}
                libelle={total > 1 ? 'Personnes' : 'Personne'}
                aide="Toutes celles qu'un acte ou un souvenir a placées dans l'arbre."
              />
            </li>
            <li>
              <CarteStat
                valeur={nbUnions}
                libelle={nbUnions > 1 ? 'Unions' : 'Union'}
                aide="Mariages et couples enregistrés, avec ou sans enfants connus."
              />
            </li>
            <li>
              <CarteStat
                valeur={acteMoyenDeces !== null ? `${acteMoyenDeces} ans` : '—'}
                libelle="Âge moyen au décès"
                aide="Sur les personnes dont naissance et décès sont datés."
              />
            </li>
            <li>
              <CarteStat
                valeur={acteMoyenMariage !== null ? `${acteMoyenMariage} ans` : '—'}
                libelle="Âge moyen au mariage"
                aide="Sur les conjoints dont les deux années sont connues."
              />
            </li>
            <li>
              <CarteStat
                valeur={pays.length}
                libelle={pays.length > 1 ? 'Pays traversés' : 'Pays traversé'}
                aide="Naissances et décès confondus, une personne peut compter dans plusieurs pays."
              />
            </li>
            <li>
              <CarteStat
                valeur={metiers.length > 0 ? metiers.length : 0}
                libelle={metiers.length > 1 ? 'Métiers différents' : 'Métier différent'}
                aide="Un métier caractéristique par personne, tel que retenu en base."
              />
            </li>
            <li>
              <CarteStat
                valeur={`${partActe} %`}
                libelle="Personnes adossées à un acte"
                aide={`${actes.avecActe} sur ${total} sont documentées par un acte d'état civil consulté.`}
              />
            </li>
            <li>
              <CarteStat
                valeur={longs[0]?.age ?? '—'}
                libelle="Doyen connu (années)"
                aide={
                  longs[0]
                    ? `${longs[0].personne.nomComplet}, ${anneesDeVie(longs[0].personne) ?? ''}.`
                    : 'Aucune borne complète pour l’instant.'
                }
              />
            </li>
          </ul>
        </section>

        {/* c) Frise décennale */}
        <section
          aria-labelledby="frise-titre"
          className="flex flex-col gap-3"
        >
          <h2 id="frise-titre" className="text-xl">
            La vie de la famille dans le temps
          </h2>
          <FriseDecennies entrees={decennies} />
        </section>

        {/* d) Blocs de barres */}
        <section
          aria-labelledby="barres-titre"
          className="flex flex-col gap-4"
        >
          <h2 id="barres-titre" className="text-xl">
            Ce que l&apos;arbre laisse voir
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarreHorizontale
              titre="Pays traversés"
              entrees={barresPays}
              unite=""
              vide="Aucun pays identifié : les libellés de lieux n'en mentionnent pas encore."
            />
            <BarreHorizontale
              titre="Personnes par branche"
              entrees={barresBranches}
              vide="Aucune branche n'est encore rattachée aux personnes."
            />
            <BarreHorizontale
              titre="Métiers les plus fréquents"
              entrees={barresMetiers}
              vide="Aucun métier n'est encore renseigné."
            />
            <BarreHorizontale
              titre="Âges au décès"
              entrees={barresAges}
              unite=""
              vide="Aucune personne n'a d'année de naissance et de décès à la fois."
            />
            <div className="lg:col-span-2">
              <BarreHorizontale
                titre="Les dix plus longues vies connues"
                entrees={barresLongevite}
                unite="ans"
                vide="Aucune longévité complète à afficher pour l'instant."
              />
            </div>
          </div>

          {tailles.length > 0 && (
            <p className="text-sm leading-relaxed text-encre-douce">
              <span className="font-medium text-encre">Taille des foyers.</span>{' '}
              {tailles
                .map(
                  (t) =>
                    `${t.foyers} foyer${t.foyers > 1 ? 's' : ''} avec ${t.enfants} enfant${
                      t.enfants === 1 ? '' : 's'
                    }`
                )
                .join(' · ')}
              .
            </p>
          )}
        </section>

        {/* e) Ce qui reste à documenter */}
        <section
          aria-labelledby="manquants-titre"
          className="flex flex-col gap-4"
        >
          <h2 id="manquants-titre" className="text-xl">
            Ce qui reste à documenter
          </h2>
          <div className="carte p-5">
            <p className="text-sm text-encre-douce">
              Ces chiffres ne sont pas un reproche — l&apos;arbre s&apos;écrit à
              plusieurs mains, sur des générations. Ce sont les zones où un acte
              retrouvé ou une photo déposée feraient le plus de bien.
            </p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <ManqueLigne
                libelle="Personnes sans date de naissance"
                valeur={sansNaissance}
                total={total}
              />
              <ManqueLigne
                libelle="Personnes disparues sans date de décès"
                valeur={sansDeces}
                total={total}
              />
              <ManqueLigne
                libelle="Personnes sans photo de profil"
                valeur={sansPhoto}
                total={total}
              />
              <ManqueLigne
                libelle="Personnes sans métier renseigné"
                valeur={sansMetier}
                total={total}
              />
              <ManqueLigne
                libelle="Personnes non adossées à un acte"
                valeur={actes.sansActe}
                total={total}
              />
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}

/**
 * Ligne de « ce qui reste » : le nombre, en tabular pour l'alignement, puis
 * une part relative discrète pour donner l'échelle sans grossir le trait.
 */
function ManqueLigne({
  libelle,
  valeur,
  total,
}: {
  libelle: string;
  valeur: number;
  total: number;
}) {
  const part = total === 0 ? 0 : Math.round((valeur / total) * 100);
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-bordure py-1.5 last:border-b-0 sm:border-b-0 sm:border-l sm:pl-3 sm:py-0.5 sm:first:border-l-0 sm:first:pl-0">
      <span className="text-encre">{libelle}</span>
      <span className="tabular-nums text-encre-douce">
        {valeur}
        <span className="ml-1 text-encre-tres-douce">({part} %)</span>
      </span>
    </li>
  );
}
