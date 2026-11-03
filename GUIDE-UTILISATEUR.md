# Guide d'utilisation — ALTA Services Studio de Contenu

## Introduction

Cette application est un outil interne conçu pour ALTA Services. Elle permet de :

- Générer automatiquement, grâce à l'intelligence artificielle, des publications prêtes à l'emploi pour les réseaux sociaux (texte, image, hashtags) ;
- Organiser ces publications sur un calendrier ;
- Les publier directement sur Facebook, LinkedIn, Instagram et TikTok, sans avoir à ouvrir ces plateformes une par une ;
- Gérer l'identité visuelle de la marque (logo, couleurs, ton) utilisée automatiquement dans chaque publication générée.

Elle est accessible à l'adresse : **https://alta-services-omega.vercel.app**

Aucune connaissance technique n'est nécessaire pour l'utiliser — ce guide explique chaque bouton et chaque écran.

---

## 1. Se connecter

À l'ouverture du site, un écran de connexion s'affiche.

1. Entrer l'adresse email fournie.
2. Entrer le mot de passe fourni.
3. Cliquer sur **Se connecter**.

Si l'email ou le mot de passe est incorrect, un message rouge l'indique sous le formulaire.

---

## 2. Navigation générale

Une fois connecté, un menu apparaît sur le côté gauche de l'écran (en haut sur téléphone/tablette) avec cinq sections :

| Icône | Section | À quoi ça sert |
|---|---|---|
| 📅 | **Calendrier** | Voir toutes les publications organisées par date, sur un mois |
| 🗓️ | **Plans hebdomadaires** | Générer une semaine complète de publications d'un coup avec l'IA |
| 📄 | **Publications** | Voir et gérer toutes les publications, une par une |
| 🖼️ | **Images** | Stocker les photos de l'entreprise utilisables dans les publications |
| 🎨 | **Marque** | Logo, couleurs, ton de communication, et connexion des comptes de réseaux sociaux |

Le bouton avec les flèches (◀▶) en bas du menu permet de le réduire pour gagner de la place à l'écran ; cliquer à nouveau pour le rouvrir.

En haut de chaque page, deux indicateurs sont toujours visibles :

- **Un badge vert ou rouge à propos de l'IA** — voir section 8.
- **Une alerte rouge** si une publication n'a pas pu être envoyée automatiquement — voir section 9.

---

## 3. Le Calendrier

C'est la page d'accueil. Elle affiche un mois sous forme de grille, comme un agenda classique.

**Ce qu'on y voit :**
- Chaque jour peut contenir une ou plusieurs publications, affichées sous forme de petites étiquettes colorées (une couleur par statut — voir section 6.1).
- L'icône de la plateforme (Facebook, LinkedIn, Instagram ou TikTok) apparaît sur chaque étiquette.

**Actions possibles :**
- **Changer de mois** : flèches ◀ ▶ en haut à droite, ou le bouton **Aujourd'hui** pour revenir au mois actuel.
- **Ouvrir une publication** : cliquer directement sur son étiquette dans le calendrier.
- **Déplacer une publication à une autre date** : cliquer-glisser (drag & drop) l'étiquette vers un autre jour.
- **Créer une nouvelle publication sur une date précise** : passer la souris sur un jour vide fait apparaître un petit **+** en haut à droite de la case ; cliquer dessus ouvre le formulaire de création directement pour cette date.
- **Voir toutes les publications d'un jour chargé** : si un jour contient plus de 3 publications, un lien "**+X de plus**" apparaît ; cliquer dessus les affiche toutes.

---

## 4. Les Plans hebdomadaires

C'est la fonctionnalité la plus puissante de l'outil : générer automatiquement toute une semaine de contenu en une seule fois.

### 4.1 Générer une semaine

Cliquer sur **Générer une semaine** (bouton en haut de la page Calendrier, ou dans le menu Plans hebdomadaires).

**Étape 1 — Définir la semaine :**
- **Semaine à partir du (lundi)** : choisir la date de début.
- **Nombre de publications** : combien de posts créer pour cette semaine (entre 1 et 7).

