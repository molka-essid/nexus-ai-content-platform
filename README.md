# ALTA Services — Studio de contenu

Outil interne de génération et de publication de contenu pour les réseaux sociaux
(Facebook, LinkedIn, Instagram, TikTok), propulsé par l'IA.

Application en production : **https://alta-services-omega.vercel.app**

## Stack technique

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **PostgreSQL** hébergé sur Supabase, via **Prisma ORM**
- **Claude (Anthropic API)** comme fournisseur IA principal, avec repli automatique
  sur Gemini et Groq (fournisseurs gratuits) avant d'utiliser la clé payante
- **Tailwind CSS v4** + **shadcn/ui** pour l'interface
- Hébergement et déploiement sur **Vercel**

## Démarrage local

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Copier `.env.example` vers `.env` et renseigner les vraies valeurs
   (base de données, clés IA, identifiants des réseaux sociaux — voir le détail
   de chaque variable dans `.env.example`).
3. Appliquer le schéma de base de données :
   ```bash
   npx prisma migrate dev
   ```
4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```
   Ouvrir [http://localhost:3000](http://localhost:3000).

## Déploiement

Le projet est déployé sur Vercel. Le build exécute `prisma generate && next build`
(la génération du client Prisma doit précéder le build Next.js).

Une tâche planifiée (cron Vercel, voir `vercel.json`) exécute chaque jour
`/api/cron/auto-publish`, qui publie automatiquement les publications
programmées ayant l'option "publication automatique" activée.

## Structure du projet

```
src/
  app/            Pages et routes API (Next.js App Router)
  components/     Composants d'interface, organisés par domaine
  lib/            Logique métier : IA, réseaux sociaux, base de données, validation
prisma/
  schema.prisma   Schéma de la base de données
  migrations/     Historique des migrations
public/           Fichiers statiques (polices, images de marque)
```

## Guide d'utilisation

Pour l'utilisation de l'application au quotidien (et non son développement),
voir le guide utilisateur fourni séparément.
