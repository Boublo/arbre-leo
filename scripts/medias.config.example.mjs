/**
 * Actes et photographies à verser dans le stockage privé.
 *
 * Copier ce fichier en `medias.config.mjs` — non versionné — et le remplir.
 * Les chemins sont résolus depuis le dossier `scripts/`.
 *
 * `personnes` liste les noms tels qu'ils figurent dans l'arbre ; le script les
 * retrouve même si l'orthographe diffère un peu, et signale ceux qu'il ne
 * reconnaît pas plutôt que de rattacher au hasard.
 *
 * `type` vaut 'acte', 'photo', 'document', 'audio' ou 'video'.
 */
export const MEDIAS = [
  {
    fichier: '../../un-acte-de-naissance.jpg',
    type: 'acte',
    titre: 'Acte de naissance de …, 1886',
    description: "Registre des naissances, acte n° 00.",
    annee: 1886,
    cote: 'n° 00',
    depot: 'Archives départementales',
    transcription: "Transcription intégrale de l'acte, si elle a été faite.",
    personnes: ['Prénom NOM'],
  },
  {
    fichier: '../../une-photo-de-famille.jpg',
    type: 'photo',
    titre: 'Photographie de famille',
    annee: 1960,
    personnes: ['Prénom NOM', 'Autre Prénom NOM'],
  },
];
