import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

export type EntreeSommaire = {
  niveau: 1 | 2;
  texte: string;
  ancre: string;
};

/**
 * Rendu Markdown minimal, sans dépendance.
 *
 * Titres `#` / `##` reçoivent une ancre stable pour le sommaire et l’impression
 * (audit v2.0 B9).
 */
export function extraireSommaire(texte: string): EntreeSommaire[] {
  const existantes = new Set<string>();
  const sommaire: EntreeSommaire[] = [];

  for (const brute of texte.replace(/\r\n?/g, '\n').split('\n')) {
    const ligne = brute.trimEnd();
    const titre2 = /^##\s+(.+)$/.exec(ligne);
    if (titre2) {
      const titre = titre2[1].trim();
      sommaire.push({ niveau: 2, texte: titre, ancre: ancreDepuisTitre(titre, existantes) });
      continue;
    }
    const titre1 = /^#\s+(.+)$/.exec(ligne);
    if (titre1) {
      const titre = titre1[1].trim();
      sommaire.push({ niveau: 1, texte: titre, ancre: ancreDepuisTitre(titre, existantes) });
    }
  }

  return sommaire;
}

export function RenduMarkdown({ texte }: { texte: string }) {
  const existantes = new Set<string>();
  const blocs = decouper(texte, existantes);
  return (
    <div className="flex flex-col gap-4">
      {blocs.map((b, i) => (
        <Bloc key={i} bloc={b} />
      ))}
    </div>
  );
}

export function TableDesMatieres({ entrees }: { entrees: EntreeSommaire[] }) {
  if (entrees.length < 2) return null;

  return (
    <nav aria-label="Sommaire" className="carte border border-bordure bg-fond-doux p-4">
      <h2 className="text-sm font-medium uppercase tracking-wider text-encre-tres-douce">
        Sommaire
      </h2>
      <ol className="mt-3 flex flex-col gap-1.5 text-sm">
        {entrees.map((e) => (
          <li key={e.ancre} className={e.niveau === 2 ? 'ml-4' : undefined}>
            <a href={`#${e.ancre}`} className="text-encre-douce transition hover:text-accent">
              {e.texte}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Découpage en blocs
// ---------------------------------------------------------------------------

type Bloc =
  | { sorte: 'titre'; niveau: 1 | 2; texte: string; ancre: string }
  | { sorte: 'liste'; elements: string[] }
  | { sorte: 'paragraphe'; lignes: string[] };

function decouper(source: string, existantes: Set<string>): Bloc[] {
  const lignes = source.replace(/\r\n?/g, '\n').split('\n');
  const blocs: Bloc[] = [];

  let paragraphe: string[] = [];
  let liste: string[] = [];

  const purger = () => {
    if (paragraphe.length > 0) {
      blocs.push({ sorte: 'paragraphe', lignes: paragraphe });
      paragraphe = [];
    }
    if (liste.length > 0) {
      blocs.push({ sorte: 'liste', elements: liste });
      liste = [];
    }
  };

  for (const brute of lignes) {
    const ligne = brute.trimEnd();

    if (ligne.trim() === '') {
      purger();
      continue;
    }

    const titre2 = /^##\s+(.+)$/.exec(ligne);
    if (titre2) {
      purger();
      const texte = titre2[1].trim();
      blocs.push({
        sorte: 'titre',
        niveau: 2,
        texte,
        ancre: ancreDepuisTitre(texte, existantes),
      });
      continue;
    }

    const titre1 = /^#\s+(.+)$/.exec(ligne);
    if (titre1) {
      purger();
      const texte = titre1[1].trim();
      blocs.push({
        sorte: 'titre',
        niveau: 1,
        texte,
        ancre: ancreDepuisTitre(texte, existantes),
      });
      continue;
    }

    const puce = /^-\s+(.+)$/.exec(ligne);
    if (puce) {
      if (paragraphe.length > 0) {
        blocs.push({ sorte: 'paragraphe', lignes: paragraphe });
        paragraphe = [];
      }
      liste.push(puce[1]);
      continue;
    }

    if (liste.length > 0) {
      blocs.push({ sorte: 'liste', elements: liste });
      liste = [];
    }
    paragraphe.push(ligne);
  }

  purger();
  return blocs;
}

function ancreDepuisTitre(texte: string, existantes: Set<string>): string {
  const base =
    texte
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';

  let ancre = base;
  let n = 2;
  while (existantes.has(ancre)) {
    ancre = `${base}-${n}`;
    n += 1;
  }
  existantes.add(ancre);
  return ancre;
}

// ---------------------------------------------------------------------------
// Rendu d'un bloc
// ---------------------------------------------------------------------------

function Bloc({ bloc }: { bloc: Bloc }) {
  if (bloc.sorte === 'titre') {
    if (bloc.niveau === 1) {
      return (
        <h2 id={bloc.ancre} className="scroll-mt-24 text-2xl leading-tight">
          {enrichir(bloc.texte)}
        </h2>
      );
    }
    return (
      <h3 id={bloc.ancre} className="scroll-mt-24 text-xl leading-tight">
        {enrichir(bloc.texte)}
      </h3>
    );
  }

  if (bloc.sorte === 'liste') {
    return (
      <ul className="list-disc pl-6 text-lg leading-relaxed text-encre marker:text-encre-tres-douce">
        {bloc.elements.map((el, i) => (
          <li key={i}>{enrichir(el)}</li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-lg leading-relaxed text-encre">
      {bloc.lignes.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {enrichir(l)}
        </Fragment>
      ))}
    </p>
  );
}

function enrichir(texte: string): ReactNode {
  const sortie: ReactNode[] = [];
  let tampon = '';
  let i = 0;
  let cle = 0;

  const purger = () => {
    if (tampon !== '') {
      sortie.push(tampon);
      tampon = '';
    }
  };

  while (i < texte.length) {
    if (texte.startsWith('**', i)) {
      const fin = texte.indexOf('**', i + 2);
      if (fin !== -1 && fin > i + 2) {
        purger();
        sortie.push(<strong key={`g${cle++}`}>{texte.slice(i + 2, fin)}</strong>);
        i = fin + 2;
        continue;
      }
    }

    if (texte[i] === '*' && texte[i + 1] !== '*') {
      const fin = texte.indexOf('*', i + 1);
      if (fin !== -1 && fin > i + 1) {
        purger();
        sortie.push(<em key={`i${cle++}`}>{texte.slice(i + 1, fin)}</em>);
        i = fin + 1;
        continue;
      }
    }

    tampon += texte[i];
    i += 1;
  }

  purger();
  return <>{sortie}</>;
}
