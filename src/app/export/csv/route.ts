import { NextResponse } from 'next/server';
import { creerClientServeur } from '@/lib/supabase/server';
import { formaterDate } from '@/lib/arbre';
import type { TypeEvenement } from '@/lib/types-base';

/**
 * Export CSV — une ligne par personne, colonnes simples.
 *
 * C’est la sortie de secours pour Excel : le tableur ouvre le fichier, la
 * famille imprime ou trie. Le CSV est écrit à la main pour ne pas tirer de
 * dépendance et pour maîtriser l’échappement — le BOM en tête sert à Excel
 * pour reconnaître l’UTF-8 sans qu’on ait à passer par un menu.
 *
 * Le tri des accès reste celui des politiques RLS : cette route ne s’ouvre
 * qu’aux membres validés, et les personnes confidentielles comme les dates
 * des vivants sont mises de côté pour qui n’est pas administrateur.
 */

/** Colonnes du fichier, dans l’ordre où elles sortent. */
const COLONNES = [
  'code_gedcom',
  'prenoms',
  'nom',
  'sexe',
  'branche',
  'naissance_date',
  'naissance_lieu',
  'deces_date',
  'deces_lieu',
  'profession',
  'niveaux_preuve',
] as const;

/** Types d’événements retenus : la fiche complète reste sur la page personne. */
const TYPES_RETENUS: TypeEvenement[] = ['naissance', 'deces', 'profession'];

/**
 * Encapsule un champ selon la règle RFC 4180 : si le texte contient une virgule,
 * un guillemet ou un saut de ligne, on l’entoure de guillemets et on double les
 * guillemets internes.
 */
function echapperCsv(valeur: string): string {
  if (/[",\r\n]/.test(valeur)) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

type LigneEvenement = {
  personne_id: string | null;
  type: string;
  annee: number | null;
  mois: number | null;
  jour: number | null;
  annee_fin: number | null;
  qualificatif: string | null;
  date_texte: string | null;
  detail: string | null;
  lieux: { libelle: string } | null;
};

export async function GET() {
  const supabase = await creerClientServeur();

  // La barrière d’accès : proxy.ts a déjà écarté les non-connectés et les
  // comptes non validés, on redemande à la base pour ne rien supposer.
  const { data: estMembre } = await supabase.rpc('est_membre_valide');
  if (estMembre !== true) {
    return new NextResponse('Accès réservé aux membres validés.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const { data: estAdminData } = await supabase.rpc('est_admin');
  const estAdmin = estAdminData === true;

  const [personnesRes, evenementsRes] = await Promise.all([
    supabase
      .from('personnes')
      .select(
        'id, code_gedcom, prenoms, nom, sexe, branches, niveaux_preuve, presume_vivant, confidentiel'
      )
      .order('code_gedcom', { ascending: true, nullsFirst: false }),
    supabase
      .from('evenements')
      .select(
        'personne_id, type, annee, mois, jour, annee_fin, qualificatif, date_texte, detail, lieux(libelle)'
      )
      .in('type', TYPES_RETENUS),
  ]);

  const erreur = personnesRes.error ?? evenementsRes.error;
  if (erreur) {
    return new NextResponse(`Export CSV impossible : ${erreur.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const evenementsParPersonne = new Map<string, LigneEvenement[]>();
  for (const e of (evenementsRes.data ?? []) as unknown as LigneEvenement[]) {
    if (!e.personne_id) continue;
    const liste = evenementsParPersonne.get(e.personne_id) ?? [];
    liste.push(e);
    evenementsParPersonne.set(e.personne_id, liste);
  }

  const lignes: string[] = [];
  lignes.push(COLONNES.map((nom) => echapperCsv(nom)).join(','));

  for (const p of personnesRes.data ?? []) {
    // Défense en profondeur : la RLS écarte déjà les fiches confidentielles
    // pour un non-admin, on redouble le tri au cas où.
    if (!estAdmin && p.confidentiel) continue;

    const evts = evenementsParPersonne.get(p.id) ?? [];
    const naissance = evts.find((e) => e.type === 'naissance');
    const deces = evts.find((e) => e.type === 'deces');
    const profession = evts.find((e) => e.type === 'profession');

    // Discrétion sur les vivants : dates et lieux masqués pour les non-admins.
    const masquerDates = !estAdmin && p.presume_vivant;

    const cellules: string[] = [
      p.code_gedcom ?? '',
      p.prenoms ?? '',
      p.nom ?? '',
      p.sexe ?? '',
      (p.branches ?? []).join('|'),
      masquerDates ? '' : naissance ? formaterDate(naissance) : '',
      masquerDates ? '' : naissance?.lieux?.libelle ?? '',
      masquerDates ? '' : deces ? formaterDate(deces) : '',
      masquerDates ? '' : deces?.lieux?.libelle ?? '',
      profession?.detail ?? '',
      (p.niveaux_preuve ?? []).join('|'),
    ];

    lignes.push(cellules.map(echapperCsv).join(','));
  }

  // BOM UTF-8 (U+FEFF) en tête pour qu’Excel ouvre le fichier sans détour de menu.
  const contenu = `﻿${lignes.join('\r\n')}\r\n`;

  return new NextResponse(contenu, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="arbre-leo.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
