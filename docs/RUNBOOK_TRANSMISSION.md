# Runbook — transmettre l’arbre familial

**But :** préparer une réunion familiale, remettre une copie de l’arbre et permettre une reprise sereine, sans confondre récit, hypothèse et preuve.

**Limite :** ce document ne remplace pas le [runbook de sauvegarde et restauration](RUNBOOK_SAUVEGARDE_RESTAURATION.md). Il n’autorise ni restauration, ni modification de données, ni partage d’une exportation hors du cercle familial décidé par le propriétaire.

## Avant une réunion ou un partage

1. Désigner la personne qui anime et celle qui conserve les notes. Elles ne doivent pas être nécessairement la même personne.
2. Choisir le support adapté :
   - `/presentation` pour raconter des repères datés à l’écran ;
   - `/arbre/imprimer` pour un schéma à distribuer ou enregistrer en PDF ;
   - `/export` seulement si une copie complète est réellement nécessaire.
3. Vérifier le compte utilisé. Un administrateur voit et exporte davantage qu’un lecteur ; ne pas projeter ou distribuer des informations sur une personne vivante ou confidentielle sans son accord et celui du propriétaire de l’arbre.
4. Prévoir un endroit privé pour les notes, distinct de ce dépôt Git. Une note familiale, une photo ou un acte n’est jamais à copier dans une issue, un commit ou un journal public.
5. Expliquer dès le début la légende : un acte établit un fait, une mémoire raconte un souvenir, une hypothèse demande encore vérification.

## Pendant la présentation

- Utiliser les flèches du clavier ou les boutons du mode présentation ; ouvrir une fiche seulement lorsqu’une question nécessite les détails ou les sources.
- Dire « connu dans l’arbre » plutôt que conclure à partir d’une date ou d’un nom semblable.
- Noter séparément les nouveaux récits, les sources proposées et les corrections demandées. Ne pas modifier une filiation en direct sous la pression d’une discussion.
- Si une information paraît contradictoire, la transformer en chantier de recherche ; l’acte ou la source citée est nécessaire pour confirmer un lien.
- En cas de doute sur la visibilité d’une fiche ou d’une image, fermer la projection et demander au propriétaire avant de continuer.

## Après la réunion

1. Trier les notes dans trois listes : **faits sourcés**, **mémoires à conserver**, **hypothèses à rechercher**.
2. Associer toute copie d’acte ou référence à sa provenance, sans considérer la copie comme une instruction d’ajout automatique.
3. Saisir les modifications une par une dans l’application, avec le niveau de preuve approprié et la relecture humaine habituelle.
4. Ouvrir ou mettre à jour les chantiers de recherche pour les points non prouvés ; ne pas les publier comme des filiations établies.
5. Faire un export GEDCOM ou JSON lorsque le propriétaire en décide, puis conserver ce fichier chiffré hors du dépôt. Vérifier qu’il s’ouvre avant de le considérer comme une sauvegarde utile.

## Passage à une autre personne responsable

Le propriétaire remet, par un canal privé, les éléments suivants :

- la dernière révision de l’application et le lien vers le dépôt ;
- l’emplacement chiffré des exports et la date de leur dernière vérification ;
- les accès Supabase, Vercel et stockage, suivant le principe du moindre privilège ;
- les chantiers de recherche actifs, sans recopier d’actes ni de données privées dans Git ;
- les limites connues : P0 de confidentialité historique, exercice de restauration isolé à faire, et toute hypothèse en attente d’acte.

Les comptes devenus inutiles sont révoqués. Les mots de passe, liens magiques, jetons et clés ne sont jamais transférés dans un document versionné.

## Critère de réussite

La transmission est réussie quand une autre personne peut :

1. expliquer la différence entre fait, mémoire et hypothèse ;
2. ouvrir l’arbre, le mode présentation et les fiches sans élargir les droits ;
3. retrouver une copie de sauvegarde privée et savoir où consulter son mode de restauration ;
4. reprendre la recherche sans ajouter de donnée familiale au dépôt public.
