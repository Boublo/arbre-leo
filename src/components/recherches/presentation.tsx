import { COLONNES } from '@/components/recherches/vocabulaire';

/**
 * Ce qu'on affiche tant qu'aucun chantier n'existe.
 *
 * Un tableau vide ne dit rien à celui qui arrive ; mieux vaut expliquer la
 * mécanique, d'autant qu'elle n'a rien d'évident pour qui n'a jamais écrit à
 * un service d'état civil.
 */
export function Presentation({ peutContribuer }: { peutContribuer: boolean }) {
  return (
    <section aria-labelledby="a-quoi-sert" className="carte flex flex-col gap-5 p-6">
      <div className="max-w-2xl">
        <h2 id="a-quoi-sert" className="text-xl">
          Aucun chantier n’est encore ouvert
        </h2>
        <p className="mt-3 leading-relaxed text-encre-douce">
          Un arbre généalogique n’avance pas tout seul : il avance par demandes. Un acte de décès
          réclamé à une mairie, un registre à dépouiller aux archives départementales, une
          hypothèse de filiation qu’il faut confirmer avant de l’inscrire. Ces démarches durent des
          semaines, passent d’une personne à l’autre, et s’oublient.
        </p>
        <p className="mt-3 leading-relaxed text-encre-douce">
          Cette page en tient le registre. Chaque chantier dit ce qu’on cherche, à qui la demande a
          été adressée, depuis combien de temps elle attend — et, le jour où la réponse arrive, ce
          qu’elle a appris. C’est cette dernière ligne qui évite de redemander deux fois le même
          acte.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COLONNES.map((colonne, rang) => (
          <li
            key={colonne.statut}
            className="rounded-[var(--rayon-petit)] border border-bordure bg-fond-doux p-3"
          >
            <p className="flex items-center gap-2 text-sm font-medium text-encre">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: colonne.ton }}
              />
              {rang + 1}. {colonne.libelle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-encre-douce">{colonne.aide}</p>
          </li>
        ))}
      </ol>

      <p className="text-sm text-encre-tres-douce">
        {peutContribuer
          ? 'Le premier chantier s’ouvre ci-dessous. Les personnes dont l’arbre ne connaît que le nom sont listées à côté du formulaire : ce sont les pistes les plus rentables.'
          : 'Les personnes dont l’arbre ne connaît que le nom sont listées ci-dessous : ce sont les premières pistes à ouvrir.'}
      </p>
    </section>
  );
}
