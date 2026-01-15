# **App Name**: Ndara Afrique Navigation

## Core Features:

- Role-Based Navigation: Dynamically render the sidebar navigation based on the user's role (student, instructor, admin).
- Authentication and Role Retrieval: Retrieve the user's role from Firestore after login and store it in global state for access throughout the application.
- Student View (Light Theme): Implement the sidebar menu for the student role with a light theme: APPRENTISSAGE (Tableau de bord, Mes Formations, Mes Certificats, Tuteur IA, Mes Devoirs, Mes Questions, Messages, Annuaire), COMPTE (Profil, Liste de souhaits, Paiements, Notifications). Includes a 'Switch to Instructor Mode' button if the user also has the instructor role.
- Instructor View (Dark Theme): Implement the sidebar menu for the instructor role with a dark theme: Navigation (Tableau de bord, Mes Cours, Mes Étudiants, Mes Revenus, Statistiques), Interaction (Questions/Réponses, Avis, Devoirs), Outils (Quiz, Certificats, Ressources, Paramètres). Includes a 'Switch to Student Mode' button.
- Admin View (Future-Proof): Structure the navigation system to accommodate a future admin view with a distinct navigation menu.
- Tuteur IA: Leads to a distinct AI chat screen.

## Style Guidelines:

- Student View: Primary color: Deep blue (#3F51B5) for a professional and trustworthy feel.
- Student View: Background color: Light gray (#F5F5F5) for a clean and modern appearance.
- Student View: Accent color: Cyan (#00BCD4) for interactive elements and highlights.
- Instructor View: Primary color: Dark slate gray (#263238) for a sophisticated and serious tone.
- Instructor View: Background color: Darker slate gray (#1A202C) to create a strong contrast with UI elements and make the content stand out.
- Instructor View: Accent color: Deep orange (#FF7043) for highlighting important options.
- Font: 'Inter' sans-serif for a clean, modern, objective look in both headings and body text.
- Fully responsive design with a sidebar that collapses into a hamburger menu on mobile devices.