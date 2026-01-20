'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign, BookOpen, HelpCircle, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StatCardProps {
  title: string;
  value: string;
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

const RecentActivityItem = ({ studentName, courseName, time, avatar }: { studentName: string, courseName: string, time: string, avatar: string }) => (
    <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50">
        <Avatar className="h-9 w-9">
            <AvatarImage src={avatar} />
            <AvatarFallback>{studentName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-sm">
            <p className="font-medium text-slate-800 dark:text-slate-200">
                <span className="font-bold">{studentName}</span> s'est inscrit(e) à <span className="font-bold">{courseName}</span>.
            </p>
            <p className="text-xs text-muted-foreground">{time}</p>
        </div>
    </div>
);

const ActivityItemSkeleton = () => (
    <div className="flex items-center gap-4 p-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
        </div>
    </div>
);


const AdminDashboard = () => {
    const [isLoading, setIsLoading] = useState(true);

    // Simulate data fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
            <p className="text-muted-foreground">Vue d'ensemble de l'activité de la plateforme.</p>
        </header>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Étudiants" value="1,250" icon={Users} isLoading={isLoading} />
        <StatCard title="Revenus (Mois)" value="1,500,000 XOF" icon={DollarSign} isLoading={isLoading} />
        <StatCard title="Cours Publiés" value="58" icon={BookOpen} isLoading={isLoading} />
        <StatCard title="Tickets Ouverts" value="3" icon={HelpCircle} isLoading={isLoading} />
      </section>

      <section>
        <Card className="bg-white dark:bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity />
                Activité Récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <>
                  <ActivityItemSkeleton />
                  <ActivityItemSkeleton />
                  <ActivityItemSkeleton />
                </>
              ) : (
                <>
                    <RecentActivityItem 
                        studentName="Amina Diallo"
                        courseName="Introduction à React"
                        time="il y a 5 minutes"
                        avatar="/placeholder-avatars/amina.jpg"
                    />
                     <RecentActivityItem 
                        studentName="Kwame Nkrumah"
                        courseName="Node.js pour débutants"
                        time="il y a 2 heures"
                        avatar="/placeholder-avatars/kwame.jpg"
                    />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AdminDashboard;
