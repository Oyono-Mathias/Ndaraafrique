import React from 'react';
import { Users, DollarSign, BookOpen, MessageSquare, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
  // Données fictives pour le design (à lier à Firebase plus tard)
  const stats = [
    { title: "Étudiants total", value: "7", trend: "+12% ce mois-ci", icon: Users, color: "text-blue-500" },
    { title: "Revenu mensuel", value: "0 XOF", trend: "+2.3% vs mois dernier", icon: DollarSign, color: "text-emerald-500" },
    { title: "Cours publiés", value: "3", trend: "+5 nouveaux cours", icon: BookOpen, color: "text-purple-500" },
    { title: "Tickets support", value: "0", trend: "2 nouveaux aujourd'hui", icon: MessageSquare, color: "text-amber-500" },
  ];

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      {/* 1. GRILLE DE STATISTIQUES - Corrigée et aérée */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md hover:border-blue-500/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                <TrendingUp size={14} /> {stat.trend}
              </span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">{stat.title}</h3>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 2. SECTIONS INFÉRIEURES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graphique de revenus (Placeholder amélioré) */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-white mb-6">Aperçu des revenus</h3>
          <div className="h-64 flex items-end justify-between gap-2 border-b border-white/10 pb-2">
            {/* Simulation de graphique en barres */}
            {[40, 70, 45, 90, 65, 80, 50].map((height, i) => (
              <div key={i} style={{ height: `${height}%` }} className="w-full bg-blue-600/20 border-t-2 border-blue-500 rounded-t-sm hover:bg-blue-500/40 transition-all cursor-pointer"></div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-500">
            <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
          </div>
        </div>

        {/* Activité récente (Vraie structure) */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-white mb-6">Activité récente</h3>
          <div className="space-y-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-white font-medium">Nouvel étudiant inscrit</p>
                  <p className="text-xs text-gray-500">Il y a 12 minutes</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-sm text-blue-400 hover:text-blue-300 font-medium transition border-t border-white/5">
            Voir tout l'historique
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
