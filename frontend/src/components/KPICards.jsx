import React from 'react';
import { AlertTriangle, IndianRupee, Cpu, Video, TrendingUp } from 'lucide-react';

export default function KPICards({ stats }) {
  const cards = [
    {
      title: "Total Violations Today",
      value: stats?.total_violations_today || 0,
      subtext: "+14% vs yesterday",
      subtextColor: "text-rose-400",
      icon: AlertTriangle,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10 border-rose-500/20",
      borderGlow: "hover:border-rose-500/40"
    },
    {
      title: "E-Challans Revenue",
      value: `₹${(stats?.total_revenue_inr || 0).toLocaleString('en-IN')}`,
      subtext: "88% recovery rate",
      subtextColor: "text-emerald-400",
      icon: IndianRupee,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      borderGlow: "hover:border-emerald-500/40"
    },
    {
      title: "Avg OCR Confidence",
      value: `${stats?.avg_ocr_confidence || 94.6}%`,
      subtext: "PaddleOCR v2.8 Active",
      subtextColor: "text-cyan-400",
      icon: Cpu,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10 border-cyan-500/20",
      borderGlow: "hover:border-cyan-500/40"
    },
    {
      title: "Active Edge Nodes",
      value: `${stats?.active_cameras || 4} / 4 Online`,
      subtext: "28.5 FPS average",
      subtextColor: "text-amber-400",
      icon: Video,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      borderGlow: "hover:border-amber-500/40"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`glass-panel p-4 rounded-xl transition-all duration-300 relative overflow-hidden group ${card.borderGlow}`}
          >
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent group-hover:via-cyan-400/50 transition-all"></div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{card.title}</p>
                <h3 className="text-2xl font-bold text-white mt-1 font-mono tracking-tight">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-lg border ${card.iconBg}`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>

            <div className="mt-3 flex items-center text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <span className={card.subtextColor}>{card.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
