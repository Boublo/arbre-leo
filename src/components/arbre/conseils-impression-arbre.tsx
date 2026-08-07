import Link from 'next/link';
import type { ConseilImpression } from '@/lib/arbre-impression-conseils';

export function ConseilsImpressionArbre({ conseils }: { conseils: ConseilImpression[] }) {
  if (conseils.length === 0) return null;

  return (
    <aside className="arbre-impr-conseils no-imprimer" aria-label="Conseils pour l'impression">
      <p className="arbre-impr-conseils-titre">Conseils pour cette vue</p>
      <ul className="arbre-impr-conseils-liste">
        {conseils.map((c, i) => (
          <li key={i}>
            <span>{c.texte}</span>
            {c.lien && c.libelleLien && (
              <>
                {' '}
                <Link href={c.lien} className="arbre-impr-conseils-lien">
                  {c.libelleLien}
                </Link>
              </>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
