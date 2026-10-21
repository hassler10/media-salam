# Bibliothèque de la Mosquée Salam du Plateau

Application de gestion des abonnements et de génération des cartes.

Hébergement : **Vercel**  
Déploiement : **GitHub** (chaque `git push` met le site à jour)

## 1. Créer le dépôt GitHub

Sur [github.com/new](https://github.com/new) :

- Nom suggéré : `bibliotheque-salam-cmp`
- Visibilité : **Private** (données d’abonnés)
- Ne pas cocher « Add a README »

Puis dans le dossier du projet :

```bash
git init
git add .
git commit -m "Application Bibliothèque Salam — cartes d'abonnement"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/bibliotheque-salam-cmp.git
git push -u origin main
```

Ne jamais envoyer le fichier `.env` (il est ignoré).

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
3. Importer `bibliotheque-salam-cmp`
4. Framework : **Next.js** (détecté automatiquement)
5. Avant **Deploy**, ouvrir **Environment Variables** :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | l’URL Neon / Vercel Postgres |
| `SESSION_SECRET` | une longue phrase secrète unique |

Cochez Production, Preview et Development.

6. **Deploy**

## 4. Premier accès

URL du type : `https://bibliotheque-salam-cmp.vercel.app`

- Identifiant : `bibliothecaire`
- Mot de passe : `Salam2026`  
  **Changez-le dès que possible** (Maintenance → comptes).

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
