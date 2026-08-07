import type { Metadata } from 'next';
import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { CoherenceAdmin } from '@/components/admin/coherence';
import { TableauBord } from '@/components/admin/tableau-bord';
import { DemandesEnAttente } from '@/components/admin/demandes-attente';
import { DemandesEcartees } from '@/components/admin/demandes-ecartees';
import { ListeMembres } from '@/components/admin/liste-membres';
import { JournalModifications } from '@/components/admin/journal-modifications';
import { DemandesPortrait } from '@/components/admin/demandes-portrait';
import type {
  DemandeAdmin,
  DemandePortraitAdmin,
  FicheArbre,
  LigneJournal,
  MembreAdmin,
} from '@/components/admin/vocabulaire';
import { chargerArbre } from '@/lib/arbre';
import { analyserChantiersEnAttente, analyserCoherence, completerRapportCoherence } from '@/lib/coherence';
import { exigerAdmin } from './garde';

/**
 * L'administration.
 *
 * L'inscription au site est libre, l'accès ne l'est pas : c'est ici que
 * l'administrateur arbitre. La page n'est pas protégée par le seul fait que le
 * lien n'apparaît pas ailleurs — `exigerAdmin()` refait le contrôle côté
 * serveur, et chaque Server Action le refait pour son compte.
 */

export const metadata: Metadata = { title: 'Administration' };

// Une demande peut arriver à tout instant : rien ici ne se met en cache.
export const dynamic = 'force-dynamic';

/** Les cent dernières écritures : au-delà, ce n'est plus un journal de famille. */
const ENTREES_JOURNAL = 100;

