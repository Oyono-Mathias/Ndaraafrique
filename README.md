
# 🚀 Ndara Afrique - Plateforme d'E-learning Pan-Africaine

Bienvenue sur **Ndara Afrique**, la révolution de la formation en ligne conçue pour le continent africain. Cette application est optimisée pour une expérience **Android-First**, avec une esthétique **Vintage** et une infrastructure **100% Temps Réel**.

## ✨ Fonctionnalités Clés

### 🎓 Espace Étudiant (100% Opérationnel)
- **Tableau de Bord "Live"** : Suivi de progression et activités en temps réel.
- **Lecteur de Cours Intelligent** : Support Vidéo, PDF et Texte avec reprise automatique là où vous vous étiez arrêté.
- **Tuteur MATHIAS (IA)** : Votre coach personnel disponible 24h/24 pour répondre à toutes vos questions pédagogiques.
- **Paiement Moneroo** : Tunnel de checkout fluide via Mobile Money (MTN, Orange, Wave) et Carte Bancaire.
- **Système de Certificats** : Génération de diplômes officiels style vintage avec sceau de sécurité et partage WhatsApp.
- **Communauté & Messagerie** : Annuaire des membres par filière et chat instantané sécurisé.
- **Centre de Support** : Gestion de tickets d'assistance intégrée.

### 📱 Optimisations PWA & Mobile
- **PWA Ready** : Installation sur l'écran d'accueil du smartphone.
- **Mode Hors-Ligne** : Page de secours vintage et détection de perte de signal.
- **Navigation Tactile** : Barre de navigation basse (Bottom Nav) inspirée des meilleurs standards Android.

## 🛠️ Stack Technique
- **Framework** : Next.js 14 (App Router)
- **Base de données & Auth** : Firebase (Firestore, Auth, Storage)
- **IA** : Firebase Genkit (Gemini 1.5 Flash)
- **Style** : Tailwind CSS & ShadCN UI
- **Paiements** : Moneroo Gateway

## 🚀 Commandes Utiles

### Développement local
```bash
npm run dev
```

### Déploiement sur Firebase
```bash
# Pour le frontend (Hosting)
npm run build
firebase deploy --only hosting

# Pour les fonctions IA (si applicable)
npm run genkit:dev
```

### Sauvegarde GitHub
```bash
git add .
git commit -m "Votre message ici"
git push
```

---
*Fait avec ❤️ pour l'avenir de l'éducation en Afrique.*
