import React from 'react';
import { Users, DollarSign, BookOpen, MessageSquare, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
  // Statistiques propres (Sans doublons)
  const stats = [
    { title: "Étudiants total", value: "7", trend: "+12%", icon: Users, color: "text-blue-500" },
    { title: "Revenu mensuel", value: "0 XOF", trend: "+0%", icon: DollarSign, color: "text-emerald-500" },
    { title: "Cours publiés", value: "3", trend: "+2", icon: BookOpen, color: "text-purple-500" },
    { title: "Tickets Support", value: "0", trend: "0", icon: MessageSquare, color: "text-amber-500" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-10 bg-[#020617] min-h-screen text-white">
      {/* SECTION 1 : LES CARTES (GRID 4 COLONNES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}><stat.icon size={20} /></div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{stat.trend}</span>
            </div>
            <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">{stat.title}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* SECTION 2 : GRAPHIQUE ET ACTIVITÉ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Revenus */}
        <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-6">Aperçu des revenus</h3>
          <div className="h-48 flex items-end gap-2 px-2">
            {[30, 45, 25, 60, 40, 50, 35].map((h, i) => (
              <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-blue-500/20 border-t border-blue-500 rounded-t-sm"></div>
            ))}
          </div>
        </div>

        {/* Activité Récente */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-6">Activité récente</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs">JD</div>
              <div>
                <p className="text-sm font-medium">Nouvel étudiant inscrit</p>
                <p className="text-[10px] text-gray-500">Il y a 10 min</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
