import type { Metadata } from 'next';
import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { TableauBord } from '@/components/admin/tableau-bord';
import { DemandesEnAttente } from '@/components/admin/demandes-attente';
import { DemandesEcartees } from '@/components/admin/demandes-ecartees';
import { ListeMembres } from '@/components/admin/liste-membres';
import { JournalModifications } from '@/components/admin/journal-modifications';
import type {
  DemandeAdmin,
  FicheArbre,
  LigneJournal,
  MembreAdmin,
} from '@/components/admin/vocabulaire';
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

  const [membresRes, personnesRes, naissancesRes, journalRes, souvenirsRes, photosRes] =
    await Promise.all([
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
    ]);

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

  const erreurChargement = membresRes.error ?? personnesRes.error ?? journalRes.error ?? null;

  return (
    <>
      <Navigation />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-10">
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
          enAttente={enAttente.length}
        />

        <DemandesEnAttente demandes={enAttente} />

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
