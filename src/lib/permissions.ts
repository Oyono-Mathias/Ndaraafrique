
export const PERMISSION_GROUPS = {
  "Général": {
    "admin.access": "Accéder au tableau de bord administrateur",
  },
  "Gestion du Contenu": {
    "admin.courses.manage": "Gérer tous les cours",
    "admin.reviews.manage": "Modérer les avis",
    "admin.settings.manage": "Gérer les paramètres du site (pages, carousel...)",
  },
  "Gestion des Utilisateurs": {
    "admin.users.list": "Lister tous les utilisateurs",
    "admin.users.read": "Consulter les profils utilisateurs",
    "admin.users.manage": "Modifier et suspendre les utilisateurs",
  },
  "Modération": {
    "admin.instructors.review": "Gérer les candidatures d'instructeurs",
    "admin.moderation.courses": "Modérer les cours soumis",
  },
  "Finances": {
    "admin.payments.list": "Voir toutes les transactions",
    "admin.payouts.manage": "Gérer les demandes de retrait",
    "admin.marketing.manage": "Gérer les promotions",
  },
  "Support & Sécurité": {
    "admin.support.manage": "Accéder et répondre à tous les tickets de support",
    "admin.security.read": "Consulter le journal de sécurité",
    "admin.logs.read": "Consulter le journal d'audit",
    "admin.roles.manage": "Gérer les rôles et permissions",
  },
};

// Flatten all permissions into a single array for easier iteration
export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flatMap(group => Object.keys(group));
