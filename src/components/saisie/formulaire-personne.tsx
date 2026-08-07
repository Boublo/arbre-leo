'use client';

import { useActionState, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { enregistrerPersonne, modifierPersonne, type EtatPersonne } from '@/app/actions/personnes';
import { Alerte, BoutonEnvoi, Champ, ZoneTexte } from '@/components/ui/champs';
import { Bloc, CaseACocher, Selecteur } from '@/components/saisie/champs-saisie';
import { DateEvenement } from '@/components/saisie/date-evenement';
import { Rattachement } from '@/components/saisie/rattachement';
import { PREUVES, ORDRE_FIABILITE } from '@/lib/preuves';
import { SEXES, type PrecisionSaisie, type QualificatifSaisie } from '@/lib/saisie-personne';
import type {
  LiensExistants,
  OptionPersonne,
  OptionUnion,
  ValeursPersonne,
} from '@/components/saisie/donnees';
import type { NiveauPreuve, Sexe } from '@/lib/types-base';
import { sansAccent } from '@/lib/souvenirs-partage';

/**
 * La saisie d’une personne, du nom jusqu’au rattachement.
 *
 * Le formulaire est long parce qu’une vie l’est : on le lit par blocs, dans
 * l’ordre où l’on interroge un acte. Presque tout est facultatif — mieux vaut
 * une fiche à moitié remplie qu’une fiche inventée pour satisfaire un champ
 * obligatoire.
 *
 * Rien de ce qui est vérifié ici ne l’est pour la sécurité : la Server Action
 * revalide tout par zod, et les politiques RLS tranchent en dernier ressort.
 */

export type ModeSaisie = 'creation' | 'modification';

/** Une fiche à reprendre, plus les rattachements que l’adresse a pu suggérer. */
export type ValeursDepart = ValeursPersonne & { conjointId?: string; enfants?: string[] };

export function FormulairePersonne({
  mode,
  valeurs,
  personnes,
  unions,
  lieux,
  liens,
}: {
  mode: ModeSaisie;
  valeurs: ValeursDepart;
  personnes: OptionPersonne[];
  unions: OptionUnion[];
  lieux: string[];
  liens?: LiensExistants;
}) {
  const [etat, action] = useActionState<EtatPersonne, FormData>(
    mode === 'creation' ? enregistrerPersonne : modifierPersonne,
    {}
  );
  const idLieux = useId();
  const [prenomsSaisis, setPrenomsSaisis] = useState('');
  const [nomSaisi, setNomSaisi] = useState('');
  const [anneeNaissanceSaisie, setAnneeNaissanceSaisie] = useState('');
  const [lieuNaissanceSaisi, setLieuNaissanceSaisi] = useState('');

  // React vide les champs non contrôlés après chaque envoi. Le formulaire est
  // donc remonté avec ce que le serveur vient de nous rendre : une année
  // refusée ne doit pas emporter les vingt autres champs déjà remplis.
  const depart = fusionner(valeurs, etat.saisie);

  // La fiche est écrite mais quelque chose reste à dire — un lien qui n’a pas
  // pris, une date qui interroge. On retire le formulaire pour qu’on ne
  // l’envoie pas deux fois, et on laisse le chemin vers la fiche.
  if (etat.lienFiche) {
    return (
      <div className="flex flex-col gap-4">
        {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}
        {etat.avertissement && <Alerte ton="info">{etat.avertissement}</Alerte>}
        <p>
          <Link href={etat.lienFiche} className="lien-discret">
            Ouvrir sa fiche pour compléter →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form key={etat.essai ?? 0} action={action} className="flex flex-col gap-8">
      {depart.id && <input type="hidden" name="id" value={depart.id} />}

      <datalist id={idLieux}>
        {lieux.map((libelle) => (
          <option key={libelle} value={libelle} />
        ))}
      </datalist>

      <Bloc legende="Son identité" aide="Le nom seul suffit à créer la fiche ; le reste peut venir plus tard.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            label="Prénoms"
            name="prenoms"
            maxLength={160}
            defaultValue={depart.prenoms}
            onChange={(event) => setPrenomsSaisis(event.currentTarget.value)}
            aide="Tous les prénoms de l’acte, dans l’ordre."
          />
          <Champ
            label="Nom"
            name="nom"
            maxLength={120}
            defaultValue={depart.nom}
            onChange={(event) => setNomSaisi(event.currentTarget.value)}
            aide="Le nom porté à la fin de sa vie."
          />
        </div>

        <DoublonsPossibles
          prenoms={prenomsSaisis}
          nom={nomSaisi}
          anneeNaissance={anneeNaissanceSaisie}
          lieuNaissance={lieuNaissanceSaisi}
          personnes={personnes}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            label="Nom de naissance"
            name="nomNaissance"
            maxLength={120}
            defaultValue={depart.nomNaissance}
            aide="À renseigner s’il diffère du précédent."
          />
          <Champ
            label="Surnom"
            name="surnom"
            maxLength={120}
            defaultValue={depart.surnom}
            aide="Le nom sous lequel la famille la connaît."
          />
        </div>

        <Selecteur label="Sexe" name="sexe" defaultValue={depart.sexe}>
          {SEXES.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.libelle}
            </option>
          ))}
        </Selecteur>

        <CaseACocher
          name="presumeVivant"
          value="oui"
          defaultChecked={depart.presumeVivant}
          label="Personne présumée vivante"
          aide="Ce qui la concerne reste entre nous : la fiche porte alors un rappel de discrétion."
        />
      </Bloc>

      <DateEvenement
        prefixe="naissance"
        legende="Sa naissance"
        valeurs={depart.naissance}
        idLieux={idLieux}
        onChangerAnnee={setAnneeNaissanceSaisie}
        onChangerLieu={setLieuNaissanceSaisi}
      />

      <DateEvenement
        prefixe="deces"
        legende="Son décès"
        aide="À laisser vide pour une personne vivante."
        valeurs={depart.deces}
        idLieux={idLieux}
      />

      <DateEvenement
        prefixe="inhumation"
        legende="Son inhumation"
        aide="Cimetière ou lieu de repos. Utile pour commémorer et retrouver la tombe sur la carte."
        valeurs={depart.inhumation}
        idLieux={idLieux}
        aideLieu="Le nom du cimetière ou de la commune où repose la personne."
      />

      <Bloc legende="Ce qu’elle faisait, où elle vivait" aide="Facultatif l’un comme l’autre.">
        <Champ
          label="Profession"
          name="profession"
          maxLength={200}
          defaultValue={depart.profession}
          placeholder="cultivateur, institutrice, cheminot"
          aide="Le métier tel que l’acte le nomme, même s’il n’existe plus."
        />
        <Champ
          label="Résidence"
          name="residence"
          list={idLieux}
          maxLength={200}
          defaultValue={depart.residence}
          placeholder="Commune, département, pays"
          aide="Le lieu où elle a vécu, quand il diffère de celui de sa naissance."
        />
      </Bloc>

      <Rattachement
        personnes={personnes}
        unions={unions}
        valeurs={depart}
        soiMeme={depart.id}
        liens={liens}
      />

      <Bloc
        legende="Ce qui l’atteste"
        aide="Dites sur quoi vous vous appuyez. C’est ce qui distingue un arbre d’une liste de noms, et ce que relira quelqu’un dans dix ans."
      >
        <ul className="flex flex-col gap-2.5">
          {ORDRE_FIABILITE.map((niveau) => (
            <li key={niveau}>
              <CaseACocher
                name="preuves"
                value={niveau}
                defaultChecked={depart.preuves.includes(niveau)}
                label={PREUVES[niveau].libelle}
                aide={PREUVES[niveau].explication}
              />
            </li>
          ))}
        </ul>
      </Bloc>

      <ZoneTexte
        label="Notes"
        name="notes"
        rows={6}
        maxLength={20000}
        defaultValue={depart.notes}
        placeholder="Ce qui reste à vérifier, les hésitations, la référence d’un acte."
        aide="Les notes s’affichent en entier sur la fiche, retours à la ligne compris."
      />

      {etat.erreur && <Alerte ton="erreur">{etat.erreur}</Alerte>}
      {etat.avertissement && <Alerte ton="info">{etat.avertissement}</Alerte>}
      {etat.message && <Alerte ton="succes">{etat.message}</Alerte>}

      <div>
        <BoutonEnvoi enCours="Enregistrement…">
          {mode === 'creation' ? 'Enregistrer cette personne' : 'Enregistrer les modifications'}
        </BoutonEnvoi>
      </div>
    </form>
  );
}

