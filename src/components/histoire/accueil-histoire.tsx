/**
 * Ce qu'on voit tant que personne n'a rien versé. Une page blanche
 * découragerait ; on explique à quoi sert l'endroit et on donne des exemples
 * de ce qu'on attend, pris dans les époques que les deux familles ont traversées.
 */
export function AccueilHistoire({ peutContribuer }: { peutContribuer: boolean }) {
  return (
    <div className="carte p-8">
      <h2 className="text-xl">La grande Histoire n’est pas encore écrite</h2>

      <p className="mt-4 max-w-2xl leading-relaxed text-encre-douce">
        Cette page tient le fond de tableau de l’arbre. Elle réunit les
        événements du monde qui ont déplacé, séparé ou installé les nôtres, et
        elle indique pour chacun qui, dans la famille, l’a traversé et ce que
        cela a changé pour lui. Une date de départ cesse alors d’être une date :
        elle devient une décision, prise dans une année précise, pour des raisons
        qu’on peut nommer.
      </p>

      <h3 className="mt-6 text-sm font-medium uppercase tracking-wider text-encre-tres-douce">
        Ce qu’on attend ici
      </h3>
      <ul className="mt-3 flex max-w-2xl flex-col gap-2 text-sm leading-relaxed text-encre-douce">
        <li>— l’émigration des journaliers d’Andalousie vers l’Oranie&nbsp;;</li>
        <li>— la colonisation agricole de la plaine d’Oran et la fondation de ses villages&nbsp;;</li>
        <li>— les deux guerres mondiales, la mobilisation et l’Occupation&nbsp;;</li>
        <li>— la guerre d’Algérie et le rapatriement de l’été 1962&nbsp;;</li>
        <li>— l’exode rural du Marais poitevin et des Deux-Sèvres&nbsp;;</li>
        <li>— l’industrialisation de la cuvette grenobloise et l’appel de ses usines.</li>
      </ul>

      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-encre-douce">
        Un fait tient en peu de choses&nbsp;: un titre, une année de début, une
        portée — du mondial au familial — et, si vous l’avez, une source
        vérifiable. Le reste peut venir plus tard, à plusieurs.
      </p>

      {peutContribuer ? (
        <a
          href="#ajouter"
          className="mt-8 inline-block rounded-[var(--rayon-petit)] bg-accent px-4 py-2.5 text-sm font-medium text-accent-contraste transition hover:brightness-110"
        >
          Verser le premier fait
        </a>
      ) : (
        <p className="mt-8 text-sm text-encre-tres-douce">
          Votre compte est en lecture seule. Demandez à un administrateur de la
          famille de vous ouvrir la contribution pour verser un premier fait.
        </p>
      )}
    </div>
  );
}
