import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { chargerArbre, personneOuDefaut } from '@/lib/arbre';
import { urlImpressionArbre } from '@/lib/arbre-impression';
import { creerClientServeur } from '@/lib/supabase/server';

/**
 * Page d’export.
 *
 * On y explique ce que la famille peut emporter avec elle si un jour cette
 * application venait à disparaître : trois formats, trois usages, trois
 * fichiers téléchargeables. Le fond du propos tient en une ligne — la
 * famille reste propriétaire de ce qu’elle a versé —, mais on veut aussi
 * que chacun sache ce que contient exactement le fichier qu’il emporte,
 * et ce qu’il en va des personnes vivantes ou marquées confidentielles.
 */

export const metadata: Metadata = { title: 'Exporter l’arbre' };

// Le nombre de personnes bouge avec chaque saisie : rien à mettre en cache.
export const dynamic = 'force-dynamic';

type Format = {
  /** Étiquette de tête de la carte. */
  cle: 'gedcom' | 'csv' | 'json';
  /** Nom affiché du format. */
  nom: string;
  /** À qui c’est destiné : un mot très court, mis en évidence. */
  destination: string;
  /** À quoi il sert : une phrase, entrée en matière. */
  aQuoi: string;
  /** Ce qu’il contient, en points concrets. */
  contenu: string[];
  /** Route de téléchargement. */
  href: `/${string}`;
  /** Nombre d’octets estimé par personne exportée pour ce format. */
  octetsParPersonne: number;
};

const FORMATS: Format[] = [
  {
    cle: 'gedcom',
    nom: 'GEDCOM',
    destination: 'Pour un autre logiciel de généalogie',
    aQuoi:
      'Le format standard des logiciels de généalogie. Le fichier se rouvre tel quel dans Ancestris, Gramps, Heredis ou GeneaTique, avec les liens de parenté préservés.',
    contenu: [
      'Toutes les personnes, avec prénoms, nom, sexe et surnom.',
      'Les unions, filiations, événements de naissance, mariage et décès.',
      'Les lieux, avec commune, département, pays et coordonnées quand elles sont connues.',
      'Les niveaux de preuve — acte, INSEE, ANOM, mémoire, hypothèse — reportés en notes.',
    ],
    href: '/export/gedcom',
    // Un GEDCOM propre pèse en moyenne 500 octets par personne — noms,
    // dates, lieux et liens compris.
    octetsParPersonne: 500,
  },
  {
    cle: 'csv',
    nom: 'CSV',
    destination: 'Pour Excel ou LibreOffice Calc',
    aQuoi:
      'Un tableau où chaque ligne est une personne. À ouvrir dans un tableur pour trier, filtrer, compter, ou pour reprendre l’arbre à froid en dehors de l’application.',
    contenu: [
      'Une ligne par personne : prénoms, nom, sexe, branche.',
      'Dates et lieux de naissance, mariage et décès résumés en clair.',
      'Les identifiants des parents et du conjoint, pour recroiser les lignes entre elles.',
      'Une colonne « niveaux de preuve » et une colonne « présumé vivant ».',
    ],
    href: '/export/csv',
    // Une ligne CSV — texte plat, peu de colonnes — tient à peu près en
    // 200 octets par personne.
    octetsParPersonne: 200,
  },
  {
    cle: 'json',
    nom: 'JSON',
    destination: 'Pour un développeur ou une migration',
    aQuoi:
      'Le fichier complet, structuré, tel que l’application le manipule en interne. À réserver aux migrations vers un autre outil, aux sauvegardes techniques et aux traitements par script.',
    contenu: [
      'La structure entière : personnes, unions, filiations, événements, lieux, sources.',
      'Chaque champ tel qu’il vit en base — dates éclatées en année, mois, jour et qualificatif.',
      'Les liens entre tables conservés par identifiant.',
      'Les souvenirs et les rattachements de personnes à des faits historiques.',
    ],
    href: '/export/json',
    // Le JSON complet — imbrications, guillemets, clés répétées à chaque
    // ligne — pèse plus lourd : environ 800 octets par personne.
    octetsParPersonne: 800,
  },
];

