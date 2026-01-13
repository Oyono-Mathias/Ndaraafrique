'use client';

import React from 'react';
import { Users, DollarSign, BookOpen, MessageSquare, TrendingUp, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- COMPOSANT DE CARTE STATISTIQUE ---
interface StatCardProps {
  title: string;
  value: string | null;
  icon: React.ElementType;
  isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading }) => (
  <Card className="bg-white dark:bg-card shadow-sm transition-transform hover:-translate-y-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/5" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

// --- COMPOSANT DU TABLEAU DE BORD PRINCIPAL ---
const AdminDashboard = () => {
  // Les données seront chargées ici via des hooks (ex: useSWR, react-query, ou useEffect)
  // Pour l'instant, l'état isLoading contrôle l'affichage des skeletons.
  const isLoading = false; // Mettez à true pour voir les skeletons

  // Données fictives pour la structure de l'activité récente
  const recentActivities = [
    { studentName: 'Amina Diallo', courseName: 'Introduction à l\'IA', time: 'il y a 5 minutes' },
    { studentName: 'Kwame Nkrumah', courseName: 'Marketing Digital 101', time: 'il y a 22 minutes' },
  ];
  
  const hasActivities = recentActivities.length > 0;

  return (
    <div className="space-y-6">
      
      {/* 1. GRILLE DE CARTES STATISTIQUES */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Étudiants"
          value={isLoading ? null : "0"}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Revenus (Mois en cours)"
          value={isLoading ? null : "0 XOF"}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="Cours Publiés"
          value={isLoading ? null : "0"}
          icon={BookOpen}
          isLoading={isLoading}
        />
        <StatCard
          title="Tickets Support Ouverts"
          value={isLoading ? null : "0"}
          icon={MessageSquare}
          isLoading={isLoading}
        />
      </div>

      {/* 2. SECTION ACTIVITÉ RÉCENTE */}
      <Card className="bg-white dark:bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Activité Récente</CardTitle>
          <CardDescription>Les dernières inscriptions sur la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead className="hidden sm:table-cell">Cours</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton pour le tableau
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : hasActivities ? (
                // Affichage des données réelles
                recentActivities.map((activity, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{activity.studentName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{activity.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{activity.courseName}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{activity.time}</TableCell>
                  </TableRow>
                ))
              ) : (
                // État vide
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Aucune activité récente à afficher.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
