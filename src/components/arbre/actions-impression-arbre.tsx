'use client';

import { useCallback, useState } from 'react';

async function inlinerImagesSvg(svg: Element): Promise<SVGElement> {
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const images = clone.querySelectorAll('image');
  await Promise.all(
    [...images].map(async (img) => {
      const href =
        img.getAttribute('href') ??
        img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (!href || href.startsWith('data:')) return;

      try {
        const reponse = await fetch(href);
        if (!reponse.ok) return;
        const blob = await reponse.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const lecteur = new FileReader();
          lecteur.onload = () => resolve(lecteur.result as string);
          lecteur.onerror = reject;
          lecteur.readAsDataURL(blob);
        });
        img.setAttribute('href', dataUrl);
        img.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      } catch {
        /* garder l’URL d’origine */
      }
    })
  );

  return clone;
}

function telechargerSvg(clone: SVGElement, nom: string) {
  const src = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  lien.click();
  URL.revokeObjectURL(url);
}

/**
 * Boutons d'action pour la page imprimable.
 */
export function ActionsImpressionArbre({ nomFichier }: { nomFichier: string }) {
  const [lienCopie, setLienCopie] = useState(false);
  const [exportSvg, setExportSvg] = useState(false);

  const copierLien = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLienCopie(true);
      window.setTimeout(() => setLienCopie(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }, []);

  const telechargerSvgs = useCallback(async () => {
    const svgs = document.querySelectorAll('.arbre-impr-svg');
    if (!svgs.length) return;

    setExportSvg(true);
    try {
      const base = `arbre-${nomFichier}`;
      for (let i = 0; i < svgs.length; i++) {
        const clone = await inlinerImagesSvg(svgs[i]!);
        const suffix = svgs.length > 1 ? `-part-${i + 1}` : '';
        telechargerSvg(clone, `${base}${suffix}.svg`);
        if (i < svgs.length - 1) {
          await new Promise((r) => window.setTimeout(r, 300));
        }
      }
    } finally {
      setExportSvg(false);
    }
  }, [nomFichier]);

  return (
    <div className="arbre-impr-actions no-imprimer">
      <button
        type="button"
        className="imprimer-bouton-secondaire"
        onClick={copierLien}
        title="Copier l’adresse de cette vue (avec tous les réglages)"
      >
        {lienCopie ? 'Lien copié' : 'Copier le lien'}
      </button>
      <button
        type="button"
        className="imprimer-bouton-secondaire"
        onClick={telechargerSvgs}
        disabled={exportSvg}
        title="Télécharger le schéma au format SVG (portraits inclus si visibles)"
      >
        {exportSvg ? 'Export…' : 'Télécharger SVG'}
      </button>
      <button type="button" className="imprimer-bouton" onClick={() => window.print()}>
        Imprimer maintenant
      </button>
    </div>
  );
}