/**
 * Un homonyme est un signal, jamais une consigne de fusion. Les années de vie
 * et le lieu, quand on les connaît, donnent à la famille de quoi trancher.
 */
function DoublonsPossibles({
  prenoms,
  nom,
  anneeNaissance,
  lieuNaissance,
  personnes,
}: {
  prenoms: string;
  nom: string;
  anneeNaissance: string;
  lieuNaissance: string;
  personnes: OptionPersonne[];
}) {
  const candidats = useMemo(() => {
    const nomNormalise = sansAccent(nom.trim());
    if (nomNormalise.length < 3) return [];

    const termes = [nomNormalise, sansAccent(prenoms.trim())].filter((terme) => terme.length >= 2);
    const annee = Number(anneeNaissance);
    const anneeConnue = Number.isInteger(annee) && annee >= 1200 && annee <= new Date().getFullYear();
    const motsLieu = sansAccent(lieuNaissance)
      .split(/[^a-z0-9]+/)
      .filter((mot) => mot.length >= 3);
    const memeLieu = (personne: OptionPersonne) => motsLieu.some((mot) => sansAccent(personne.repere).includes(mot));
    return personnes
      .filter((personne) => {
        const identite = sansAccent(personne.nomComplet);
        return termes.every((terme) => identite.includes(terme));
      })
      .sort((a, b) => {
        const ecartAnnee = anneeConnue
          ? Number(b.anneeNaissance === annee) - Number(a.anneeNaissance === annee)
          : 0;
        return ecartAnnee || Number(memeLieu(b)) - Number(memeLieu(a));
      })
      .slice(0, 5);
  }, [anneeNaissance, lieuNaissance, nom, personnes, prenoms]);

  if (candidats.length === 0) return null;

  return (
    <aside className="rounded-[var(--rayon-petit)] border border-accent/35 bg-accent-clair px-3 py-2.5 text-sm">
      <p className="font-medium text-encre">Vérifiez ces personnes avant de créer une nouvelle fiche</p>
      <p className="mt-1 text-encre-douce">
        Elles ont un nom proche. Ce sont peut-être des homonymes : aucun lien ne sera créé ou fusionné automatiquement.
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {candidats.map((personne) => (
          <li key={personne.id}>
            <Link href={`/personne/${personne.id}`} className="lien-discret">
              {personne.nomComplet}
              <span className="text-encre-douce"> — {personne.repere}</span>
              {personne.anneeNaissance === Number(anneeNaissance) && (
                <span className="text-encre-douce"> · même année de naissance</span>
              )}
              {partageLieuNaissance(personne, lieuNaissance) && (
                <span className="text-encre-douce"> · lieu de naissance proche</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function partageLieuNaissance(personne: OptionPersonne, lieu: string): boolean {
  const repere = sansAccent(personne.repere);
  return sansAccent(lieu)
    .split(/[^a-z0-9]+/)
    .some((mot) => mot.length >= 3 && repere.includes(mot));
}

// ---------------------------------------------------------------------------
// Reprise de la saisie après un refus
// ---------------------------------------------------------------------------

type ValeursCompletes = ValeursPersonne & { conjointId: string; enfants: string[] };

/** Ce que le serveur vient de renvoyer l’emporte sur les valeurs d’origine. */
function fusionner(valeurs: ValeursDepart, saisie?: Record<string, string>): ValeursCompletes {
  const base: ValeursCompletes = {
    ...valeurs,
    conjointId: valeurs.conjointId ?? '',
    enfants: valeurs.enfants ?? [],
  };
  if (!saisie) return base;

  const mot = (nom: string, defaut: string) => saisie[nom] ?? defaut;

  return {
    ...base,
    prenoms: mot('prenoms', base.prenoms),
    nom: mot('nom', base.nom),
    nomNaissance: mot('nomNaissance', base.nomNaissance),
    surnom: mot('surnom', base.surnom),
    sexe: lireSexe(saisie.sexe) ?? base.sexe,
    // Une case décochée ne figure pas dans l’envoi : son absence est la réponse.
    presumeVivant: saisie.presumeVivant === 'oui',
    naissance: lireDate('naissance', saisie, base.naissance),
    deces: lireDate('deces', saisie, base.deces),
    inhumation: lireDate('inhumation', saisie, base.inhumation),
    profession: mot('profession', base.profession),
    residence: mot('residence', base.residence),
    notes: mot('notes', base.notes),
    preuves: lireListe(saisie.preuves).filter((v): v is NiveauPreuve =>
      (ORDRE_FIABILITE as string[]).includes(v)
    ),
    unionParents: mot('unionParents', base.unionParents),
    pereId: mot('pereId', base.pereId),
    mereId: mot('mereId', base.mereId),
    natureFiliation: mot('natureFiliation', base.natureFiliation),
    conjointId: mot('conjointId', ''),
    enfants: lireListe(saisie.enfants),
  };
}

function lireDate(
  prefixe: string,
  saisie: Record<string, string>,
  defaut: ValeursPersonne['naissance']
): ValeursPersonne['naissance'] {
  return {
    qualificatif: lireQualificatif(saisie[`${prefixe}Qualificatif`]) ?? defaut.qualificatif,
    precision: lirePrecision(saisie[`${prefixe}Precision`]) ?? defaut.precision,
    annee: saisie[`${prefixe}Annee`] ?? defaut.annee,
    mois: saisie[`${prefixe}Mois`] ?? defaut.mois,
    jour: saisie[`${prefixe}Jour`] ?? defaut.jour,
    lieu: saisie[`${prefixe}Lieu`] ?? defaut.lieu,
  };
}

/** Les valeurs répétées voyagent jointes par une virgule : elles sont sans espace. */
function lireListe(valeur: string | undefined): string[] {
  if (!valeur) return [];
  return valeur.split(',').filter((v) => v !== '');
}

function lireSexe(valeur: string | undefined): Sexe | null {
  return valeur === 'M' || valeur === 'F' || valeur === 'inconnu' ? valeur : null;
}

function lireQualificatif(valeur: string | undefined): QualificatifSaisie | null {
  return valeur === 'exacte' || valeur === 'vers' || valeur === 'avant' || valeur === 'apres'
    ? valeur
    : null;
}

function lirePrecision(valeur: string | undefined): PrecisionSaisie | null {
  return valeur === 'jour' || valeur === 'mois' || valeur === 'annee' || valeur === 'inconnue'
    ? valeur
    : null;
}
