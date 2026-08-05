# Gabarits de courriels

Les courriels d'authentification de Supabase sont **globaux au projet** : ils ne
se séparent ni par schéma ni par application. Si votre projet Supabase sert déjà
à autre chose, ces gabarits remplaceront ceux de l'autre application — vérifiez
d'abord que personne d'autre n'utilise l'authentification du projet :

```sql
select count(*) from auth.users;
```

## Où les coller

Tableau de bord Supabase → **Authentication → Emails → Templates**

| Fichier | Gabarit Supabase |
|---|---|
| `confirmation-inscription.html` | Confirm signup |
| `reinitialisation-mot-de-passe.html` | Reset password |

Pensez à traduire aussi la ligne d'objet, qui se règle juste au-dessus du corps :

- Confirm signup → « Confirmez votre adresse »
- Reset password → « Choisir un nouveau mot de passe »

## Pourquoi du HTML en tableaux

Parce que les clients de messagerie ne savent pas faire mieux. Outlook ignore
une bonne part de la mise en page moderne, et beaucoup de messageries n'exécutent
ni feuille de style externe ni variable CSS. D'où les tableaux imbriqués, les
styles en ligne et les couleurs écrites en dur — elles reprennent la palette de
`globals.css` mais ne peuvent pas y renvoyer.

## Envoi

Le serveur de courriel fourni par Supabase est bridé à quelques messages par
heure : de quoi essayer, pas de quoi ouvrir l'accès à trente personnes le même
soir. Pour un usage réel, branchez un service d'envoi dans
**Authentication → Emails → SMTP Settings**.
