
'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, BookOpen } from 'lucide-react';

const StatsPageSkeleton = () => (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-white">Statistiques & Revenus</h1>
            <p className="text-muted-foreground">Analyse financière en temps réel de la plateforme.</p>
        </header>

        <div className="grid lg:grid-cols-5 gap-6">
            {/* Main Chart */}
            <Card className="lg:col-span-3 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Revenus Mensuels</CardTitle>
                    <CardDescription>Évolution des revenus bruts générés chaque mois.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <Skeleton className="h-80 w-full" />
                </CardContent>
            </Card>

            {/* Top Courses */}
            <Card className="lg:col-span-2 bg-white dark:bg-card shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Cours les plus populaires
                    </CardTitle>
                    <CardDescription>Classement des cours par nombre d'inscriptions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/12">#</TableHead>
                                <TableHead className="w-8/12">Cours</TableHead>
                                <TableHead className="text-right w-3/12">Inscriptions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
);


export default function StatisticsPage() {
    // For now, we only render the skeleton/loading state as per the prompt.
    // The logic will be added in the next step.
    return <StatsPageSkeleton />;
}
