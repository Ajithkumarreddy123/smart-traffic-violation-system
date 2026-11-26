import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle, Eye, Clock, Phone, MapPin, Send, ShieldAlert, FileText } from 'lucide-react';
import HSRPPlateBadge from './HSRPPlateBadge';

export default function ViolationFeed({
  violations,
  onSelectViolation,
  onUpdateStatus,
  filterType,
  setFilterType
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const violationTypes = [
    { id: 'ALL', label: 'All Violations' },
    { id: 'RED_LIGHT_ZEBRA_BREACH', label: 'Zebra Breach' },
    { id: 'RED_LIGHT_JUMP', label: 'Red Light Jump' },
    { id: 'NO_HELMET', label: 'No Helmet' },
    { id: 'TRIPLE_RIDING', label: 'Triple Riding' },
    { id: 'STOP_LINE_BREACH', label: 'Stop Line' },
  ];

  const filteredViolations = violations.filter(v => {
    const matchesType = filterType === 'ALL' || v.violation_type === filterType;
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const getViolationBadge = (type) => {
    switch (type) {
      case 'RED_LIGHT_ZEBRA_BREACH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-600/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]">Zebra Breach</span>;
      case 'RED_LIGHT_JUMP':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]">Red Light Jump</span>;
      case 'NO_HELMET':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]">No Helmet</span>;
      case 'TRIPLE_RIDING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_8px_rgba(139,92,246,0.2)]">Triple Riding</span>;
      case 'STOP_LINE_BREACH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">Stop Line Breach</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-500/15 text-slate-300 border border-slate-500/30">{type.replace('_', ' ')}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CHALLAN_ISSUED':
        return <span className="flex items-center text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> CHALLAN ISSUED</span>;
      case 'VERIFIED':
        return <span className="flex items-center text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> VERIFIED</span>;
      case 'DISMISSED':
        return <span className="flex items-center text-[11px] font-semibold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/30"><XCircle className="w-3 h-3 mr-1" /> DISMISSED</span>;
      default:
        return <span className="flex items-center text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse"><AlertCircle className="w-3 h-3 mr-1" /> PENDING REVIEW</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Feed Header & Filters */}
      <div className="glass-panel p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {violationTypes.map(vt => (
            <button
              key={vt.id}
              onClick={() => setFilterType(vt.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterType === vt.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {vt.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="CHALLAN_ISSUED">Challan Issued</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Cards Stream */}
      <div className="space-y-3">
        {filteredViolations.length === 0 ? (
          <div className="glass-panel p-8 rounded-xl text-center">
            <ShieldAlert className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No violations match the current filter</p>
            <p className="text-xs text-slate-500 mt-1">Use the "Simulate Violation" button above to test new events</p>
          </div>
        ) : (
          filteredViolations.map((v) => (
            <div
              key={v.id}
              className="glass-panel glass-card-hover p-4 rounded-xl transition-all duration-300 animate-slide-in relative overflow-hidden group"
            >
              {/* Left Color Indicator Bar based on violation type */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                v.violation_type === 'RED_LIGHT_JUMP' ? 'bg-rose-500' :
                v.violation_type === 'NO_HELMET' ? 'bg-amber-500' :
                v.violation_type === 'TRIPLE_RIDING' ? 'bg-purple-500' : 'bg-cyan-500'
              }`}></div>

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Image Snapshot Thumbnail */}
                <div
                  onClick={() => onSelectViolation(v)}
                  className="relative w-full lg:w-44 h-28 rounded-lg overflow-hidden bg-slate-900 border border-white/10 cursor-pointer group/img flex-shrink-0"
                >
                  <img
                    src={v.evidence?.image_url || '/evidence/sample.jpg'}
                    alt="Violation Evidence"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <span className="text-[10px] font-mono text-cyan-300 flex items-center">
                      <Eye className="w-3 h-3 mr-1" /> Zoom Snapshot
                    </span>
                  </div>
                  {/* Camera Node Badge */}
                  <div className="absolute top-1.5 left-1.5 bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 border border-white/10">
                    {v.camera_code || "CAM-01"}
                  </div>
                </div>

                {/* Center Content: HSRP Plate, Violation, Owner, SMS */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <HSRPPlateBadge
                      plate={v.license_plate}
                      isCommercial={v.vehicle?.vehicle_type === 'Commercial'}
                      size="sm"
                    />
                    {getViolationBadge(v.violation_type)}
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ₹{v.fine_amount}
                    </span>
                    {getStatusBadge(v.status)}
                  </div>

                  {/* Vehicle & RTO Owner Dossier excerpt */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
                    <div className="flex items-center text-slate-400">
                      <span className="font-semibold text-slate-200 mr-1.5">{v.vehicle?.owner_name || "Registered Owner"}</span>
                      <span className="text-slate-500">• {v.vehicle?.vehicle_model || "Motor Vehicle"}</span>
                    </div>
                    <div className="flex items-center text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 mr-1 flex-shrink-0" />
                      <span className="truncate">{v.location_name || "Silk Board Junction"}</span>
                    </div>
                  </div>

                  {/* SMS Alert Status */}
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded border border-white/5">
                    <Send className="w-3 h-3 text-cyan-400" />
                    <span>SMS Alert:</span>
                    <span className="text-emerald-400 font-mono">DELIVERED</span>
                    <span className="text-slate-500 font-mono">({v.vehicle?.owner_phone || '+91 98801 •••••'})</span>
                    <span className="text-slate-500 ml-auto flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-row lg:flex-col items-center justify-end gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                  <button
                    onClick={() => onSelectViolation(v)}
                    className="flex-1 lg:flex-none flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dossier</span>
                  </button>

                  {v.status !== 'CHALLAN_ISSUED' && (
                    <button
                      onClick={() => onUpdateStatus(v.id, 'CHALLAN_ISSUED')}
                      className="flex-1 lg:flex-none flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Issue Challan</span>
                    </button>
                  )}

                  {v.status !== 'DISMISSED' && (
                    <button
                      onClick={() => onUpdateStatus(v.id, 'DISMISSED')}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-rose-400 text-xs transition"
                      title="Dismiss false positive"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
