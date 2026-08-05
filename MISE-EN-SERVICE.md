# Mise en service

Ce qui reste à faire à la main, parce que cela demande un accès au tableau de
bord Supabase ou une identité que le code ne peut pas prendre à votre place.

## 1. Créer le premier compte

Lancez l'application et allez sur `/inscription`.

**Le tout premier compte créé devient administrateur**, validé d'office. C'est
voulu : sans lui, personne ne pourrait valider personne et l'application
resterait fermée à jamais.

Créez donc votre compte en premier, avant d'ouvrir l'adresse à la famille.

## 2. Régler les adresses de redirection

Dans le tableau de bord Supabase, **Authentication → URL Configuration** :

- *Site URL* : l'adresse publique du site
- *Redirect URLs* : ajoutez `http://localhost:3000/auth/callback` et
  `https://votre-domaine/auth/callback`

Sans cela, les liens de confirmation envoyés par courriel ramèneront au mauvais
endroit et l'inscription échouera en silence.

Reportez la même adresse dans `NEXT_PUBLIC_SITE_URL` de votre `.env.local`.

## 3. Vérifier l'envoi des courriels

Le serveur de courriel fourni par défaut avec Supabase est bridé à quelques
messages par heure : suffisant pour essayer, pas pour ouvrir l'accès à trente
personnes le même soir.

Pour un usage familial réel, branchez un service d'envoi dans
**Authentication → Emails → SMTP Settings**. Les offres gratuites de Resend,
Brevo ou Postmark couvrent largement le besoin.

Pensez aussi à traduire en français les gabarits de courriels, dans
**Authentication → Emails → Templates** : ils sont en anglais par défaut.

## 4. Verser les actes et photographies déjà numérisés

Une fois votre compte créé et validé :

```bash
cp scripts/medias.config.example.mjs scripts/medias.config.mjs
```

Décrivez-y vos fichiers, puis faites un essai à blanc — rien n'est envoyé :

```bash
ARBRE_EMAIL=vous@exemple.fr ARBRE_MOTDEPASSE=votre-mot-de-passe node scripts/import-medias.mjs
```

Relisez ce que le script annonce, en particulier la liste des personnes qu'il
n'a pas su retrouver dans l'arbre. Quand tout est juste :

```bash
ARBRE_EMAIL=vous@exemple.fr ARBRE_MOTDEPASSE=votre-mot-de-passe node scripts/import-medias.mjs --pour-de-vrai
```

Le script se connecte comme un membre ordinaire et n'utilise aucune clé
privilégiée : les mêmes règles s'appliquent à lui qu'à tout le monde.

> Ne mettez pas votre mot de passe dans un fichier du dépôt, ni dans l'historique
> de votre terminal si celui-ci est partagé.

## 5. Ouvrir l'accès à la famille

Donnez l'adresse du site et laissez chacun demander un accès. Les demandes
arrivent dans `/admin`, avec le lien de parenté déclaré et le message laissé à
l'inscription.

Trois rôles :

| Rôle | Ce qu'il peut faire |
|---|---|
| **Lecteur** | Consulter l'arbre, lire les souvenirs, commenter |
| **Contributeur** | En plus : déposer souvenirs et photos, corriger l'arbre, ouvrir des chantiers de recherche |
| **Admin** | En plus : valider les inscriptions, arbitrer, consulter le journal |

Pour les aînés qui veulent seulement regarder, *lecteur* suffit et évite les
modifications involontaires.

## 6. Héberger

Le projet se déploie tel quel sur Vercel. Reportez-y les variables
d'environnement de `.env.local`, en remplaçant `NEXT_PUBLIC_SITE_URL` par
l'adresse réelle.

Le site demande aux moteurs de recherche de ne pas l'indexer, mais cette
consigne n'est qu'une politesse : la seule protection réelle reste la validation
manuelle des comptes et les politiques RLS de la base.

## 7. Sauvegarder

Cet arbre représente des mois de dépouillement d'archives. Prévoyez une
sauvegarde régulière : dans Supabase, **Database → Backups**, et pensez à
conserver ailleurs une copie de vos fichiers GEDCOM d'origine et des actes
numérisés.
