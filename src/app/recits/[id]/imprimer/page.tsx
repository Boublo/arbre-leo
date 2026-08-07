import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { extraireSommaire, RenduMarkdown, TableDesMatieres } from '@/components/recits/rendu-markdown';
import { chargerRecit, formaterHorodatage } from '@/lib/recits';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/recits/[id]/imprimer'>): Promise<Metadata> {
  const { id } = await params;
  const recit = await chargerRecit(id);
  return {
    title: recit ? `Imprimer — ${recit.titre}` : 'Récit introuvable',
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PageImprimerRecit({
  params,
}: PageProps<'/recits/[id]/imprimer'>) {
  const { id } = await params;
  const recit = await chargerRecit(id);
  if (!recit) notFound();

  const etiquette = recit.patronyme ?? recit.theme;
  const sommaire = extraireSommaire(recit.corps);
  const dateImpression = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(
    new Date()
  );

  return (
    <div className="imprimer-recit">
      <style>{stylesImprimables}</style>

      <header className="entete-impression">
        <p className="site">L’arbre de Léo — récit de famille</p>
        <h1>{recit.titre}</h1>
        {recit.chapeau && <p className="chapeau">{recit.chapeau}</p>}
        <p className="meta">
          {etiquette && <span>{recit.patronyme ? `Famille ${etiquette}` : `Thème : ${etiquette}`}</span>}
          {recit.periode && <span> · {recit.periode}</span>}
        </p>
        <p className="meta">
          Écrit par {recit.auteur}, le {formaterHorodatage(recit.creeLe)}.
        </p>
        <p className="meta impression">Imprimé le {dateImpression}.</p>
      </header>

      <div className="corps-impression">
        <TableDesMatieres entrees={sommaire} />
        <RenduMarkdown texte={recit.corps} />
      </div>

      {recit.personnes.length > 0 && (
        <section className="personnes-citees">
          <h2>Personnes citées</h2>
          <ul>
            {recit.personnes.map((p) => (
              <li key={p.id}>{p.nomComplet}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="pied-impression no-imprimer">
        <Link href={`/recits/${recit.id}`} className="lien-ecran">
          ← Revenir à la lecture à l’écran
        </Link>
        <button type="button" className="bouton-imprimer" data-imprimer>
          Imprimer maintenant
        </button>
      </footer>

      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.querySelector('[data-imprimer]')?.addEventListener('click',function(){window.print();});",
        }}
      />
    </div>
  );
}

const stylesImprimables = `
.imprimer-recit {
  max-width: 42rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  color: #1a1a1a;
  background: #fff;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.6;
}
.imprimer-recit .site {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #666;
  margin: 0 0 0.5rem;
}
.imprimer-recit h1 {
  font-size: 1.75rem;
  margin: 0 0 0.75rem;
  line-height: 1.25;
}
.imprimer-recit .chapeau {
  font-style: italic;
  color: #444;
  margin: 0 0 1rem;
}
.imprimer-recit .meta {
  font-size: 0.875rem;
  color: #555;
  margin: 0.25rem 0;
}
.imprimer-recit .corps-impression {
  margin-top: 2rem;
}
.imprimer-recit .corps-impression h2 {
  font-size: 1.25rem;
  margin: 1.5rem 0 0.75rem;
}
.imprimer-recit .corps-impression h3 {
  font-size: 1.1rem;
  margin: 1.25rem 0 0.5rem;
}
.imprimer-recit .corps-impression p,
.imprimer-recit .corps-impression li {
  font-size: 1rem;
  margin: 0.5rem 0;
}
.imprimer-recit .personnes-citees {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #ccc;
  font-size: 0.9rem;
}
.imprimer-recit .personnes-citees ul {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}
.imprimer-recit .pied-impression {
  margin-top: 3rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}
.imprimer-recit .lien-ecran {
  color: #333;
  font-size: 0.875rem;
}
.imprimer-recit .bouton-imprimer {
  padding: 0.5rem 1rem;
  border: 1px solid #333;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
}
@media print {
  .no-imprimer {
    display: none !important;
  }
  .imprimer-recit {
    padding: 0;
  }
}
`;
