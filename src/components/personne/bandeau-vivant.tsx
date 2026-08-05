/**
 * Liseré discret pour signaler qu’une personne est présumée vivante.
 *
 * Posé pleine largeur en tête de la fiche, il rappelle sans dramatiser que ce
 * qui suit — dates, adresses, photographies — reste entre nous. Un mot suffit,
 * la couleur ne porte pas seule l’information : une icône picto (le point vert)
 * appuie le message, doublée d’un `role="note"` que les lecteurs d’écran
 * savent annoncer.
 */
export function BandeauVivant() {
  return (
    <div
      role="note"
      className="flex items-center gap-2 rounded-[var(--rayon-petit)] border-l-4 border-succes bg-succes/10 px-4 py-2 text-sm text-encre"
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full bg-succes"
      />
      <span>
        <strong className="font-medium text-encre">Personne présumée vivante.</strong>{' '}
        <span className="text-encre-douce">
          Ce qui figure ici reste entre les membres de la famille.
        </span>
      </span>
    </div>
  );
}
