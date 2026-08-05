import { Moderation, Rien, Section } from '@/components/personne/blocs';
import { FormulaireCommentaire } from '@/components/personne/formulaire-commentaire';
import type { CommentaireFiche } from '@/components/personne/donnees';

/**
 * Le fil de discussion attaché à la fiche.
 *
 * C'est là que la famille corrige : un prénom mal lu, une commune voisine, une
 * date que quelqu'un tient de sa mère. Les réponses sont imbriquées sous le
 * message auquel elles répondent.
 */
export function CommentairesPersonne({
  personneId,
  nomPersonne,
  commentaires,
}: {
  personneId: string;
  nomPersonne: string;
  commentaires: CommentaireFiche[];
}) {
  return (
    <Section titre="Le fil de la famille" compte={compter(commentaires)}>
      {commentaires.length === 0 ? (
        <Rien>Personne n’a encore écrit ici. Vous pouvez ouvrir la discussion.</Rien>
      ) : (
        <ul className="mb-6 flex flex-col gap-5">
          {commentaires.map((c) => (
            <li key={c.id}>
              <Message commentaire={c} />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-bordure pt-5">
        <FormulaireCommentaire personneId={personneId} nomPersonne={nomPersonne} />
      </div>
    </Section>
  );
}

function Message({ commentaire: c }: { commentaire: CommentaireFiche }) {
  return (
    <article>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-sm font-medium text-encre">{c.auteur}</span>
        <span className="text-xs text-encre-tres-douce">{c.date}</span>
        <Moderation statut={c.statut} />
      </div>

      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-encre-douce">{c.texte}</p>

      {c.reponses.length > 0 && (
        <ul className="mt-4 flex flex-col gap-4 border-l border-bordure pl-4">
          {c.reponses.map((reponse) => (
            <li key={reponse.id}>
              <Message commentaire={reponse} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function compter(commentaires: CommentaireFiche[]): number {
  return commentaires.reduce((total, c) => total + 1 + compter(c.reponses), 0);
}
