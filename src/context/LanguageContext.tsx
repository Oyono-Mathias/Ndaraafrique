
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Define the shape of your translations
interface Translations {
  welcomeMessage: string;
  loginButton: string;
  registerButton: string;
  dashboardTitle: string;
  exploreCourses: string;
  // Auth Page
  loginTitle: string;
  loginDescription: string;
  emailLabel: string;
  passwordLabel: string;
  rememberMeLabel: string;
  forgotPasswordLink: string;
  noAccountPrompt: string;
  registerLink: string;
  registerTitle: string;
  registerDescription: string;
  firstNameLabel: string;
  lastNameLabel: string;
  countryOriginLabel: string;
  countryCurrentLabel: string;
  selectPlaceholder: string;
  createAccountButton: string;
  alreadyAccountPrompt: string;
  loginLink: string;
  loginSuccessTitle: string;
  loginErrorTitle: string;
  registerSuccessTitle: string;
  registerSuccessDescription: string;
  registerErrorTitle: string;
  // Student Sidebar
  navSelection: string;
  navSearch: string;
  navMyLearning: string;
  navTutor: string;
  navPersonal: string;
  navMyCertificates: string;
  navWishlist: string;
  navMyAssignments: string;
  navDirectory: string;
  navMyQuestions: string;
  navMessages: string;
  navAccount: string;
  navNotifications: string;
  // Instructor Sidebar
  navInstructorDashboard: string;
  navMyCourses: string;
  navMyStudents: string;
  navMyRevenue: string;
  navStatistics: string;
  navInteraction: string;
  navQA: string;
  navReviews: string;
  navAssignments: string;
  navTools: string;
  navQuiz: string;
  navCertificates: string;
  navResources: string;
  navSettings: string;
  // Admin Dashboard
  totalRevenue: string;
  totalUsers: string;
  publishedCourses: string;
  monthlyRevenue: string;
  // My Courses Page (Instructor)
  myCoursesDescription: string;
  searchCoursePlaceholder: string;
  noCoursesFoundTitle: string;
  noCoursesFoundMessage: string;
  createNewCourse: string;
  studentLabel: (params: { count: number }) => string;
  deleteCourseConfirmationTitle: string;
  deleteCourseConfirmationMessage: (params: { courseTitle: string }) => string;
  courseDeletedTitle: string;
  courseDeletedMessage: string;
  errorTitle: string;
  courseDeletionErrorMessage: string;
  editButton: string;
  deleteButton: string;
  cancelButton: string;
}