**Étape 2 — Stratégie et visuel :**
- **Thème de la semaine** *(optionnel)* : un thème général, ou laisser vide pour que l'IA en choisisse un.
- **Plateformes** : cocher Facebook, LinkedIn, Instagram et/ou TikTok — les publications seront adaptées à chacune.
- **Piliers de contenu** *(optionnel)* : Recrutement / Ressources humaines / Bien-être des employés. Laisser vide pour que l'IA fasse une rotation équilibrée entre les trois.
- **Ton** *(optionnel)* : laisser vide pour utiliser le ton défini dans la page Marque.
- **Instructions supplémentaires** *(optionnel)* : toute précision à donner à l'IA (ex. "mentionner le nouveau bureau de Sousse").
- **Photos de flyer pour cette semaine** : choisir entre
  - *Générer les visuels avec l'IA* — une photo différente est trouvée automatiquement pour chaque publication ;
  - *Utiliser une photo existante* — une seule photo de l'entreprise (déjà téléversée) sera utilisée pour tous les posts de la semaine.
- **Publier automatiquement chaque post à sa date programmée** : interrupteur à activer si on veut que les publications partent toutes seules sur les réseaux sociaux connectés le jour venu (voir section 9 pour les détails importants).

Cliquer sur **Générer la semaine**. L'IA crée alors tous les textes, hashtags et visuels, puis redirige automatiquement vers la page de cette semaine.

### 4.2 La page d'une semaine

Une fois générée, chaque semaine a sa propre page listant tous ses posts, avec pour chacun :
- La plateforme et la date ;
- Le statut (voir section 6.1) ;
- **Ouvrir** : va sur la page complète de cette publication ;
- L'icône ✨ : **régénérer** ce post précis (l'IA le refait entièrement, en gardant la même date et plateforme) ;
- L'icône poubelle 🗑️ : **retirer** ce post de la semaine (le supprime).

### 4.3 Liste de toutes les semaines

Le menu **Plans hebdomadaires** liste toutes les semaines déjà créées, avec leurs dates, leur thème et le nombre de publications. Cliquer sur une semaine l'ouvre.

---

## 5. Les Publications

Pour créer une publication seule (sans passer par une semaine entière), ou pour gérer les publications existantes une par une.

### 5.1 La liste des publications

Accessible depuis le menu **Publications**.

- **Filtres en haut** : Toutes / Brouillon / À valider / Programmé / Publié — cliquer sur un filtre n'affiche que les publications ayant ce statut.
- **Le tableau** affiche pour chaque publication : son titre, sa catégorie, ses plateformes, son statut, sa date de création.
- Une étiquette **"Plan hebdomadaire"** apparaît à côté du titre si cette publication fait partie d'une semaine générée.
- Un triangle rouge ⚠️ apparaît si l'envoi automatique de cette publication a échoué sur une plateforme — cliquer dessus (ou survoler) indique laquelle.
- **L'icône poubelle** à droite de chaque ligne permet de supprimer directement une publication *tant qu'elle n'est pas encore publiée* (une fois publiée, elle ne peut plus être supprimée depuis cette liste, par sécurité).

### 5.2 Créer une nouvelle publication

Bouton **Nouvelle publication** (en haut de la page Publications).

