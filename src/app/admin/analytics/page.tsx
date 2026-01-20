
'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, MousePointerClick, UserPlus, Percent } from 'lucide-react';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DateRange } from "react-day-picker";
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading: boolean;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading, description }) => (
  <Card className="dark:bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/5 bg-slate-700" />
      ) : (
        <div className="text-2xl font-bold text-white">{value}</div>
      )}
      {description && !isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export default function AnalyticsPage() {
    const db = getFirestore();
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });
    const [stats, setStats] = useState({
        visits: 0,
        ctaClicks: 0,
        newUsers: 0,
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!date?.from || !date?.to) return;
            setIsLoading(true);

            const startDate = Timestamp.fromDate(date.from);
            const endDate = Timestamp.fromDate(date.to);

            // Fetch tracking events
            const eventsQuery = query(
                collection(db, 'tracking_events'),
                where('timestamp', '>=', startDate),
                where('timestamp', '<=', endDate)
            );
            const eventsSnap = await getDocs(eventsQuery);
            const events = eventsSnap.docs.map(d => d.data());

            // Fetch new users in the same period
            const usersQuery = query(
                collection(db, 'users'),
                where('createdAt', '>=', startDate),
                where('createdAt', '<=', endDate)
            );
            const usersSnap = await getDocs(usersQuery);

            // Calculate stats
            const visits = events.filter(e => e.eventType === 'page_view').length;
            const ctaClicks = events.filter(e => e.eventType === 'cta_click').length;
            const newUsers = usersSnap.size;

            setStats({ visits, ctaClicks, newUsers });

            // Prepare chart data
            const dailyData: { [key: string]: { visits: number, clicks: number, signups: number } } = {};
            const dateArray = eachDayOfInterval({ start: date.from, end: date.to });
            dateArray.forEach(d => {
                const dateKey = format(d, 'dd MMM', { locale: fr });
                dailyData[dateKey] = { visits: 0, clicks: 0, signups: 0 };
            });

            events.forEach(e => {
                const dateKey = format(e.timestamp.toDate(), 'dd MMM', { locale: fr });
                if (dailyData[dateKey]) {
                    if (e.eventType === 'page_view') dailyData[dateKey].visits++;
                    if (e.eventType === 'cta_click') dailyData[dateKey].clicks++;
                }
            });

            usersSnap.docs.forEach(d => {
                const dateKey = format(d.data().createdAt.toDate(), 'dd MMM', { locale: fr });
                if (dailyData[dateKey]) {
                    dailyData[dateKey].signups++;
                }
            });
            
            setChartData(Object.entries(dailyData).map(([date, data]) => ({ date, ...data })));

            setIsLoading(false);
        };

        fetchData();
    }, [date, db]);

    const conversionRate = stats.visits > 0 ? ((stats.ctaClicks / stats.visits) * 100).toFixed(1) + '%' : '0%';
    const signupConversionRate = stats.ctaClicks > 0 ? ((stats.newUsers / stats.ctaClicks) * 100).toFixed(1) + '%' : '0%';

    const chartConfig = {
        visits: { label: "Visites", color: "hsl(var(--primary))" },
        clicks: { label: "Clics CTA", color: "hsl(var(--secondary))" },
        signups: { label: "Inscriptions", color: "hsl(var(--destructive))" },
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Analytics & Conversion</h1>
                    <p className="text-muted-foreground">Analyse du tunnel de conversion de la page d'accueil.</p>
                </div>
                <DatePickerWithRange date={date} setDate={setDate} />
            </header>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Visites de la page" value={stats.visits.toLocaleString()} icon={Eye} isLoading={isLoading} />
                <StatCard title="Clics sur CTA" value={stats.ctaClicks.toLocaleString()} icon={MousePointerClick} isLoading={isLoading} />
                <StatCard title="Taux de Conversion (Visite → Clic)" value={conversionRate} icon={Percent} isLoading={isLoading} />
                <StatCard title="Nouveaux Utilisateurs" value={stats.newUsers.toLocaleString()} icon={UserPlus} isLoading={isLoading} description={`Conv. (Clic → Inscription): ${signupConversionRate}`} />
            </div>

            <Card className="dark:bg-card">
                <CardHeader>
                    <CardTitle>Tunnel de Conversion par Jour</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="h-72 w-full">
                         <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid vertical={false} className="dark:stroke-slate-700"/>
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} className="dark:fill-slate-400 text-xs" />
                                <YAxis allowDecimals={false} className="dark:fill-slate-400 text-xs"/>
                                <Tooltip content={<ChartTooltipContent className="dark:bg-slate-900 dark:border-slate-700" />} />
                                <Bar dataKey="visits" fill="var(--color-visits)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="signups" fill="var(--color-signups)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
