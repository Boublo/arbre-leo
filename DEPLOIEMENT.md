# Déploiement sur Vercel

Ce guide décrit les étapes pour publier l'application sur Vercel, connectée à
la base Supabase existante. Comptez une dizaine de minutes la première fois.

## 1. Préparer le dépôt

Le code doit être poussé sur GitHub. Le dépôt public
`https://github.com/Boublo/arbre-leo` sert de source à Vercel : chaque
`git push` sur `main` déclenche un nouveau déploiement.

## 2. Importer le projet dans Vercel

1. Ouvrir <https://vercel.com/new>.
2. Se connecter (ou créer un compte) avec GitHub.
3. Autoriser Vercel à lire le dépôt `arbre-leo`.
4. Cliquer **Import** sur la ligne du dépôt.

Vercel détecte automatiquement Next.js — laisser les valeurs par défaut :

| Réglage           | Valeur          |
| ----------------- | --------------- |
| Framework Preset  | Next.js         |
| Root Directory    | `.`             |
| Build Command     | `next build`    |
| Output Directory  | `.next` (auto)  |
| Install Command   | `npm install`   |
| Node.js Version   | 20.x ou 22.x    |

## 3. Renseigner les variables d'environnement

Dans la section **Environment Variables** de l'écran d'import (ou plus tard
dans **Settings → Environment Variables**), reprendre toutes les entrées de
`.env.local`. Toutes commencent par `NEXT_PUBLIC_` — elles sont exposées au
navigateur, ce qui est attendu pour Supabase avec RLS.

| Clé                              | Origine                                             |
| -------------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase → Project Settings → API                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase → Project Settings → API                   |
| `NEXT_PUBLIC_SITE_URL`           | Voir §5 (à mettre à jour après le premier déploiement) |
| `NEXT_PUBLIC_NOM_DU_SITE`        | `.env.local`                                        |
| `NEXT_PUBLIC_SOUS_TITRE`         | `.env.local`                                        |
| `NEXT_PUBLIC_PRENOM_RACINE`      | `.env.local`                                        |
| `NEXT_PUBLIC_BRANCHE_PATERNELLE` | `.env.local`                                        |
| `NEXT_PUBLIC_BRANCHE_MATERNELLE` | `.env.local`                                        |

Cocher **Production, Preview, Development** pour chaque variable, sauf
`NEXT_PUBLIC_SITE_URL` : sa valeur diffère entre développement local
(`http://localhost:3000`) et production (l'URL Vercel).

## 4. Premier déploiement

Cliquer **Deploy**. Le build prend deux à trois minutes. À la fin, Vercel
attribue une URL du type `arbre-leo-<hash>.vercel.app`.

Ouvrir l'URL et vérifier que la page d'accueil s'affiche. À ce stade, la
navigation fonctionne mais **l'authentification ne redirige pas correctement**
tant que les URL Supabase ne sont pas alignées (étape suivante).

## 4 bis. Base Supabase partagée avec Modulyx / PixelForge

L'arbre **ne possède pas** son propre projet Supabase. Il vit dans le projet
`brsjdxrsmdbbcdqgncfs` (organisation PixelForge), à côté de Modulyx :

| Schéma Postgres | Application |
| --- | --- |
| `public` | Modulyx / PixelForge (Prisma) |
| `arbre` | L'arbre de Léo |

Conséquences :

- **Même `NEXT_PUBLIC_SUPABASE_URL` et clé anon** que Modulyx — c'est normal.
- **`auth.users` est partagé** : un compte créé sur Modulyx peut se connecter
  sur l'arbre ; la RPC `assurer_fiche_membre` crée alors `arbre.membres` en
  attente de validation.
- **Ne jamais créer de tables arbre dans `public`**, ni lancer `prisma db push`
  sans précaution sur ce projet.
- Dans le MCP Supabase Cursor, choisir le projet **PixelForge** puis cibler le
  schéma `arbre` dans les requêtes SQL.

## 5. Aligner les URL

**a. Renseigner `NEXT_PUBLIC_SITE_URL` sur Vercel (projet `arbre-leo`).**
Dans **Settings → Environment Variables**, éditer `NEXT_PUBLIC_SITE_URL`
et y mettre l'URL de production : `https://arbre.modulyx.eu`.
Redéployer (**Deployments → … → Redeploy**).

**b. Autoriser les URL côté Supabase (projet partagé).**
Dans le tableau de bord Supabase → **Authentication → URL Configuration** :

1. **Site URL** : URL principale de l'app qui envoie les e-mails (souvent
   Modulyx). Peut rester `https://modulyx-v3-….vercel.app` si les mails
   d'auth passent par Modulyx.
