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

### Filet de sécurité pré-commit

Si vous, ou un agent qui reprend l'enquête, êtes amenés à commiter du code
dans le dépôt public, activez le crochet git fourni :

```bash
git config core.hooksPath .githooks
```

À partir de ce moment, chaque `git commit` relit ce que vous vous apprêtez à
publier (via `scripts/verifier-avant-commit.mjs`) et refuse la commande si
un patronyme de la famille, un couple prénom + année identifiant, un fichier
GEDCOM / acte / photo, ou un secret (clé Supabase, mot de passe dans une URL)
apparaît hors des fichiers explicitement autorisés. Le script s'exécute aussi
à la demande — `npm run arbre:verif` — et se débranche par
`git config --unset core.hooksPath`. Le README détaille les règles.

## 8. Écrire du SQL sur la base

Pour comprendre ce que contient chaque table, quels sont les énums
autorisés, comment jouer les clés (`id`, `code_gedcom`, `nom_complet`) et
ce que voit chaque rôle sous RLS, se reporter à `docs/DONNEES.md`. Le
document donne aussi des patrons prêts à l'emploi (ajout d'une personne,
rattachement à une union, recherche de doublons, remontée d'ascendance).

## 9. Contrôler la santé de la base

Après chaque campagne de versement — ou simplement de temps en temps —
un diagnostic parcourt la base et signale ce qui mérite un regard :
comptes globaux, anomalies chronologiques (décès antérieur à la
naissance, enfants nés avant leurs parents, écarts parent-enfant hors
`[12, 60]` ans, faits historiques rattachés hors période de vie),
personnes isolées, doublons potentiels, chantiers en attente depuis plus
de soixante jours, part des personnes avec date de naissance connue et
prouvées par acte.

```bash
ARBRE_EMAIL=vous@exemple.fr ARBRE_MOTDEPASSE=… npm run arbre:diag
```

Le script se connecte comme un membre ordinaire, ne corrige rien, et
sort avec le code `1` si des anomalies ont été détectées, ce qui le rend
branchable sur un crochet git `pre-commit`.

## 10. Passer le flambeau

Quand un autre chercheur — humain ou agent — reprendra l'enquête,
orientez-le vers `docs/PASSATION.md`. Cette page dit où en est l'arbre,
quels chantiers restent ouverts, et **comment verser proprement en base
ce qu'il va trouver** : enrichissement d'un GEDCOM, ajout d'une personne
depuis l'application, versement d'un acte réellement lu. Elle rappelle
aussi les cinq règles à ne jamais enfreindre, et renvoie à
`docs/DONNEES.md` pour toute écriture SQL directe.

Pour le versement d'un acte isolé — le cas courant quand une seule pièce
arrive entre deux campagnes de dépouillement — un canevas interactif
évite d'avoir à recopier le patron SQL à la main :

```bash
npm run arbre:acte
```

Le script pose huit questions dans le terminal (type d'acte, nom et
prénoms, date, lieu, cote, dépôt, transcription, niveau de preuve,
rattachement à une fiche existante ou création d'une nouvelle), puis
écrit un fichier `data/sql-actes/AAAA-MM-JJ-<sujet>.sql` prêt à être
relu. Il **ne touche pas à la base** : c'est vous qui exécutez le SQL
après relecture, comme pour tout ce qui vit dans `data/sql-actes/`.

Complément local : la fiche `data/BRANCHES.md`, exclue de git, tient
génération par génération l'état exact des deux branches d'ascendance,
avec codes GEDCOM, blocages et ordre de priorité pour la reprise. À
transmettre au chercheur suivant en même temps que les GEDCOM et le
dépouillement d'actes.