export default async function PageExport() {
  const supabase = await creerClientServeur();

  const [personnesRes, moiRes] = await Promise.all([
    supabase.from('personnes').select('id', { count: 'exact', head: true }),
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      return supabase.from('membres').select('role').eq('id', user.id).maybeSingle();
    })(),
  ]);

  const nombrePersonnes = personnesRes.count ?? 0;
  const estAdmin = moiRes?.data?.role === 'admin';

  const donnees = await chargerArbre({ signerPhotosPour: 'aucun' });
  const focus = personneOuDefaut(donnees, undefined);
  const lienImpression = focus ? urlImpressionArbre(focus.id, 'ascendance') : '/arbre/imprimer';

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <header>
          <h1 className="text-3xl">Exporter l’arbre</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-encre-douce">
            Ce que la famille a versé lui appartient. Cette page vous permet
            d’en repartir avec une copie complète, dans trois formats, pour que
            l’arbre ne dépende jamais du fonctionnement de cette application.
          </p>
          <p className="mt-3 max-w-2xl leading-relaxed text-encre-douce">
            Une sauvegarde régulière — au moins une fois par an, ou après une
            saison de recherches nourrie — est vivement recommandée. Gardez au
            moins un fichier GEDCOM en lieu sûr : c’est celui qui traversera
            les logiciels et les décennies.
          </p>
        </header>

        <section aria-labelledby="formats-titre" className="mt-10 flex flex-col gap-5">
          <h2 id="formats-titre" className="sr-only">
            Les trois formats disponibles
          </h2>

          {FORMATS.map((format) => (
            <CarteFormat
              key={format.cle}
              format={format}
              nombrePersonnes={nombrePersonnes}
            />
          ))}
        </section>

        <section aria-labelledby="impression-titre" className="mt-10">
          <h2 id="impression-titre" className="text-xl">
            Vue imprimable de l’arbre
          </h2>
          <article className="carte mt-4 flex flex-col gap-4 p-6 sm:p-7">
            <p className="leading-relaxed text-encre-douce">
              Pour un poster, un livret de famille ou une réunion, la vue imprimable
              prépare un schéma lisible sur papier : choisissez la personne de départ,
              la profondeur, le format paysage ou portrait, puis imprimez ou enregistrez
              en PDF depuis votre navigateur.
            </p>
            <ul className="flex flex-col gap-1.5 text-sm text-encre-douce">
              <li className="flex gap-2 leading-relaxed">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-encre-tres-douce" />
                <span>Quatre modes de lecture — ascendance, famille, descendance, tout l’entourage.</span>
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-encre-tres-douce" />
                <span>Découpage automatique en plusieurs pages pour les grands arbres.</span>
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-encre-tres-douce" />
                <span>Export SVG et liste alphabétique des personnes affichées.</span>
              </li>
            </ul>
            <p>
              <Link
                href={lienImpression}
                className="inline-flex rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste transition hover:brightness-110"
              >
                Ouvrir la vue imprimable
              </Link>
            </p>
          </article>
        </section>

        <aside className="carte mt-10 p-5 text-sm leading-relaxed text-encre-douce">
          <h2 className="text-base text-encre">Ce qui n’est pas exporté à tout le monde</h2>
          <p className="mt-2">
            Les personnes marquées{' '}
            <span className="font-medium text-encre">confidentielles</span> ne
            sortent que dans les exports faits par un administrateur de la
            famille. Pour les autres membres, elles sont écartées du fichier,
            comme elles le sont de l’arbre affiché à l’écran.
          </p>
          <p className="mt-2">
            Pour les personnes{' '}
            <span className="font-medium text-encre">présumées vivantes</span>,
            les dates précises de naissance sont floutées à l’année dans les
            exports des non-administrateurs, et les lieux sont ramenés au
            département. Les admins récupèrent le fichier complet.
          </p>
          {estAdmin ? (
            <p className="mt-3 text-encre">
              Vous êtes administrateur : les fichiers que vous téléchargez
              contiennent l’intégralité des données, y compris les fiches
              confidentielles et les dates précises des vivants.
            </p>
          ) : (
            <p className="mt-3">
              Vous n’êtes pas administrateur : les fichiers que vous
              téléchargerez seront filtrés selon ces règles.
            </p>
          )}
        </aside>
      </main>
    </>
  );
}

/**
 * Une carte par format. Titre à gauche, bouton à droite, contenu détaillé
 * en dessous. La taille estimée est donnée à titre indicatif — un fichier
 * réel varie selon la longueur des noms, des notes, des lieux.
 */
function CarteFormat({
  format,
  nombrePersonnes,
}: {
  format: Format;
  nombrePersonnes: number;
}) {
  const tailleEstimee = estimerTaille(nombrePersonnes * format.octetsParPersonne);

  return (
    <article className="carte flex flex-col gap-4 p-6 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h3 className="text-xl">{format.nom}</h3>
          <p className="mt-0.5 text-sm text-encre-tres-douce">{format.destination}</p>
        </div>
        <Link
          href={format.href}
          className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 font-medium text-accent-contraste
                     transition hover:brightness-110"
        >
          Télécharger
        </Link>
      </header>

      <p className="leading-relaxed text-encre-douce">{format.aQuoi}</p>

      <div>
        <p className="text-sm font-medium text-encre">Ce que contient le fichier</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-encre-douce">
          {format.contenu.map((ligne) => (
            <li key={ligne} className="flex gap-2 leading-relaxed">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-encre-tres-douce" />
              <span>{ligne}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-encre-tres-douce">
        Taille estimée pour {nombrePersonnes} personne
        {nombrePersonnes > 1 ? 's' : ''} : environ {tailleEstimee}.
      </p>
    </article>
  );
}

/**
 * Rend un nombre d’octets en unité familière : « 12 ko », « 1,4 Mo ». On
 * arrondit avec parcimonie, et on tolère la virgule française pour les Mo.
 */
function estimerTaille(octets: number): string {
  if (octets <= 0) return '—';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`;
  const mo = octets / (1024 * 1024);
  const arrondi = mo >= 10 ? Math.round(mo) : Math.round(mo * 10) / 10;
  return `${String(arrondi).replace('.', ',')} Mo`;
}