// Define the supported languages
export type Language = 'en' | 'fr' | 'sg';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Translations, params?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = {
  en: {
    welcomeMessage: "Welcome to FormaAfrique! We are delighted to guide you in your training. If you have any questions, don't hesitate to ask them here.",
    loginButton: "Login",
    registerButton: "Register",
    dashboardTitle: "Dashboard",
    exploreCourses: "Explore Courses",
    loginTitle: "Login",
    loginDescription: "Access your dashboard.",
    emailLabel: "Email",
    passwordLabel: "Password",
    rememberMeLabel: "Remember me",
    forgotPasswordLink: "Forgot password?",
    noAccountPrompt: "Don't have an account?",
    registerLink: "Sign up",
    registerTitle: "Create an account",
    registerDescription: "Join the community.",
    firstNameLabel: "First Name",
    lastNameLabel: "Last Name",
    countryOriginLabel: "Country of Origin",
    countryCurrentLabel: "Current Country",
    selectPlaceholder: "Select",
    createAccountButton: "Create account",
    alreadyAccountPrompt: "Already have an account?",
    loginLink: "Log in",
    loginSuccessTitle: "Login successful!",
    loginErrorTitle: "Login failed",
    registerSuccessTitle: "Registration successful!",
    registerSuccessDescription: "Welcome to FormaAfrique.",
    registerErrorTitle: "Registration failed",
    navSelection: "Selection",
    navSearch: "Search",
    navMyLearning: "My Learning",
    navTutor: "AI Tutor",
    navPersonal: "PERSONAL",
    navMyCertificates: "My Certificates",
    navWishlist: "Wishlist",
    navMyAssignments: "My Assignments",
    navDirectory: "Directory",
    navMyQuestions: "My Questions",
    navMessages: "Messages",
    navAccount: "Account",
    navNotifications: "Notifications",
    navInstructorDashboard: "Dashboard",
    navMyCourses: "My Courses",
    navMyStudents: "My Students",
    navMyRevenue: "My Revenue",
    navStatistics: "Statistics",
    navInteraction: "INTERACTION",
    navQA: "Q&A",
    navReviews: "Reviews",
    navAssignments: "Assignments",
    navTools: "TOOLS",
    navQuiz: "Quiz",
    navCertificates: "Certificates",
    navResources: "Resources",
    navSettings: "Settings",
    totalRevenue: 'Total Revenue',
    totalUsers: 'Total Users',
    publishedCourses: 'Published Courses',
    monthlyRevenue: 'Revenue (this month)',
    myCoursesDescription: 'Manage your courses and track enrollments.',
    searchCoursePlaceholder: 'Search for a course...',
    noCoursesFoundTitle: 'No Courses Found',
    noCoursesFoundMessage: 'Start by creating your first educational content.',
    createNewCourse: 'Create a new course',
    studentLabel: ({ count }) => `${count} student${count > 1 ? 's' : ''}`,
    deleteCourseConfirmationTitle: 'Confirm Deletion',
    deleteCourseConfirmationMessage: ({ courseTitle }) => `Are you sure you want to permanently delete the course "${courseTitle}"? This action is irreversible.`,
    courseDeletedTitle: 'Course Deleted',
    courseDeletedMessage: 'The course has been successfully deleted.',
    errorTitle: 'Error',
    courseDeletionErrorMessage: 'Failed to delete the course.',
    editButton: 'Edit',
    deleteButton: 'Delete',
    cancelButton: 'Cancel',
  },
  fr: {
    welcomeMessage: "Bienvenue sur FormaAfrique ! 🌍 Nous sommes ravis de t'accompagner dans ta formation. Si tu as des questions, n'hésite pas à les poser ici.",
    loginButton: "Se connecter",
    registerButton: "S'inscrire",
    dashboardTitle: "Tableau de bord",
    exploreCourses: "Explorer les cours",
    loginTitle: "Se connecter",
    loginDescription: "Accédez à votre tableau de bord.",
    emailLabel: "Email",
    passwordLabel: "Mot de passe",
    rememberMeLabel: "Se souvenir de moi",
    forgotPasswordLink: "Mot de passe oublié ?",
    noAccountPrompt: "Vous n'avez pas de compte ?",
    registerLink: "S'inscrire",
    registerTitle: "Créer un compte",
    registerDescription: "Rejoignez la communauté.",
    firstNameLabel: "Prénom",
    lastNameLabel: "Nom",
    countryOriginLabel: "Pays d'origine",
    countryCurrentLabel: "Pays actuel",
    selectPlaceholder: "Sélectionner",
    createAccountButton: "Créer un compte",
    alreadyAccountPrompt: "Déjà un compte ?",
    loginLink: "Se connecter",
    loginSuccessTitle: "Connexion réussie !",
    loginErrorTitle: "Échec de la connexion",
    registerSuccessTitle: "Inscription réussie !",
    registerSuccessDescription: "Bienvenue sur FormaAfrique.",
    registerErrorTitle: "Échec de l'inscription",
    navSelection: "Sélection",
    navSearch: "Recherche",
    navMyLearning: "Apprentissage",
    navTutor: "Tuteur IA",
    navPersonal: "PERSONNEL",
    navMyCertificates: "Mes Certificats",
    navWishlist: "Liste de souhaits",
    navMyAssignments: "Mes Devoirs",
    navDirectory: "Annuaire",
    navMyQuestions: "Mes Questions",
    navMessages: "Messages",
    navAccount: "Compte",
    navNotifications: "Notifications",
    navInstructorDashboard: "Tableau de bord",
    navMyCourses: "Mes Cours",
    navMyStudents: "Mes Étudiants",
    navMyRevenue: "Mes Revenus",
    navStatistics: "Statistiques",
    navInteraction: "INTERACTION",
    navQA: "Questions/Réponses",
    navReviews: "Avis",
    navAssignments: "Devoirs",
    navTools: "OUTILS",
    navQuiz: "Quiz",
    navCertificates: "Certificats",
    navResources: "Ressources",
    navSettings: "Paramètres",
    totalRevenue: 'Revenus Totaux',
    totalUsers: 'Utilisateurs Totaux',
    publishedCourses: 'Cours Publiés',
    monthlyRevenue: 'Revenus (ce mois-ci)',
    myCoursesDescription: 'Gérez vos formations et suivez les inscriptions.',
    searchCoursePlaceholder: 'Rechercher un cours...',
    noCoursesFoundTitle: 'Aucun cours trouvé',
    noCoursesFoundMessage: 'Commencez par créer votre premier contenu pédagogique.',
    createNewCourse: 'Créer un nouveau cours',
    studentLabel: ({ count }) => `${count} étudiant${count > 1 ? 's' : ''}`,
    deleteCourseConfirmationTitle: 'Confirmer la suppression',
    deleteCourseConfirmationMessage: ({ courseTitle }) => `Êtes-vous sûr de vouloir supprimer définitivement le cours "${courseTitle}" ? Cette action est irréversible.`,
    courseDeletedTitle: 'Cours Supprimé',
    courseDeletedMessage: 'Le cours a été supprimé avec succès.',
    errorTitle: 'Erreur',
    courseDeletionErrorMessage: 'Impossible de supprimer le cours.',
    editButton: 'Modifier',
    deleteButton: 'Supprimer',
    cancelButton: 'Annuler',
  },
  sg: {
    welcomeMessage: "Bara ala FormaAfrique! E yeke na ngia ti mû maboko na mo na yâ ti formation ti mo. Tongana mo yeke na kionde, hunda ni ge.",
    loginButton: "Gango",
    registerButton: "S'inscrire", // Keeping it simple for now
    dashboardTitle: "Tableau ti kua",
    exploreCourses: "Diko acours",
    loginTitle: "Gango na yâ ni",
    loginDescription: "Gango na tableau ti mo.",
    emailLabel: "Email",
    passwordLabel: "Kanga-ndia",
    rememberMeLabel: "Dutingo mbi",
    forgotPasswordLink: "Mo girisa kanga-ndia ti mo?",
    noAccountPrompt: "Compte ti mo ayeke pëpe?",
    registerLink: "S'inscrire",
    registerTitle: "Sâra mbeni fini compte",
    registerDescription: "Zia mo na yâ ti bungbi.",
    firstNameLabel: "Iri ti mo",
    lastNameLabel: "Iri ti babâ",
    countryOriginLabel: "Sese ti kodoro",
    countryCurrentLabel: "Sese so mo yeke dä",
    selectPlaceholder: "Mû mbeni ye",
    createAccountButton: "Sâra compte",
    alreadyAccountPrompt: "Compte ayeke déjà?",
    loginLink: "Gango",
    loginSuccessTitle: "Mo gango awe!",
    loginErrorTitle: "Gango ti mo ake",
    registerSuccessTitle: "Mo sâra compte awe!",
    registerSuccessDescription: "Bara ala FormaAfrique.",
    registerErrorTitle: "Sâra compte ake",
    navSelection: "Selection",
    navSearch: "Diko",
    navMyLearning: "Mandango ye",
    navTutor: "Wa-mandango IA",
    navPersonal: "TI MO MÊME",
    navMyCertificates: "Certificat ti mbi",
    navWishlist: "Ye so mbi ye",
    navMyAssignments: "Kua ti mbi",
    navDirectory: "Annuaire",
    navMyQuestions: "Hundango ti mbi",
    navMessages: "Message",
    navAccount: "Compte",
    navNotifications: "Notifications",
    navInstructorDashboard: "Tableau",
    navMyCourses: "Cours ti mbi",
    navMyStudents: "Awamandango ti mbi",
    navMyRevenue: "Ngere ti mbi",
    navStatistics: "Statistique",
    navInteraction: "INTERACTION",
    navQA: "Hunda/Kiringo tënë",
    navReviews: "Avis",
    navAssignments: "Kua ti manda",
    navTools: "OUTILS",
    navQuiz: "Quiz",
    navCertificates: "Certificat",
    navResources: "Ressource",
    navSettings: "Paramètre",
    totalRevenue: 'Wara ti nani',
    totalUsers: 'Wara ti azo',
    publishedCourses: 'Mbeti ti mandango ye',
    monthlyRevenue: 'Wara ti nze so',
    myCoursesDescription: 'Sâra kua na aformation ti mo na mo tara awamandango.',
    searchCoursePlaceholder: 'Diko mbeni cours...',
    noCoursesFoundTitle: 'A wara cours pëpe',
    noCoursesFoundMessage: 'Komanse na sâra ye ti mandango ti mo ti kôzo.',
    createNewCourse: 'Sâra mbeni fini cours',
    studentLabel: ({ count }) => `${count} wamandango`,
    deleteCourseConfirmationTitle: 'Yeda ti zi na sese',
    deleteCourseConfirmationMessage: ({ courseTitle }) => `Mo ye biani ti zi cours "${courseTitle}"? A yeke kiri na pekoni pëpe.`,
    courseDeletedTitle: 'A zi cours awe',
    courseDeletedMessage: 'A zi cours ti mo na succès.',
    errorTitle: 'Erreur',
    courseDeletionErrorMessage: 'A lingbi ti zi cours so pëpe.',
    editButton: 'Changé',
    deleteButton: 'Zi',
    cancelButton: 'Ke',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    const storedLang = localStorage.getItem('formaafrique-lang') as Language;
    if (storedLang && ['en', 'fr', 'sg'].includes(storedLang)) {
      setLanguageState(storedLang);
    } else {
        // Auto-detect based on browser language if no preference is stored
        const browserLang = navigator.language.split('-')[0];
        if(browserLang === 'sg') setLanguageState('sg');
        else if(browserLang === 'en') setLanguageState('en');
        else setLanguageState('fr'); // Default to French
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('formaafrique-lang', lang);
  };

  const t = useCallback((key: keyof Translations, params?: any): string => {
    const translation = translations[language][key];
    if (typeof translation === 'function') {
        return translation(params);
    }
    return translation || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
