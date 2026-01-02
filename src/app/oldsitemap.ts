
import { MetadataRoute } from 'next';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeFirebase } from './firebase'; // Assurez-vous que le chemin est correct

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://formaafrique.com'; // Remplacez par votre domaine de production

  // Initialisation de Firebase
  let db;
  try {
    const { firestore } = initializeFirebase();
    db = firestore;
  } catch (e) {
    console.error("Firebase init failed for sitemap, returning static routes.", e);
    // Retourner uniquement les pages statiques en cas d'échec
    return [
        { url: baseUrl, lastModified: new Date() },
        { url: `${baseUrl}/dashboard`, lastModified: new Date() },
        { url: `${baseUrl}/search`, lastModified: new Date() },
    ];
  }


  // Récupérer les cours publiés depuis Firestore
  const coursesRef = collection(db, 'courses');
  const q = query(coursesRef, where('status', '==', 'Published'));
  
  let courseUrls: MetadataRoute.Sitemap = [];

  try {
    const querySnapshot = await getDocs(q);
    courseUrls = querySnapshot.docs.map((doc) => {
      const course = doc.data();
      return {
        url: `${baseUrl}/course/${doc.id}`,
        lastModified: course.publishedAt?.toDate() || course.createdAt?.toDate() || new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      };
    });
  } catch (error) {
    console.error("Error fetching courses for sitemap:", error);
  }

  // Ajouter les routes statiques
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'yearly', priority: 1 },
    { url: `${baseUrl}/dashboard`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ];

  return [...staticRoutes, ...courseUrls];
}
