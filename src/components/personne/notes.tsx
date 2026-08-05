import { Rien, Section } from '@/components/personne/blocs';

/**
 * Les notes d'enquête, en entier.
 *
 * Elles viennent souvent d'un fichier GEDCOM et gardent la mise en page de
 * celui qui les a écrites : listes, alinéas, paragraphes séparés. On respecte
 * ses retours à la ligne et on ne coupe rien — c'est là que se trouvent les
 * hésitations, les pistes et les contradictions qui font avancer une recherche.
 */
export function NotesPersonne({ notes }: { notes: string | null }) {
  return (
    <Section titre="Notes d’enquête">
      {notes && notes.trim() !== '' ? (
        <div className="whitespace-pre-line text-sm leading-relaxed text-encre-douce">
          {notes}
        </div>
      ) : (
        <Rien>Aucune note n’accompagne cette fiche.</Rien>
      )}
    </Section>
  );
}
