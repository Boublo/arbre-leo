/**
 * Test unitaire léger — rappels et lieux de commémoration.
 *   npx tsx scripts/test-rappels-anniversaires.ts
 */
import type { PersonneArbre } from '../src/lib/arbre';
import { genererHtmlRappelAnniversaire } from '../src/lib/email-rappel-anniversaire';
import { lieuCommemoration } from '../src/lib/lieu-commemoration';
import { ephemeridesVersEntreesEmail } from '../src/lib/rappels-anniversaires';
import { ephemeridesDeCeJour } from '../src/lib/ephemerides';
import type { DonneesArbre } from '../src/lib/arbre';

function personne(partial: Partial<PersonneArbre> & { id: string; nomComplet: string }): PersonneArbre {
  return {
    id: partial.id,
    codeGedcom: null,
    prenoms: partial.nomComplet,
    nom: null,
    nomComplet: partial.nomComplet,
    surnom: null,
    sexe: partial.sexe ?? 'M',
    branches: [],
    niveauxPreuve: [],
    presumeVivant: partial.presumeVivant ?? false,
    notes: null,
    photoId: null,
    photoUrl: null,
    naissance: partial.naissance ?? null,
    deces: partial.deces ?? null,
    inhumation: partial.inhumation ?? null,
    profession: null,
    unions: [],
    issuDe: null,
    descendanceIncomplete: false,
  };
}

// Lieu d'inhumation prioritaire
const p1 = personne({
  id: 'a',
  nomComplet: 'Alphonse SUIRE',
  deces: { annee: 1934, mois: 8, jour: 9, texte: '', lieu: 'Bègues', lieuCourt: 'Bègues', lieuId: null },
  inhumation: {
    annee: 1934,
    mois: 8,
    jour: 10,
    texte: '',
    lieu: 'Cimetière de Bègues, Landes',
    lieuCourt: 'Cimetière de Bègues',
    lieuId: 'lieu-1',
  },
});
const lieu = lieuCommemoration(p1);
if (!lieu || lieu.source !== 'inhumation' || !lieu.libelle.includes('Cimetière')) {
  throw new Error('lieuCommemoration devrait préférer l’inhumation');
}

// Éphéméride décès avec lieu dans l’email
const donnees: DonneesArbre = {
  personnes: new Map([[p1.id, p1]]),
  unions: new Map(),
  parents: new Map(),
  enfants: new Map(),
};
const ephemerides = ephemeridesDeCeJour(donnees, new Date(2026, 7, 9));
if (ephemerides.length !== 1 || ephemerides[0]?.type !== 'deces') {
  throw new Error('Éphéméride décès attendue le 9 août');
}
const entrees = ephemeridesVersEntreesEmail(ephemerides, 'https://arbre.modulyx.eu');
if (!entrees[0]?.lieuCommemoration?.includes('Cimetière')) {
  throw new Error('Le lieu de commémoration doit figurer dans l’entrée email');
}

const html = genererHtmlRappelAnniversaire({
  prenomDestinataire: 'Marie',
  dateLabel: '9 août',
  entrees,
  lienCalendrier: 'https://arbre.modulyx.eu/aujourdhui',
  lienPreferences: 'https://arbre.modulyx.eu/notifications',
});
if (!html.includes('Cimetière de Bègues')) {
  throw new Error('Le HTML email doit mentionner le cimetière');
}

console.log('OK — test rappels anniversaires (lieu commémoration + email)');