- **De quoi parle cette publication ?** : décrire librement le sujet (ex. "Nous recrutons des conseillers clientèle bilingues").
- **Type de publication** : ex. "Offre d'emploi", "Portrait d'équipe"...
- **Pilier de contenu** : Recrutement / Ressources humaines / Bien-être des employés.
- **Plateformes** : cocher celles concernées.
- **Photo** : soit *Utiliser une vraie photo* (choisir parmi les photos déjà téléversées dans Images), soit *Générer une photo* (l'IA en trouve une automatiquement).
- **Ton**, **Public cible**, **Objectif** *(tous optionnels)*.

Cliquer sur **Générer**. Un aperçu du résultat s'affiche avec :
- **Enregistrer comme brouillon** : garde la publication telle quelle, à reprendre plus tard ;
- **Publier** : marque la publication comme prête ;
- **Régénérer** : refait entièrement la publication avec les mêmes critères ;
- **Annuler** : supprime cet essai et revient au formulaire vide.

### 5.3 La page détaillée d'une publication

En ouvrant une publication (depuis le calendrier, une semaine, ou la liste), on arrive sur sa page complète.

**En haut :**
- Un lien **Retour** vers là d'où on vient (semaine ou liste des publications).
- Si la publication fait partie d'une semaine : des flèches ◀ ▶ pour naviguer directement vers la publication précédente/suivante de la même semaine, sans repasser par la liste.
- Le titre et le menu déroulant de **statut** (voir 6.1), modifiable directement ici.

**L'aperçu de la publication :**
- L'image actuelle, avec en dessous la légende, les hashtags et l'appel à l'action, exactement comme cela apparaîtra une fois publié.
- Si plusieurs styles de visuel ont été générés, ils sont proposés en miniatures sous l'image sous **"Choisir un style"** — cliquer sur une miniature change l'image affichée.
- **Source du flyer** indique si la photo vient de l'IA ou d'une photo existante, avec un bouton **Changer** pour en refaire une (nouveau choix : générer ou repartir d'une photo existante).

**Bloc Contenu** (modifiable tant que la publication n'est pas publiée) :
- Titre, Accroche, Légende, Appel à l'action, Hashtags, Concept visuel.

**Bloc Détails :**
- Pilier de contenu, Objectif, Audience, Ton, Image attachée.
- Si la publication est liée à une date du calendrier : l'interrupteur **Publication automatique à la date programmée** (voir section 9).

**Adaptations par plateforme :**
Un onglet par plateforme choisie (Facebook, LinkedIn, etc.), chacun avec sa propre légende et ses propres hashtags modifiables indépendamment — un post peut avoir un texte différent selon la plateforme.

Sous chaque onglet, un bloc indique si cette publication a déjà été **envoyée pour de vrai** sur cette plateforme :
- Si oui : la date et un lien **voir la publication** vers le post réel ;
- Si non : un bouton **Publier sur [Plateforme]** — cliquer dessus l'envoie immédiatement et réellement sur le compte connecté.

**En bas de page :**
- **Supprimer** : supprime définitivement la publication *(tant qu'elle n'est pas publiée)*.
- **Enregistrer les modifications** : sauvegarde tout changement fait dans les champs ci-dessus.
- **Publier** : marque la publication comme "Publié" dans l'outil (⚠️ voir l'encadré ci-dessous — ce bouton ne poste PAS automatiquement sur les réseaux sociaux).

> **Important à comprendre :** le bouton **"Publier"** en bas de page ne fait que marquer la publication comme terminée *dans l'application*. Pour qu'elle parte réellement sur Facebook, LinkedIn, etc., il faut cliquer sur le bouton **"Publier sur [Plateforme]"** de chaque onglet — ou activer la publication automatique (section 9).

Si des modifications n'ont pas été enregistrées et qu'on essaie de quitter la page (bouton retour, précédent/suivant), une fenêtre demande de confirmer : **Enregistrer et quitter**, **Quitter sans enregistrer**, ou **Annuler**.

---

## 6. Comprendre les statuts et repères visuels

### 6.1 Les 4 statuts d'une publication

| Statut | Signification |
|---|---|
| **Brouillon** | En cours de préparation, rien n'est figé |
| **À valider** | Prête à être relue avant publication |
| **Programmé** | Une date est fixée pour cette publication |
| **Publié** | Marquée comme terminée dans l'outil |

Le statut est un repère interne à l'outil — il n'a aucun lien automatique avec le fait que le post soit réellement en ligne sur les réseaux sociaux (voir l'encadré important ci-dessus).

---

## 7. Les Images

Menu **Images** — la bibliothèque de toutes les photos de l'entreprise utilisables dans les publications.

- **Téléverser des images** : bouton en haut à droite, permet de choisir une ou plusieurs photos depuis l'ordinateur (formats acceptés : PNG, JPEG, WEBP).
- Chaque photo peut être **modifiée** (icône crayon au survol) : ajouter une description et des étiquettes (mots-clés séparés par des virgules, ex. "bureau, équipe, tunis").
- **Supprimer** une photo depuis cette fenêtre de modification (icône poubelle).

Ces photos sont celles proposées dans le sélecteur "Utiliser une vraie photo" lors de la création d'une publication.

---

## 8. La Marque

Menu **Marque** — trois blocs.

### 8.1 Logo et identité
- **Logo** : remplaçable via le bouton **Remplacer le logo**.
- **Nom**, **Slogan**.
- **Couleurs** : Primaire, Accent, Arrière-plan — utilisées automatiquement dans le design des visuels générés.
- **Directives de ton** et **Directives de communication** : des instructions en texte libre données à l'IA pour qu'elle écrive dans le style de l'entreprise (ex. "Humain, dynamique, professionnel").

### 8.2 Identifiants développeur des plateformes
Section technique, à remplir une seule fois par la personne qui configure les comptes développeur Facebook/Instagram/TikTok/LinkedIn. Une fois ces identifiants enregistrés, les boutons de connexion (section 8.3) fonctionnent.

### 8.3 Comptes de réseaux sociaux connectés
Pour chaque plateforme (Facebook, Instagram, LinkedIn, TikTok) :
- **Non connecté** : bouton **Connecter**, qui redirige vers la plateforme pour autoriser l'accès.
- **Connecté** : affiche le nom du compte connecté, avec un bouton **Déconnecter**.

Un seul compte par plateforme peut être connecté à la fois. C'est ce compte qui reçoit les publications quand on clique sur "Publier sur [Plateforme]" ou lors de la publication automatique.

---

## 9. La publication automatique — à bien comprendre

Quand l'interrupteur **"Publication automatique"** est activé sur une publication programmée (section 5.3 ou 4.1), voici ce qui se passe concrètement :

- Chaque jour, l'application vérifie automatiquement s'il y a des publications dont la date est arrivée et qui ont cette option activée.
- Pour chacune, elle **envoie réellement le post** sur chaque plateforme pour laquelle un compte est connecté (section 8.3).
- Si aucun compte n'est connecté pour une plateforme donnée, cette plateforme est simplement ignorée (pas d'erreur bloquante).
- La publication est ensuite marquée "Publié" dans l'outil.

**⚠️ Aucune relecture humaine n'a lieu avant cet envoi automatique.** Il est donc recommandé de vérifier le contenu d'une publication *avant* d'activer cette option, surtout si sa date est proche.

Si l'envoi échoue pour une raison quelconque (compte déconnecté, problème technique), cela n'empêche pas l'outil de continuer — mais un triangle d'alerte rouge ⚠️ apparaît alors sur cette publication dans la liste (section 5.1), et un badge rouge en haut de l'écran indique le nombre de publications à vérifier.

---

## 10. Le badge de disponibilité de l'IA

En haut à droite de chaque page, un petit badge indique :

- 🟢 **IA disponible** : tout fonctionne normalement, la génération de contenu est possible.
- 🔴 **Limite atteinte — réessayez dans [temps]** : la capacité gratuite de génération de contenu est temporairement épuisée pour la journée. Un compte à rebours indique quand réessayer. Dans ce cas, patienter simplement avant de générer de nouvelles publications — cela ne concerne que la génération de nouveau contenu, tout le reste de l'application continue de fonctionner normalement.

---

## 11. Limitations actuelles (à connaître)

- **Instagram** : la connexion n'est pas encore active — un blocage de vérification côté Meta (Facebook/Instagram) est en cours de résolution. Facebook et LinkedIn fonctionnent déjà normalement.
- **TikTok** : la connexion n'est pas encore disponible ; cela nécessite une validation supplémentaire de la part de TikTok (non prioritaire pour le moment).
- **LinkedIn** : la connexion publie actuellement sur un **profil personnel**, pas encore sur une Page Entreprise LinkedIn — une démarche d'approbation séparée serait nécessaire pour publier au nom de l'entreprise directement.

---

## 12. Questions fréquentes

**Une publication "Publiée" dans l'outil est-elle forcément en ligne sur Facebook/Instagram ?**
Non — voir l'encadré important de la section 5.3. Il faut soit cliquer sur "Publier sur [Plateforme]" pour chaque réseau, soit activer la publication automatique.

**Peut-on modifier une publication après l'avoir publiée ?**
Non, une fois le statut "Publié", le contenu n'est plus modifiable ni supprimable, par sécurité.

**Que faire si le badge IA est rouge ?**
Attendre le temps indiqué par le compte à rebours avant de générer de nouvelles publications. Les publications déjà créées restent consultables et modifiables normalement.

**Comment savoir si une publication automatique a échoué ?**
Un triangle rouge apparaît à côté de son titre dans la liste des Publications, et un badge en haut de l'écran en indique le nombre total.
