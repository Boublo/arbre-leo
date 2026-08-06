'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Onglets, type Valeur } from '@/components/interactions/onglets';

/**
 * Onglets de la fiche : sépare les cinq grands sujets sans allonger la page.
 *
 * La fiche gagne à se lire d’un trait, mais tout ne pèse pas pareil : les
 * évènements datés, la parenté, les souvenirs, les images et le fil de la
 * famille sont des matières différentes qu’on ne consulte presque jamais dans
 * la même minute. On les répartit donc entre onglets, chacun affichant son
 * compte pour qu’on sache d’un coup d’œil ce qui l’attend.
 *
 * Le composant est délibérément mince : il ne connaît rien du contenu, ne fait
 * pas de requête, ne présente rien de son côté. Il reçoit cinq blocs déjà
 * rendus par le serveur et se contente de basculer entre eux, clavier compris.
 * Le contenu inactif reste dans le DOM mais masqué — la recherche du navigateur
 * (`Ctrl+F`) le trouve, et le repli visuel ne coupe pas l’accessibilité.
 */

type IdOnglet =
  | 'vue'
  | 'parente'
  | 'souvenirs'
  | 'photos'
  | 'conversation';

export type Compteurs = Record<IdOnglet, number>;

export function OrganisationFiche({
  vue,
  parente,
  souvenirs,
  recits,
  photos,
  conversation,
  compteurs,
}: {
  vue: ReactNode;
  parente: ReactNode;
  souvenirs: ReactNode;
  /**
   * Section « Récits qui la mentionnent » : rendue à la suite des souvenirs,
   * qui partagent la même matière — ce que la famille écrit d'elle. Facultative
   * pour que la fiche reste compatible avec les appelants qui ne la fournissent
   * pas encore.
   */
  recits?: ReactNode;
  photos: ReactNode;
  conversation: ReactNode;
  compteurs: Compteurs;
}) {
  const [actif, setActif] = useState<IdOnglet>('vue');
  const ancreListe = useRef<HTMLDivElement>(null);

  // Une navigation contextuelle (« Voir la fratrie complète ») pose l’onglet
  // désiré en fragment d’URL : `#parente`, `#souvenirs`, etc. On l’écoute au
  // montage et après chaque changement d’adresse, pour poser l’onglet et faire
  // remonter la liste dans la fenêtre.
  useEffect(() => {
    const appliquer = () => {
      const cle = window.location.hash.replace(/^#/, '');
      if (estIdOnglet(cle)) {
        setActif(cle);
        ancreListe.current?.scrollIntoView({ block: 'start' });
      }
    };
    appliquer();
    window.addEventListener('hashchange', appliquer);
    return () => window.removeEventListener('hashchange', appliquer);
  }, []);

  const valeurs: readonly (Valeur & { id: IdOnglet })[] = [
    { id: 'vue', libelle: libelle('Vue d’ensemble', compteurs.vue) },
    { id: 'parente', libelle: libelle('Parenté', compteurs.parente) },
    { id: 'souvenirs', libelle: libelle('Souvenirs', compteurs.souvenirs) },
    { id: 'photos', libelle: libelle('Album', compteurs.photos) },
    { id: 'conversation', libelle: libelle('Conversation', compteurs.conversation) },
  ];

  const panneaux: { id: IdOnglet; contenu: ReactNode }[] = [
    { id: 'vue', contenu: vue },
    { id: 'parente', contenu: parente },
    {
      id: 'souvenirs',
      contenu: (
        <>
          {souvenirs}
          {recits}
        </>
      ),
    },
    { id: 'photos', contenu: photos },
    { id: 'conversation', contenu: conversation },
  ];

  return (
    <div ref={ancreListe} className="flex flex-col gap-4">
      <Onglets
        etiquette="Sections de la fiche"
        valeurs={valeurs}
        valeur={actif}
        onChoix={(id) => setActif(id)}
      />

      {panneaux.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          aria-label={libelleBrut(p.id)}
          hidden={p.id !== actif}
          className="flex flex-col gap-4"
        >
          {p.contenu}
        </div>
      ))}
    </div>
  );
}

/** « Souvenirs (3) » — le compte se suffit à lui-même, pas de pluriel à accorder. */
function libelle(base: string, n: number): string {
  return n > 0 ? `${base} (${n})` : base;
}

function libelleBrut(id: IdOnglet): string {
  const table: Record<IdOnglet, string> = {
    vue: 'Vue d’ensemble',
    parente: 'Parenté',
    souvenirs: 'Souvenirs',
    photos: 'Album',
    conversation: 'Conversation',
  };
  return table[id];
}

function estIdOnglet(valeur: string): valeur is IdOnglet {
  return (
    valeur === 'vue' ||
    valeur === 'parente' ||
    valeur === 'souvenirs' ||
    valeur === 'photos' ||
    valeur === 'conversation'
  );
}
