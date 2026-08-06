'use client';

/**
 * Cadreur 3:5 — le format du bandeau photo des cartes de l’arbre
 * (`LARGEUR_PHOTO_NOEUD` / `HAUTEUR_NOEUD` = 54 / 90).
 *
 * Le fichier exporté est déjà cadré (JPEG). Pan + zoom pour placer le visage ;
 * aperçu grandeur carte à côté.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Même rapport que la bande photo de la carte (54 × 90). */
export const RATIO_PORTRAIT_CARTE = 54 / 90;

const LARGEUR_EXPORT = 540;
const HAUTEUR_EXPORT = Math.round(LARGEUR_EXPORT / RATIO_PORTRAIT_CARTE);

type Props = {
  fichier: File;
  onValider: (fichierCadre: File, apercuUrl: string) => void;
  onAnnuler: () => void;
};

export function EditeurCadrage({ fichier, onValider, onAnnuler }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [echelle, setEchelle] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [glisse, setGlisse] = useState<{ x: number; y: number } | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      const couverture = Math.max(
        LARGEUR_EXPORT / img.naturalWidth,
        HAUTEUR_EXPORT / img.naturalHeight
      );
      setEchelle(couverture);
      setOffset({
        x: (LARGEUR_EXPORT - img.naturalWidth * couverture) / 2,
        y: (HAUTEUR_EXPORT - img.naturalHeight * couverture) / 2,
      });
    };
    img.onerror = () => setErreur('Cette image n’a pas pu être lue.');
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  const dessiner = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fond =
      getComputedStyle(document.documentElement).getPropertyValue('--fond-doux').trim() ||
      '#f3eee5';
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, LARGEUR_EXPORT, HAUTEUR_EXPORT);
    ctx.drawImage(
      image,
      offset.x,
      offset.y,
      image.naturalWidth * echelle,
      image.naturalHeight * echelle
    );

    const mini = miniRef.current;
    if (mini) {
      const mctx = mini.getContext('2d');
      if (mctx) {
        mini.width = 108;
        mini.height = 180;
        mctx.drawImage(canvas, 0, 0, mini.width, mini.height);
      }
    }
  }, [image, echelle, offset]);

  useEffect(() => {
    dessiner();
  }, [dessiner]);

  const bornerOffset = useCallback(
    (x: number, y: number, echelleLocale: number) => {
      if (!image) return { x, y };
      const w = image.naturalWidth * echelleLocale;
      const h = image.naturalHeight * echelleLocale;
      const minX = Math.min(0, LARGEUR_EXPORT - w);
      const minY = Math.min(0, HAUTEUR_EXPORT - h);
      return {
        x: Math.max(minX, Math.min(0, x)),
        y: Math.max(minY, Math.min(0, y)),
      };
    },
    [image]
  );

  function changerEchelle(nouvelle: number) {
    if (!image) return;
    const cx = LARGEUR_EXPORT / 2;
    const cy = HAUTEUR_EXPORT / 2;
    const facteur = nouvelle / echelle;
    const nx = cx - (cx - offset.x) * facteur;
    const ny = cy - (cy - offset.y) * facteur;
    setEchelle(nouvelle);
    setOffset(bornerOffset(nx, ny, nouvelle));
  }

  function surPointeurBas(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    setGlisse({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }

  function surPointeurMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!glisse) return;
    setOffset(bornerOffset(e.clientX - glisse.x, e.clientY - glisse.y, echelle));
  }

  function surPointeurHaut() {
    setGlisse(null);
  }

  async function valider() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    setExportEnCours(true);
    setErreur(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      );
      if (!blob) {
        setErreur('Le cadrage n’a pas pu être exporté.');
        return;
      }
      const nom = fichier.name.replace(/\.[^.]+$/, '') + '-carte.jpg';
      const cadre = new File([blob], nom, { type: 'image/jpeg' });
      const apercu = URL.createObjectURL(blob);
      onValider(cadre, apercu);
    } finally {
      setExportEnCours(false);
    }
  }

  const echelleMin = image
    ? Math.max(LARGEUR_EXPORT / image.naturalWidth, HAUTEUR_EXPORT / image.naturalHeight)
    : 1;
  const echelleMax = echelleMin * 3;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--rayon)] border border-bordure bg-fond-carte p-4">
      <div>
        <h2 className="text-lg">Cadrer pour la carte</h2>
        <p className="mt-1 text-sm text-encre-douce">
          Format 3 × 5 — le même que le bandeau photo de l’arbre. Glissez pour
          déplacer, réglez le zoom, puis validez.
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-center">
        <div className="overflow-hidden rounded-[var(--rayon-petit)] border border-bordure shadow-[var(--ombre-douce)]">
          <canvas
            ref={canvasRef}
            width={LARGEUR_EXPORT}
            height={HAUTEUR_EXPORT}
            className="block max-h-[min(70vh,420px)] w-auto max-w-full cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={surPointeurBas}
            onPointerMove={surPointeurMove}
            onPointerUp={surPointeurHaut}
            onPointerCancel={surPointeurHaut}
          />
        </div>

        <aside className="flex flex-col items-center gap-2">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-encre-tres-douce">
            Aperçu carte
          </p>
          <div
            className="overflow-hidden rounded-[var(--rayon-petit)] border border-bordure shadow-[var(--ombre-douce)]"
            style={{ width: 86, height: 144 }}
          >
            <canvas ref={miniRef} className="h-full w-full" aria-hidden />
          </div>
        </aside>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-encre">Zoom</span>
        <input
          type="range"
          min={echelleMin}
          max={echelleMax}
          step={0.01}
          value={Math.min(echelleMax, Math.max(echelleMin, echelle))}
          onChange={(e) => changerEchelle(Number(e.target.value))}
          disabled={!image}
          className="w-full accent-[var(--accent)]"
        />
      </label>

      {erreur && (
        <p role="alert" className="text-sm text-erreur">
          {erreur}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onAnnuler}
          className="rounded-[var(--rayon-petit)] border border-bordure px-4 py-2 text-sm text-encre-douce transition hover:bg-fond-doux"
        >
          Choisir une autre photo
        </button>
        <button
          type="button"
          onClick={() => void valider()}
          disabled={!image || exportEnCours}
          className="rounded-[var(--rayon-petit)] border border-accent bg-accent px-4 py-2 text-sm font-medium text-accent-contraste transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportEnCours ? 'Préparation…' : 'Valider le cadrage'}
        </button>
      </div>
    </div>
  );
}
