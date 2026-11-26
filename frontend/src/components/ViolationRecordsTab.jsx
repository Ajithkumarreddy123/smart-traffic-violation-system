import React, { useState } from 'react';
import { Search, Download, Filter, FileText, CheckCircle2, XCircle, ArrowUpDown, Shield } from 'lucide-react';
import HSRPPlateBadge from './HSRPPlateBadge';

export default function ViolationRecordsTab({ violations, onSelectViolation, onUpdateStatus }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = violations.filter(v => {
    const matchesSearch = !search ||
      v.license_plate.toLowerCase().includes(search.toLowerCase()) ||
      (v.vehicle?.owner_name && v.vehicle.owner_name.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || v.violation_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ["Challan ID", "License Plate", "Owner Name", "Phone", "Violation Type", "Fine (INR)", "Status", "Camera Node", "Timestamp"];
    const rows = filtered.map(v => [
      `CH-${v.id.toString().padStart(6, '0')}`,
      v.license_plate,
      `"${v.vehicle?.owner_name || 'N/A'}"`,
      v.vehicle?.owner_phone || 'N/A',
      v.violation_type,
      v.fine_amount,
      v.status,
      v.camera_code,
      new Date(v.timestamp).toISOString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `traffic_violations_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Controls Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by license plate or owner name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Violation Types</option>
            <option value="RED_LIGHT_JUMP">Red Light Jump</option>
            <option value="NO_HELMET">No Helmet</option>
            <option value="TRIPLE_RIDING">Triple Riding</option>
            <option value="STOP_LINE_BREACH">Stop Line Breach</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="CHALLAN_ISSUED">Challan Issued</option>
            <option value="DISMISSED">Dismissed</option>
          </select>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium border border-white/10 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Full Records Data Table */}
      <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-white/10">
              <tr>
                <th className="px-4 py-3">Challan ID</th>
                <th className="px-4 py-3">HSRP Plate</th>
                <th className="px-4 py-3">Owner & Vehicle</th>
                <th className="px-4 py-3">Offense</th>
                <th className="px-4 py-3">Fine (INR)</th>
                <th className="px-4 py-3">Camera Node</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                    No violation records found matching the query.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-cyan-400">
                      CH-{v.id.toString().padStart(6, '0')}
                    </td>
                    <td className="px-4 py-3">
                      <HSRPPlateBadge
                        plate={v.license_plate}
                        isCommercial={v.vehicle?.vehicle_type === 'Commercial'}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{v.vehicle?.owner_name || "N/A"}</div>
                      <div className="text-[11px] text-slate-400">{v.vehicle?.vehicle_model || "Motor Vehicle"}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {v.violation_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      ₹{v.fine_amount}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {v.camera_code}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        v.status === 'CHALLAN_ISSUED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        v.status === 'VERIFIED' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                        v.status === 'DISMISSED' ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(v.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onSelectViolation(v)}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Inspect Evidence Dossier"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                        {v.status !== 'CHALLAN_ISSUED' && (
                          <button
                            onClick={() => onUpdateStatus(v.id, 'CHALLAN_ISSUED')}
                            className="p-1.5 rounded hover:bg-emerald-900/60 text-emerald-400 transition"
                            title="Issue Challan"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
