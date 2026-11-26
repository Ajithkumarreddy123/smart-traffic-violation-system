import React, { useState, useEffect } from 'react';
import { Cpu, Video, Activity, Database, Radio, Server, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SystemArchitectureTab() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(r => r.json())
      .then(data => setAuditLogs(data))
      .catch(() => {});

    fetch('/api/cameras')
      .then(r => r.json())
      .then(data => setCameras(data))
      .catch(() => {});
  }, []);

  const pipelineStages = [
    { title: "Edge Video Ingest", desc: "RTSP / MP4 / Webcam / Synthetic loop", icon: Video, color: "text-cyan-400", border: "border-cyan-500/30" },
    { title: "YOLOv8 Nano", desc: "yolov8n.pt class 0,2,3,5,7 detection", icon: Cpu, color: "text-blue-400", border: "border-blue-500/30" },
    { title: "ByteTrack Tracker", desc: "Kalman filter persistent track_ids", icon: Activity, color: "text-emerald-400", border: "border-emerald-500/30" },
    { title: "Rules Engine", desc: "STOP_LINE_Y centroid + Signal state", icon: ShieldCheck, color: "text-amber-400", border: "border-amber-500/30" },
    { title: "PaddleOCR v2.8", desc: "Plate crop + CLAHE + Regex normalize", icon: Server, color: "text-purple-400", border: "border-purple-500/30" },
    { title: "FastAPI Core", desc: "Atomic commit + WS stream + Static", icon: Database, color: "text-rose-400", border: "border-rose-500/30" },
    { title: "Command Center UI", desc: "React + Tailwind + WebSocket feed", icon: Radio, color: "text-teal-400", border: "border-teal-500/30" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Visual End-to-End AI Pipeline */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center">
            <Cpu className="w-4 h-4 mr-2 text-cyan-400" />
            Computer Vision & Enforcement Architecture
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time low-latency pipeline executing at ~30 FPS on Edge Nodes with instant WebSocket dispatch
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 pt-2">
          {pipelineStages.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className={`bg-slate-900/80 p-3.5 rounded-xl border ${st.border} space-y-2 relative group hover:bg-slate-850 transition`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 font-bold">0{i+1}</span>
                  <Icon className={`w-4 h-4 ${st.color}`} />
                </div>
                <div className="font-bold text-xs text-white">{st.title}</div>
                <div className="text-[11px] text-slate-400 leading-tight">{st.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Active Camera Nodes Grid */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center">
          <Video className="w-4 h-4 mr-2 text-cyan-400" />
          Active Edge Camera Nodes
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cameras.map((c) => (
            <div key={c.id} className="bg-slate-900/80 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-cyan-400 font-bold text-sm">{c.camera_code}</span>
                <span className="flex items-center text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                  {c.status}
                </span>
              </div>
              <div className="font-semibold text-xs text-slate-200">{c.location_name}</div>
              <div className="text-[11px] font-mono text-slate-400">GPS: {c.junction_coords}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. System Audit Trail */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center">
            <ShieldCheck className="w-4 h-4 mr-2 text-cyan-400" />
            Compliance & Enforcement Audit Trail
          </h3>
          <span className="text-xs font-mono text-slate-400">Tamper-Proof Action Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-white/10">
              <tr>
                <th className="px-4 py-2.5">Audit ID</th>
                <th className="px-4 py-2.5">Action Code</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Event Details</th>
                <th className="px-4 py-2.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-4 py-2 font-mono text-cyan-400">#LOG-{log.id.toString().padStart(4, '0')}</td>
                  <td className="px-4 py-2 font-semibold text-slate-200">{log.action}</td>
                  <td className="px-4 py-2 font-mono text-amber-400">{log.actor}</td>
                  <td className="px-4 py-2 text-slate-300">{log.details}</td>
                  <td className="px-4 py-2 font-mono text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
