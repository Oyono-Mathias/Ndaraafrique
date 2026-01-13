
import React from 'react';
import { Users, DollarSign, BookOpen, MessageSquare, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
  // Données fictives pour le design (à lier à Firebase plus tard)
  const stats = [
    { title: "Étudiants total", value: "7", trend: "+12%", icon: Users, color: "text-blue-500" },
    { title: "Revenu mensuel", value: "0 XOF", trend: "+0%", icon: DollarSign, color: "text-emerald-500" },
    { title: "Cours publiés", value: "3", trend: "+2", icon: BookOpen, color: "text-purple-500" },
    { title: "Tickets Support", value: "0", trend: "0", icon: MessageSquare, color: "text-amber-500" },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-10 bg-[#020617] min-h-screen text-white">
      
      {/* 1. GRILLE DE STATISTIQUES - RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="bg-slate-800/50 border border-slate-700/80 p-6 rounded-2xl backdrop-blur-sm transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10"
          >
            <div className="flex justify-between items-center mb-4">
              <div className={`p-2 rounded-lg bg-slate-700/50 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={14}/>
                {stat.trend}
              </span>
            </div>
            <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">
              {stat.title}
            </p>
            <p className="text-2xl font-bold mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* 2. GRAPHIQUE ET ACTIVITÉ - RESPONSIVE */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Section Graphique */}
        <div className="xl:col-span-2 bg-slate-800/50 border border-slate-700/80 rounded-3xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold">Aperçu des revenus</h3>
            <select className="bg-transparent text-xs text-gray-400 border border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary">
              <option className="bg-slate-800">7 derniers jours</option>
              <option className="bg-slate-800">30 derniers jours</option>
            </select>
          </div>
          <div className="h-48 md:h-64 flex items-end gap-2 md:gap-3 px-2">
            {[30, 45, 25, 60, 40, 50, 35, 80, 55, 70, 40, 60].map((h, i) => (
              <div 
                key={i} 
                style={{ height: `${h}%` }} 
                className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500/50 border-t-2 border-blue-500 rounded-t-md hover:bg-blue-500/60 transition-all cursor-pointer"
              ></div>
            ))}
          </div>
        </div>

        {/* Section Activité */}
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-3xl p-6 md:p-8">
          <h3 className="text-lg font-bold mb-6">Activité en temps réel</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer border border-transparent hover:border-slate-700">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-blue-400 font-bold text-xs shadow-inner">
                  N
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">Nouvel étudiant au cours "IA"</p>
                  <p className="text-xs text-slate-500">Il y a 2 min</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest transition border-t border-slate-700/80">
            Voir tout
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
