# 🌍 AUDIT TECHNIQUE I18N - NDARA AFRIQUE v2.5

## 1. État des Lieux : Analyse des Textes UI

### A. Pages Principales
| Emplacement | Type | Exemples de textes détectés |
|-------------|------|-----------------------------|
| `src/app/[locale]/page.tsx` | Statique | "APPRENEZ. RÉUSSISSEZ. INSPIREZ.", "Explorer le Catalogue", "Devenir Formateur" |
| `src/app/[locale]/student/dashboard/page.tsx` | Dynamique | "Bara ala,", "Continuer l'étude", "Besoin d'aide, cher Ndara ?" |
| `src/app/[locale]/login/login-client.tsx` | Formulaire | "Se connecter", "Adresse e-mail", "Mot de passe oublié ?" |
| `src/app/[locale]/student/wallet/page.tsx` | Fintech | "MON PORTEFEUILLE", "Solde Disponible", "Lancer la Transaction" |

### B. Composants Communs
| Composant | Fichier | Textes clés |
|-----------|---------|-------------|
| `StudentSidebar` | `src/components/layout/student-sidebar.tsx` | "UNIVERS TÔ MO", "Tableau de Bord", "Mes Cours", "Messagerie" |
| `Navbar` | `src/components/layout/navbar.tsx` | "Bourse", "Se connecter", "Notre Vision" |
| `CourseCard` | `src/components/cards/CourseCard.tsx` | "Offert", "Reprendre", "Payer", "Par" |

### C. Actions & Notifications (Système)
| Source | Type | Exemples |
|--------|------|----------|
| `userActions.ts` | Succès | "Injonction de fonds réussie !", "Profil mis à jour !" |
| `courseActions.ts` | Erreur | "La formation est introuvable.", "Le programme de rachat est suspendu." |

---

## 2. Architecture Proposée : next-intl

### Pourquoi next-intl ?
- **Performance** : Support natif des Server Components (zéro JS envoyé au client pour les textes statiques).
- **Routing** : Gestion automatique du préfixe `/[locale]` déjà présent dans votre structure de dossiers.
- **Standards** : Utilise le format ICU pour les pluriels et le formatage des dates/monnaies.

### Structure des fichiers
```
/src
  /messages
    fr.json  <-- Source de vérité
    en.json  <-- Traduction Anglaise
    sg.json  <-- Traduction Sango
```

---

## 3. Exemple de Structure JSON (fr.json)

```json
{
  "Common": {
    "site_name": "Ndara Afrique",
    "greeting": "Bara ala,",
    "ndara_term": "Ndara",
    "loading": "Chargement..."
  },
  "Auth": {
    "login_title": "Se connecter",
    "email_label": "Adresse e-mail",
    "password_label": "Mot de passe",
    "forgot_password": "Mot de passe oublié ?"
  },
  "Dashboard": {
    "resume_study": "Continuer l'étude",
    "tutor_box_title": "Besoin d'aide, cher Ndara ?",
    "tutor_box_desc": "Mathias répond à vos questions sur les cours 24h/24."
  },
  "Actions": {
    "error": {
      "course_not_found": "La formation est introuvable.",
      "insufficient_balance": "Votre solde est insuffisant."
    },
    "success": {
      "wallet_recharged": "Solde crédité avec succès !"
    }
  }
}
```

---

## 4. Plan de Migration Progressif (Non-Braking)

### Étape 1 : Infrastructure (Zéro impact UI)
1.  Remplir les fichiers `/src/messages/*.json` avec les textes listés ci-dessus.
2.  Configurer le `middleware.ts` pour détecter la langue du navigateur ou du profil utilisateur.
3.  Vérifier que `i18n.ts` charge correctement les fichiers JSON.

### Étape 2 : Composants de Structure (Layout)
1.  Remplacer les textes en dur dans `StudentSidebar` et `Navbar` par le hook `useTranslations`.
2.  Implémenter le sélecteur de langue dans le composant `Header` ou `UserNav`.

### Étape 3 : Pages & Dashboards
1.  Migrer la Landing Page (statique).
2.  Migrer les dashboards (mélange statique/dynamique).

### Étape 4 : Actions Serveur (Le plus délicat)
1.  Modifier les Server Actions pour qu'elles retournent des codes d'erreur (ex: `error.insufficient_balance`).
2.  Le client utilise `t(result.error)` pour afficher le message traduit dans le Toast.

---

## 5. Focus Culturel : Le Sango
Pour le Sango, le système devra supporter les caractères spéciaux et les expressions idiomatiques.
Exemple :
- FR : "Bienvenue"
- SG : "Bara ala" (Salutation collective) ou "Mo lî nzoni" (Bienvenue individuelle).
Le choix de **next-intl** permet de gérer ces variantes via des variables dans les clés.

"Bara ala, Tonga na ndara."