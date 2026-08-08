'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type ReperePresentation = {
  id: string;
  nom: string;
  dates: string;
  photoUrl: string | null;
  branches: string[];
  preuves: string[];
  parents: string[];
  enfants: string[];
};

/** Lecture sur grand écran pour une réunion familiale. */
export function LecteurPresentation({ reperes }: { reperes: ReperePresentation[] }) {
  const [index, setIndex] = useState(0);
  const repere = reperes[index] ?? null;

  useEffect(() => {
    function naviguer(evenement: KeyboardEvent) {
      if (evenement.key === 'ArrowRight') {
        evenement.preventDefault();
        setIndex((actuel) => Math.min(actuel + 1, reperes.length - 1));
      }
      if (evenement.key === 'ArrowLeft') {
        evenement.preventDefault();
        setIndex((actuel) => Math.max(actuel - 1, 0));
      }
    }
    window.addEventListener('keydown', naviguer);
    return () => window.removeEventListener('keydown', naviguer);
  }, [reperes.length]);

  async function afficherEnPleinEcran() {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Le mode normal reste utilisable si le navigateur refuse le plein écran.
    }
  }

  if (!repere) {
    return <p className="carte p-6 leading-relaxed text-encre-douce">Aucun repère daté n’est encore disponible pour la présentation.</p>;
  }

  const precedent = index > 0;
  const suivant = index < reperes.length - 1;

  return (
    <section aria-label="Présentation familiale" className="carte overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bordure px-5 py-4 sm:px-7">
        <p className="text-sm text-encre-douce">Repère {index + 1} sur {reperes.length}</p>
        <button type="button" onClick={afficherEnPleinEcran} className="rounded-[var(--rayon-petit)] border border-bordure px-3 py-2 text-sm font-medium text-encre transition hover:bg-fond-doux">
          Plein écran
        </button>
      </div>

      <article className="grid gap-7 p-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:p-8">
        <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-[var(--rayon)] bg-fond-doux">
          {repere.photoUrl ? (
            // URL signée côté serveur pour cette consultation seulement.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={repere.photoUrl} alt="" className="h-full min-h-48 w-full object-cover" />
          ) : <span aria-hidden className="text-5xl text-encre-tres-douce">◌</span>}
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-accent">Repère familial</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">{repere.nom}</h2>
          <p className="mt-2 text-lg text-encre-douce">{repere.dates}</p>
          {repere.branches.length > 0 && <p className="mt-5 text-sm text-encre-douce">Branche : {repere.branches.join(', ')}.</p>}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Resume titre="Parents connus" valeurs={repere.parents} />
            <Resume titre="Enfants connus" valeurs={repere.enfants} />
          </dl>
          <p className="mt-6 text-sm leading-6 text-encre-douce">
            {repere.preuves.length > 0 ? `Niveaux de preuve renseignés : ${repere.preuves.join(', ')}.` : 'Aucun niveau de preuve n’est encore renseigné sur cette fiche.'}{' '}
            Cette présentation ne remplace pas la lecture des sources.
          </p>
          <Link href={`/personne/${repere.id}`} className="mt-5 inline-flex lien-discret">Consulter la fiche et ses sources →</Link>
        </div>
      </article>

      <nav aria-label="Changer de repère" className="flex items-center justify-between gap-4 border-t border-bordure bg-fond-doux px-5 py-4 sm:px-7">
        <button type="button" disabled={!precedent} onClick={() => setIndex((actuel) => Math.max(actuel - 1, 0))} className="rounded-[var(--rayon-petit)] border border-bordure px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45">← Précédent</button>
        <p className="hidden text-sm text-encre-douce sm:block">Utilisez aussi les flèches du clavier.</p>
        <button type="button" disabled={!suivant} onClick={() => setIndex((actuel) => Math.min(actuel + 1, reperes.length - 1))} className="rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 text-sm font-medium text-accent-contraste disabled:cursor-not-allowed disabled:opacity-45">Suivant →</button>
      </nav>
    </section>
  );
}

function Resume({ titre, valeurs }: { titre: string; valeurs: string[] }) {
  return (
    <div className="rounded-[var(--rayon-petit)] border border-bordure p-4">
      <dt className="text-sm font-medium text-encre">{titre}</dt>
      <dd className="mt-1 text-sm leading-6 text-encre-douce">{valeurs.length > 0 ? valeurs.join(', ') : 'Non renseignés'}</dd>
    </div>
  );
}
