# Bibliothèque de la Mosquée Salam du Plateau

Application de gestion des abonnements et de génération des cartes.

Hébergement : **Vercel**  
Déploiement : **GitHub** (chaque `git push` met le site à jour)

## 1. Dépôt GitHub

Le dépôt est déjà en place : **https://github.com/hassler10/media-salam** (privé).
Premier push effectué — les mises à jour se font simplement par :

```bash
git add .
git commit -m "Description de la modification"
git push
```

Ne jamais envoyer le fichier `.env` / `.env.local` (ils sont ignorés).

## 2. Créer la base PostgreSQL (Neon, recommandé avec Vercel)

1. Compte sur [neon.tech](https://neon.tech)
2. Nouveau projet, région **Europe (Frankfurt ou Paris)** si disponible
3. Copier l’URL : `DATABASE_URL`  
   Elle ressemble à :  
   `postgresql://…@ep-….neon.tech/neondb?sslmode=require`

Vous pouvez aussi utiliser **Vercel Postgres** depuis le tableau de bord Vercel.

## 3. Brancher le GitHub sur Vercel

1. Compte sur [vercel.com](https://vercel.com) avec le même GitHub
2. **Add New… → Project**
3. Importer `media-salam`
4. Framework : **Next.js** (détecté automatiquement)
5. Avant **Deploy**, ouvrir **Environment Variables** :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | l’URL Neon / Vercel Postgres |
| `SESSION_SECRET` | une longue chaîne aléatoire unique |
| `SEED_ADMIN_USERNAME` | l’identifiant du 1er compte admin (ex. `bibliothecaire`) |
| `SEED_ADMIN_PASSWORD` | son mot de passe — **obligatoire au premier déploiement** |
| `SEED_ADMIN_DISPLAY_NAME` | nom affiché (optionnel) |

Cochez Production, Preview et Development.

6. **Deploy**

⚠️ Sans `SEED_ADMIN_PASSWORD`, aucun compte admin n’est créé et la connexion reste impossible. Le compte n’est créé **que** si la table des administrateurs est vide : ne le laissez pas défini une fois le site en production.

## 4. Premier accès

URL du type : `https://media-salam.vercel.app`

Connectez-vous avec le `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` définis sur Vercel.
Ces valeurs ne sont dans aucun fichier du dépôt : gardez-les dans votre gestionnaire de mots de passe.
**Changez-le ensuite** (Maintenance → comptes) puis retirez `SEED_ADMIN_PASSWORD` des variables Vercel.

Les tables se créent automatiquement à la première connexion.

Menu **Super admin — Carte** : logo, textes et ajouts sur toutes les cartes.

Dans Super admin, renseignez **URL publique** avec l’adresse Vercel (ou votre domaine) pour que les QR codes restent valides.

## 5. Nom de domaine (optionnel)

Vercel → Project → **Settings → Domains**  
Exemple : `bibliotheque.mosquee-salam.ci`

Puis recopiez cette adresse dans Super admin → URL publique.

## 6. Mises à jour

```bash
git add .
git commit -m "Description de la modification"
git push
```

Vercel reconstruit et publie tout seul.

## Développement local

```bash
cp .env.example .env.local
# renseigner DATABASE_URL
npm install
npx drizzle-kit push
npm run dev
```
