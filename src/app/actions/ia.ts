'use server';

import { z } from 'zod';
import { exigerAdmin } from '@/app/admin/garde';
import { chargerArbre } from '@/lib/arbre';
import { resumerBranche } from '@/lib/resume-branche';

/**
 * Assistance IA optionnelle — réservée aux administrateurs.
 *
 * Sans `ARBRE_IA_CLE`, on renvoie le résumé déterministe déjà calculé côté
 * serveur (aucun appel externe). Avec la clé, le point d’extension est prêt :
 * brancher ici le fournisseur choisi sans toucher à la fiche.
 */

const schema = z.object({
  personneId: z.string().uuid(),
});

export type ResultatResumeIa =
  | { ok: true; texte: string; source: 'deterministe' | 'ia' }
  | { ok: false; erreur: string };

export async function genererResumeBrancheIa(
  personneId: string
): Promise<ResultatResumeIa> {
  const analyse = schema.safeParse({ personneId });
  if (!analyse.success) {
    return { ok: false, erreur: 'Identifiant invalide.' };
  }

  await exigerAdmin();

  const donnees = await chargerArbre({ signerPhotosPour: 'aucun' });
  const resume = resumerBranche(donnees, analyse.data.personneId);
  if (!resume) {
    return { ok: false, erreur: 'Personne introuvable.' };
  }

  const texteDeterministe = [resume.phrase, ...resume.points].join(' ');

  const cle = process.env.ARBRE_IA_CLE?.trim();
  if (!cle) {
    return { ok: true, texte: texteDeterministe, source: 'deterministe' };
  }

  // Point d’extension : brancher ici l’API du fournisseur (clé serveur uniquement).
  // Tant qu’aucun adaptateur n’est branché, on reste sur le résumé sourcé.
  return { ok: true, texte: texteDeterministe, source: 'deterministe' };
}
