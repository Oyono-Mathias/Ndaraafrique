# 🎯 BRIEF TECHNIQUE : DESIGN SYSTEM & RECHARGE WALLET - NDARA AFRIQUE

## 📌 Contexte du Projet
Ndara Afrique est une plateforme EdTech panafricaine. L'expérience utilisateur est **Android-first**, privilégiant les interactions tactiles, les cartes aux bords très arrondis (radius-4xl) et les textures grainées. L'esthétique est de type **Fintech Vintage**.

---

## 🎯 OBJECTIF 1 : EXTRACTION ET RECONSTRUCTION DU DESIGN SYSTEM
Analyse scrupuleusement les codes HTML déjà partagés pour en extraire l'ADN visuel et reconstruire un système de design cohérent.

### 🔍 Analyse requise :
1. **Couleurs (CRITIQUE)** : Ne propose pas de nouvelles couleurs. Identifie et utilise les codes **Hex/HSL exacts** que tu as utilisés dans les snippets HTML précédents (le sombre profond, l'émeraude, l'ocre, etc.).
2. **Composants Clés** : Dashboard (Cards immersives), Profil (Cards d'identité), Messagerie (WhatsApp style), Panier (Ticket de caisse vintage).
3. **Styles CSS** : Extraire les patterns Tailwind utilisés, notamment les classes personnalisées (`.grain-overlay`, `.virtual-card`, `.vintage-ticket`, `.nav-active-glow`).
4. **Typographie** : Respecter les contrastes (Extra-bold uppercase pour les labels, serif italique pour les citations).

### 🛠️ Livrables attendus :
- **globals.css** : Un fichier consolidé regroupant les variables HSL et les utilitaires personnalisés basés sur tes propres choix de couleurs.
- **UI Components** : Versions React/Tailwind purifiées des composants : `Card`, `Badge`, `Button`, `StatPill`, et `ActionRow`.
- **Contrainte** : **AUCUN REDESIGN**. Reproduire fidèlement le rendu visuel actuel en le rendant plus modulaire.

---

## 🎯 OBJECTIF 2 : FEATURE ADMIN - RECHARGE WALLET
Implémenter l'interface de recharge du portefeuille utilisateur dans le Cockpit Admin.

### 📋 Spécifications de l'interface :
1. **Formulaire de Recharge** :
   - Un sélecteur d'utilisateur (recherche par email/nom).
   - Un champ de saisie du montant (XOF).
   - Un bouton de validation "Signer la recharge" avec état de chargement.
2. **Historique des Opérations** :
   - Une liste chronologique des dernières recharges effectuées par les admins.
   - Affichage : Admin auteur, Bénéficiaire, Montant, Date.
3. **Feedback** : Notifications de succès ou d'erreur via Toast.

### 🔐 Logique & Sécurité :
- L'interface doit appeler la Server Action `rechargeUserWallet`.
- L'accès doit être strictement réservé au rôle `admin`.
- Mise à jour en temps réel de l'UI dès que Firestore est modifié.

---

## 🚀 FORMAT DE RÉPONSE ATTENDU
- Code propre, typé (TypeScript).
- Organisation par fichiers clairs (`src/components/admin/wallet/...`).
- Intégration parfaite avec Tailwind CSS et ShadCN.

"Bara ala, Tonga na ndara."
