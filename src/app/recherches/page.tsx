import type { Metadata } from 'next';
import { Navigation } from '@/components/navigation';
import { Alerte } from '@/components/ui/champs';
import { Presentation } from '@/components/recherches/presentation';
import { TableauChantiers } from '@/components/recherches/tableau-chantiers';
import { ZoneOuverture } from '@/components/recherches/zone-ouverture';
import {
  joursDepuis,
  SEUIL_RELANCE,
  type ChantierVue,
  type PisteVue,
} from '@/components/recherches/vocabulaire';
import { creerClientServeur } from '@/lib/supabase/server';
import { listerUnionsSansEnfant } from '@/lib/unions-sans-enfant';

export const metadata: Metadata = { title: 'Chantiers de recherche' };

// Un chantier change d'état plusieurs fois par semaine : rien à mettre en cache.
export const dynamic = 'force-dynamic';

export default async function PageRecherches() {
  const supabase = await creerClientServeur();
  const { data: { user } } = await supabase.auth.getUser();

  const [chantiersRes, personnesRes, membresRes, moiRes, unionsSansEnfant] = await Promise.all([
    supabase.from('chantiers_recherche').select('*'),
    supabase.from('personnes').select('id, nom_complet, prenoms, nom, branches, niveaux_preuve'),
    supabase.from('membres').select('id, nom_affiche').eq('statut', 'valide'),
    user ? supabase.from('membres').select('role').eq('id', user.id).maybeSingle() : null,
    listerUnionsSansEnfant(supabase),
  ]);

  // Une table absente ou une politique plus stricte que prévu ne doit pas
  // renvoyer une page blanche : on le note au journal et on le dit à l'écran.
  if (chantiersRes.error) {
    console.error('Chantiers de recherche illisibles :', chantiersRes.error.message);
  }

  // Le droit d'écrire est tranché par les politiques RLS ; on ne s'en sert ici
  // que pour ne pas proposer un geste qui serait refusé par la base.
  const role = moiRes?.data?.role ?? null;
  const peutContribuer = role === 'admin' || role === 'contributeur';

  const personnes = (personnesRes.data ?? [])
    .map((p) => ({
      id: p.id,
      nom: p.nom_complet?.trim() || p.prenoms || p.nom || 'Personne sans nom',
      branches: p.branches ?? [],
      niveaux: p.niveaux_preuve ?? [],
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  const nomsPersonnes = new Map(personnes.map((p) => [p.id, p.nom]));

  const membres = (membresRes.data ?? [])
    .map((m) => ({ id: m.id, nom: m.nom_affiche }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const nomsMembres = new Map(membres.map((m) => [m.id, m.nom]));

  const chantiers: ChantierVue[] = (chantiersRes.data ?? []).map((c) => ({
    id: c.id,
    titre: c.titre,
    objectif: c.objectif,
    branche: c.branche,
    personne: c.personne_id
      ? { id: c.personne_id, nom: nomsPersonnes.get(c.personne_id) ?? 'Personne de l’arbre' }
      : null,
    organisme: c.organisme,
    reference: c.reference,
    statut: c.statut,
    blocage: c.blocage,
    priorite: c.priorite,
    assigneA: c.assigne_a ? nomsMembres.get(c.assigne_a) ?? null : null,
    demandeLe: c.demande_le,
    reponseLe: c.reponse_le,
    resultat: c.resultat,
  }));

  // Une personne déjà couverte par un chantier vivant n'est plus une piste à ouvrir.
  const dejaSuivies = new Set<string>();
  for (const chantier of chantiers) {
    if (chantier.personne && chantier.statut !== 'abandonnee') dejaSuivies.add(chantier.personne.id);
  }

  const pistes: PisteVue[] = personnes
    .filter((p) => p.niveaux.includes('a_trouver') && !dejaSuivies.has(p.id))
    .map((p) => ({ id: p.id, nom: p.nom, branches: p.branches }));

  const enAttente = chantiers.filter((c) => c.statut === 'en_attente_reponse');
  const aRelancer = enAttente.filter((c) => {
    const jours = joursDepuis(c.demandeLe);
    return jours !== null && jours >= SEUIL_RELANCE;
  });
  const abouties = chantiers.filter((c) => c.statut === 'aboutie');

  return (
    <>
      <Navigation />

      <main id="contenu-principal" className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <header>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl">Chantiers de recherche</h1>
            {peutContribuer && (
              <a href="#ouvrir-un-chantier" className="lien-discret text-sm">
                Ouvrir un chantier
              </a>
            )}
          </div>

          <p className="mt-3 max-w-3xl leading-relaxed text-encre-douce">
            Ce que la famille cherche encore : les actes demandés aux mairies et aux services
            d’archives, les branches qui butent sur un ancêtre sans parents connus, les hypothèses
            qui attendent leur preuve.
          </p>

          {chantiers.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-encre-douce">
              <span>
                {chantiers.length} chantier{chantiers.length > 1 ? 's' : ''}
              </span>
              <span aria-hidden className="text-encre-tres-douce">
                ·
              </span>
              <span>
                {enAttente.length} en attente d’une réponse
              </span>
              {aRelancer.length > 0 && (
                <>
                  <span aria-hidden className="text-encre-tres-douce">
                    ·
                  </span>
                  <span className="font-medium text-alerte">
                    {aRelancer.length} à relancer, sans réponse depuis plus de deux mois
                  </span>
                </>
              )}
              <span aria-hidden className="text-encre-tres-douce">
                ·
              </span>
              <span>
                {abouties.length} aboutie{abouties.length > 1 ? 's' : ''}
              </span>
            </p>
          )}
        </header>

        {chantiersRes.error ? (
          <Alerte ton="erreur">
            Les chantiers n’ont pas pu être chargés. Rechargez la page dans un instant ; si le
            problème dure, prévenez un administrateur de la famille.
          </Alerte>
        ) : chantiers.length === 0 ? (
          <Presentation peutContribuer={peutContribuer} />
        ) : (
          <TableauChantiers chantiers={chantiers} peutContribuer={peutContribuer} />
        )}

        <ZoneOuverture
          pistes={pistes}
          unionsSansEnfant={unionsSansEnfant}
          personnes={personnes.map((p) => ({ id: p.id, nom: p.nom }))}
          membres={membres}
          peutContribuer={peutContribuer}
        />
      </main>
    </>
  );
}