2. **Redirect URLs** : ajouter **les deux** familles d'URL, séparées par des
   retours à la ligne :
   - `https://arbre.modulyx.eu/**`
   - `https://arbre.modulyx.eu/auth/callback`
   - URLs Modulyx déjà présentes (ne pas les retirer)

   Les URL `arbre-leo-*.vercel.app` (previews) ne sont plus utilisées : les
   déploiements Vercel sont limités à la branche `main` (production).
3. Enregistrer.

Sans cette étape, les liens de confirmation d'inscription envoyés par mail
pointent vers `http://localhost:3000` et cassent l'inscription des nouveaux
membres.

## 6. Nom de domaine (facultatif)

Vercel accepte les domaines personnalisés (**Settings → Domains**). Après
avoir ajouté un domaine, refaire l'étape 5 avec la nouvelle URL — et penser
à basculer `NEXT_PUBLIC_SITE_URL` dessus.

### DNS chez Gandi (modulyx.eu)

Gandi ajoute souvent `.modulyx.eu` à la fin des CNAME, ce qui casse le
domaine (`cname.vercel-dns.com.modulyx.eu` au lieu de `cname.vercel-dns.com`).
**Solution recommandée : utiliser un enregistrement A** (plus simple, pas de piège).

Dans **Gandi → Domaines → modulyx.eu → Enregistrements DNS** :

1. **Supprimer** l'enregistrement CNAME `arbre` (s'il existe).
2. **Ajouter** :

| Type | Nom   | Valeur        | TTL  |
| ---- | ----- | ------------- | ---- |
| A    | `arbre` | `76.76.21.21` | 10800 |

Ne pas toucher à `atelio` (A → `46.225.79.113`).

3. Sur **Vercel → projet arbre-leo → Settings → Domains**, vérifier que
   `arbre.modulyx.eu` est listé (sinon l'ajouter).

**Alternative CNAME** (si tu préfères) : cible `cname.vercel-dns.com.` avec
un **point final** obligatoire. Sans ce point, Gandi concatène `.modulyx.eu`.

Vérifier (PowerShell sous Windows) :

```powershell
Resolve-DnsName arbre.modulyx.eu -Type A
# Attendu : 76.76.21.21
```

Ou en ligne de commande Linux/macOS :

```bash
dig arbre.modulyx.eu A +short
# Attendu : 76.76.21.21
```

La propagation DNS peut prendre jusqu'à une heure. Tant que le domaine
personnalisé ne répond pas, laisser `NEXT_PUBLIC_SITE_URL` sur l'URL Vercel
(`https://arbre-leo.vercel.app`) — l'application y fonctionne déjà.

## 7. Suite

Chaque `git push` sur **`main`** déclenche un déploiement **Production** sur
https://arbre.modulyx.eu.

Les branches de travail (`cursor/*`, PR, etc.) **ne déclenchent plus de
preview Vercel** : le fichier `vercel.json` limite les builds à `main` et
ignore les autres branches (`scripts/vercel-build-uniquement-main.sh`). Cela
évite de consommer les minutes de build sur des URL éphémères inutiles.

La validation avant merge repose sur **GitHub Actions** (`CI`, `Garde-fous
arbre`) : typecheck, lint, build, Playwright mobile.

### Désactiver les previews (déjà fait dans le dépôt)

```json
// vercel.json
{
  "git": { "deploymentEnabled": { "main": true } },
  "github": { "silent": true },
  "ignoreCommand": "bash scripts/vercel-build-uniquement-main.sh"
}
```

Si des previews apparaissent encore, vérifier dans Vercel → **Settings → Git**
que **Preview Deployments** est désactivé ou limité à aucune branche.

Pour importer de nouvelles données ou tourner les scripts de veille et de
diagnostic, se référer à `MISE-EN-SERVICE.md` : ces opérations tournent en
local, contre la base Supabase. Vercel n'exécute que le rendu du site.