export default async function PageAdmin() {
  const { supabase, moi } = await exigerAdmin();

  // Le rapport de cohérence n'a besoin que du graphe — pas de signatures photo.
  const [
    membresRes,
    personnesRes,
    naissancesRes,
    journalRes,
    souvenirsRes,
    photosRes,
    portraitsRes,
    chantiersRes,
    arbre,
  ] = await Promise.all([
    supabase
      .from('membres')
      .select(
        'id, email, nom_affiche, role, statut, personne_id, lien_famille, message_demande, motif_refus, valide_le, cree_le'
      )
      .order('cree_le', { ascending: false }),

    supabase
      .from('personnes')
      .select('id, nom_complet, prenoms, nom', { count: 'exact' }),

    supabase.from('evenements').select('personne_id, annee').eq('type', 'naissance'),

    supabase
      .from('journal')
      .select('id, acteur_id, action, table_cible, ligne_id, cree_le')
      .order('cree_le', { ascending: false })
      .limit(ENTREES_JOURNAL),

    supabase.from('souvenirs').select('id', { count: 'exact', head: true }),

    supabase
      .from('medias')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'photo'),

    supabase
      .from('demandes_portrait_carte')
      .select('id, personne_id, media_id, demandeur_id, cree_le')
      .eq('statut', 'en_attente')
      .order('cree_le', { ascending: true }),

    supabase
      .from('chantiers_recherche')
      .select('id, statut, demande_le, reponse_le')
      .eq('statut', 'en_attente_reponse'),

    chargerArbre({ signerPhotosPour: 'aucun' }),
  ]);

  const rapport = completerRapportCoherence(
    analyserCoherence(arbre),
    analyserChantiersEnAttente(chantiersRes.data ?? [])
  );

  const membres = membresRes.data ?? [];

  const enAttente: DemandeAdmin[] = membres
    .filter((m) => m.statut === 'en_attente')
    .map(versDemande)
    // Les plus anciennes d'abord : on ne fait pas attendre indéfiniment.
    .reverse();

  const ecartees: DemandeAdmin[] = membres
    .filter((m) => m.statut === 'refuse')
    .map(versDemande);

  // Les comptes dont le sort est tranché : accès ouvert, ou accès suspendu.
  const comptes: MembreAdmin[] = membres
    .filter((m) => m.statut === 'valide' || m.statut === 'suspendu')
    .map((m) => ({
      id: m.id,
      email: m.email,
      nom_affiche: m.nom_affiche,
      role: m.role,
      statut: m.statut,
      personne_id: m.personne_id,
      lien_famille: m.lien_famille,
      valide_le: m.valide_le,
      cree_le: m.cree_le,
    }));

  // Année de naissance : c'est souvent le seul moyen de distinguer des
  // homonymes, fréquents quand le prénom du grand-père se transmet.
  const annees = new Map<string, number>();
  for (const e of naissancesRes.data ?? []) {
    if (e.personne_id && e.annee !== null && !annees.has(e.personne_id)) {
      annees.set(e.personne_id, e.annee);
    }
  }

  const fiches: FicheArbre[] = (personnesRes.data ?? [])
    .map((p) => {
      const annee = annees.get(p.id);
      return {
        id: p.id,
        libelle: p.nom_complet?.trim() || p.prenoms || p.nom || 'Sans nom',
        precision: annee ? String(annee) : null,
      };
    })
    .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));

  // Tous les membres sont chargés plus haut : mettre un nom sur l'auteur d'une
  // écriture ne coûte donc aucune requête de plus.
  const acteurs = new Map(membres.map((m) => [m.id, m.nom_affiche]));
  const entrees = journalRes.data ?? [];

  const journal: LigneJournal[] = entrees.map((e) => ({
    id: e.id,
    action: e.action,
    tableCible: e.table_cible,
    ligneId: e.ligne_id,
    creeLe: e.cree_le,
    acteur: e.acteur_id ? acteurs.get(e.acteur_id) ?? 'Compte supprimé' : null,
  }));

  const demandesBrutes = portraitsRes.data ?? [];
  const idsPersonnesPortrait = [...new Set(demandesBrutes.map((d) => d.personne_id))];
  const idsMediasPortrait = [...new Set(demandesBrutes.map((d) => d.media_id))];
  const idsDemandeurs = [...new Set(demandesBrutes.map((d) => d.demandeur_id))];

  const [personnesPortraitRes, mediasPortraitRes] = await Promise.all([
    idsPersonnesPortrait.length > 0
      ? supabase
          .from('personnes')
          .select('id, nom_complet, prenoms, nom, photo_id')
          .in('id', idsPersonnesPortrait)
      : Promise.resolve({
          data: [] as {
            id: string;
            nom_complet: string | null;
            prenoms: string | null;
            nom: string | null;
            photo_id: string | null;
          }[],
        }),
    idsMediasPortrait.length > 0
      ? supabase.from('medias').select('id, titre, chemin').in('id', idsMediasPortrait)
      : Promise.resolve({ data: [] as { id: string; titre: string | null; chemin: string }[] }),
  ]);

  const personnesPortraitData = personnesPortraitRes.data ?? [];
  const mediasDemandes = mediasPortraitRes.data ?? [];
  const idsPortraitsActuels = [
    ...new Set(
      personnesPortraitData
        .map((p) => p.photo_id)
        .filter((id): id is string => typeof id === 'string' && !idsMediasPortrait.includes(id))
    ),
  ];

  const portraitsActuelsRes =
    idsPortraitsActuels.length > 0
      ? await supabase.from('medias').select('id, chemin').in('id', idsPortraitsActuels)
      : { data: [] as { id: string; chemin: string }[] };

  const cheminParMedia = new Map<string, string>();
  for (const m of [...mediasDemandes, ...(portraitsActuelsRes.data ?? [])]) {
    cheminParMedia.set(m.id, m.chemin);
  }

  const urlsSignees =
    cheminParMedia.size > 0
      ? await supabase.storage
          .from('arbre-medias')
          .createSignedUrls([...cheminParMedia.values()], 3600)
      : { data: [] as { path: string | null; signedUrl: string | null }[] };

  const urlParChemin = new Map<string, string>();
  for (const entree of urlsSignees.data ?? []) {
    if (entree.path && entree.signedUrl) urlParChemin.set(entree.path, entree.signedUrl);
  }

  function urlMedia(mediaId: string | null | undefined): string | null {
    if (!mediaId) return null;
    const chemin = cheminParMedia.get(mediaId);
    return chemin ? (urlParChemin.get(chemin) ?? null) : null;
  }

  const photoIdParPersonne = new Map(
    personnesPortraitData.map((p) => [p.id, p.photo_id] as const)
  );

  const nomsPersonnes = new Map(
    (personnesPortraitRes.data ?? []).map((p) => [
      p.id,
      p.nom_complet?.trim() || p.prenoms || p.nom || 'Sans nom',
    ])
  );
  const titresMedias = new Map((mediasPortraitRes.data ?? []).map((m) => [m.id, m.titre]));
  const nomsDemandeurs = new Map(
    membres.filter((m) => idsDemandeurs.includes(m.id)).map((m) => [m.id, m.nom_affiche])
  );

  const portraitsEnAttente: DemandePortraitAdmin[] = demandesBrutes.map((d) => ({
    id: d.id,
    personneId: d.personne_id,
    nomPersonne: nomsPersonnes.get(d.personne_id) ?? 'Sans nom',
    mediaId: d.media_id,
    titrePhoto: titresMedias.get(d.media_id) ?? null,
    demandeur: nomsDemandeurs.get(d.demandeur_id) ?? 'Un membre',
    creeLe: d.cree_le,
    urlPhoto: urlMedia(d.media_id),
    urlPortraitActuel: urlMedia(photoIdParPersonne.get(d.personne_id)),
  }));

  const erreurChargement =
    membresRes.error ?? personnesRes.error ?? journalRes.error ?? portraitsRes.error ?? null;

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-10">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-encre-tres-douce">
            Administration
          </p>
          <h1 className="mt-2 text-3xl">Bonjour {moi.nom_affiche}</h1>
          <p className="mt-3 max-w-prose text-encre-douce">
            L’inscription au site est libre, l’accès ne l’est pas : l’arbre contient des
            photos de famille et des renseignements sur des personnes vivantes. C’est ici
            que se décide qui entre, et à quel titre.
          </p>
        </header>

        {erreurChargement && (
          <Alerte ton="erreur">
            Une partie des données n’a pas pu être chargée : {erreurChargement.message}
          </Alerte>
        )}

        <TableauBord
          personnes={personnesRes.count}
          souvenirs={souvenirsRes.count}
          photos={photosRes.count}
          enAttente={enAttente.length + portraitsEnAttente.length}
        />

        <CoherenceAdmin rapport={rapport} />

        <DemandesEnAttente demandes={enAttente} />

        <DemandesPortrait demandes={portraitsEnAttente} />

        <ListeMembres membres={comptes} fiches={fiches} moiId={moi.id} />

        <DemandesEcartees demandes={ecartees} />

        <JournalModifications entrees={journal} />
      </main>
    </>
  );
}

type LigneMembre = {
  id: string;
  email: string;
  nom_affiche: string;
  lien_famille: string | null;
  message_demande: string | null;
  motif_refus: string | null;
  cree_le: string;
};

function versDemande(m: LigneMembre): DemandeAdmin {
  return {
    id: m.id,
    email: m.email,
    nom_affiche: m.nom_affiche,
    lien_famille: m.lien_famille,
    message_demande: m.message_demande,
    motif_refus: m.motif_refus,
    cree_le: m.cree_le,
  };
}
