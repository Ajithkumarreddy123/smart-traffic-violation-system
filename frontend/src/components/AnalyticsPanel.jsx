import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { PieChart as PieIcon, BarChart3, Send, CheckCircle2, MessageSquare } from 'lucide-react';

export default function AnalyticsPanel({ stats, violations }) {
  // Prepare Pie Chart Data
  const breakdown = stats?.breakdown_by_type || {
    RED_LIGHT_JUMP: 18,
    NO_HELMET: 14,
    TRIPLE_RIDING: 6,
    STOP_LINE_BREACH: 9
  };

  const pieData = [
    { name: 'Red Light Jump', value: breakdown.RED_LIGHT_JUMP || 0, color: '#EF4444' },
    { name: 'No Helmet', value: breakdown.NO_HELMET || 0, color: '#F59E0B' },
    { name: 'Stop Line', value: breakdown.STOP_LINE_BREACH || 0, color: '#06B6D4' },
    { name: 'Triple Riding', value: breakdown.TRIPLE_RIDING || 0, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  // Hourly Activity Trend Data (Simulation of peak rush hours)
  const hourlyData = [
    { hour: '07:00', count: 4 },
    { hour: '08:00', count: 12 },
    { hour: '09:00', count: 28 },
    { hour: '10:00', count: 22 },
    { hour: '11:00', count: 15 },
    { hour: '12:00', count: 9 },
    { hour: 'NOW', count: stats?.total_violations_today || 14 },
  ];

  // Extract all SMS notifications from recent violations
  const recentNotifications = [];
  (violations || []).forEach(v => {
    if (v.notifications && v.notifications.length > 0) {
      v.notifications.forEach(n => {
        recentNotifications.push({
          ...n,
          plate: v.license_plate,
          violation_type: v.violation_type,
          owner: v.vehicle?.owner_name || "Owner"
        });
      });
    }
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900 border border-white/10 p-2 rounded-lg shadow-xl text-xs">
          <span className="font-semibold text-white">{data.name}: </span>
          <span className="font-mono text-cyan-400 font-bold">{data.value} Incidents</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* 1. Category Distribution Donut Chart */}
      <div className="glass-panel p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
            <PieIcon className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Violations By Category
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Today</span>
        </div>

        <div className="h-44 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
          {pieData.map((item, idx) => (
            <div key={idx} className="flex items-center text-xs">
              <span className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: item.color }}></span>
              <span className="text-slate-400 truncate">{item.name}</span>
              <span className="ml-auto font-mono text-slate-200 font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Hourly Enforcement Trend Chart */}
      <div className="glass-panel p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Traffic Flow & Rush Incident Trend
          </h3>
          <span className="text-[11px] font-mono text-cyan-400">Peak Enforcement</span>
        </div>

        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Live Scrolling Automated SMS & WhatsApp Dispatch Log */}
      <div className="glass-panel p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
            <Send className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Live Telco Dispatch Log (SMS/WhatsApp)
          </h3>
          <span className="flex items-center text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1"></span>
            ACTIVE GATEWAY
          </span>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {recentNotifications.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              <MessageSquare className="w-6 h-6 mx-auto mb-1 text-slate-600" />
              Waiting for violation dispatches...
            </div>
          ) : (
            recentNotifications.map((n, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5 space-y-1 text-xs hover:border-cyan-500/30 transition group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-cyan-400 font-semibold">{n.recipient_phone}</span>
                  <span className="flex items-center text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                    {n.delivery_status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Veh: <span className="text-slate-200 font-mono">{n.plate}</span> ({n.owner})</span>
                  <span className="text-slate-500 text-[10px]">
                    {new Date(n.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-2 italic bg-black/40 p-1.5 rounded border border-white/5">
                  "{n.message_body}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
