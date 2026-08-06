import { Fragment, type ReactNode } from 'react';

/**
 * Rendu Markdown minimal, sans dépendance.
 *
 * Le corps d'un récit est écrit en Markdown : la famille en connaît la syntaxe
 * pour l'avoir vu passer partout, et l'on ne veut pas peser un mégaoctet de
 * plus pour trois signes de balisage. On reconnaît :
 *   - `# titre`, `## sous-titre`
 *   - `**gras**`, `*italique*`
 *   - listes `-` en début de ligne
 *   - paragraphes séparés par une ligne vide
 *
 * Tout le reste est rendu tel quel, en respectant les sauts de ligne : ce qui
 * n'est pas prévu ne passe pas en HTML. C'est un contrat volontairement pauvre
 * pour un dépôt public où l'on ne veut prendre aucun risque d'injection.
 */
export function RenduMarkdown({ texte }: { texte: string }) {
  const blocs = decouper(texte);
  return (
    <div className="flex flex-col gap-4">
      {blocs.map((b, i) => (
        <Bloc key={i} bloc={b} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Découpage en blocs
// ---------------------------------------------------------------------------

type Bloc =
  | { sorte: 'titre'; niveau: 1 | 2; texte: string }
  | { sorte: 'liste'; elements: string[] }
  | { sorte: 'paragraphe'; lignes: string[] };

function decouper(source: string): Bloc[] {
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
      blocs.push({ sorte: 'titre', niveau: 2, texte: titre2[1] });
      continue;
    }

    const titre1 = /^#\s+(.+)$/.exec(ligne);
    if (titre1) {
      purger();
      blocs.push({ sorte: 'titre', niveau: 1, texte: titre1[1] });
      continue;
    }

    const puce = /^-\s+(.+)$/.exec(ligne);
    if (puce) {
      // Une liste interrompt un paragraphe en cours : on rince l'un avant l'autre.
      if (paragraphe.length > 0) {
        blocs.push({ sorte: 'paragraphe', lignes: paragraphe });
        paragraphe = [];
      }
      liste.push(puce[1]);
      continue;
    }

    // Une ligne ordinaire ferme une liste ouverte pour rejoindre le paragraphe.
    if (liste.length > 0) {
      blocs.push({ sorte: 'liste', elements: liste });
      liste = [];
    }
    paragraphe.push(ligne);
  }

  purger();
  return blocs;
}

// ---------------------------------------------------------------------------
// Rendu d'un bloc
// ---------------------------------------------------------------------------

function Bloc({ bloc }: { bloc: Bloc }) {
  if (bloc.sorte === 'titre') {
    if (bloc.niveau === 1) {
      return <h2 className="text-2xl leading-tight">{enrichir(bloc.texte)}</h2>;
    }
    return <h3 className="text-xl leading-tight">{enrichir(bloc.texte)}</h3>;
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

// ---------------------------------------------------------------------------
// Rendu en ligne (gras, italique)
// ---------------------------------------------------------------------------

/**
 * Applique **gras** et *italique* en une passe. Le tokeniseur reste défensif :
 * un astérisque orphelin est rendu tel quel plutôt que de tout casser.
 */
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
    // Gras : **…**
    if (texte.startsWith('**', i)) {
      const fin = texte.indexOf('**', i + 2);
      if (fin !== -1 && fin > i + 2) {
        purger();
        sortie.push(<strong key={`g${cle++}`}>{texte.slice(i + 2, fin)}</strong>);
        i = fin + 2;
        continue;
      }
    }

    // Italique : *…* (mais pas ** déjà géré)
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
