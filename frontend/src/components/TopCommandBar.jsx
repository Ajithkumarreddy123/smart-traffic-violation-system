import React, { useState } from 'react';
import { Video, Radio, Zap, Shield, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TopCommandBar({
  selectedCamera,
  setSelectedCamera,
  cameras,
  signalState,
  onToggleSignal,
  onSimulateViolation,
  isSimulating,
  wsConnected,
  user,
  onLogout
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="glass-panel border-b border-white/10 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & AI System Status */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold tracking-wider text-white uppercase">TRAFFICGUARD AI</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">v2.4</span>
              </div>
              <p className="text-[11px] text-slate-400">Integrated Smart City Enforcement System</p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="hidden sm:inline">LIVE AI PIPELINE</span>
              <span className="sm:hidden">AI ON</span>
            </div>

            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-mono border ${
              wsConnected ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <Radio className="w-3 h-3" />
              <span>{wsConnected ? 'WS LIVE' : 'WS RECONNECT'}</span>
            </div>
          </div>
        </div>

        {/* Center / Right: Junction Selector + Traffic Signal Override + Simulate Button */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          {/* Junction Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-750 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium transition"
            >
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>{selectedCamera?.location_name ? `${selectedCamera.camera_code} - ${selectedCamera.location_name.split(',')[0]}` : "Silk Board Junction"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-1 w-64 bg-slate-900 border border-white/10 rounded-lg shadow-2xl py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 border-b border-white/5">
                  Select Active Camera Node
                </div>
                {(cameras || []).map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      setSelectedCamera(cam);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                      selectedCamera?.id === cam.id ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-cyan-300">{cam.camera_code}</div>
                      <div className="text-[11px] text-slate-400 truncate">{cam.location_name}</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      {cam.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Traffic Signal Override Toggle */}
          <div className="flex items-center space-x-2 bg-slate-900/90 border border-white/10 px-2.5 py-1 rounded-lg">
            {/* Visual Signal Lights */}
            <div className="flex items-center space-x-1.5 bg-black/60 px-1.5 py-1 rounded-full border border-white/5">
              <span className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                signalState === 'RED'
                  ? 'bg-red-500 shadow-[0_0_10px_#ef4444] scale-110'
                  : 'bg-red-950/60 opacity-40'
              }`}></span>
              <span className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                signalState === 'GREEN'
                  ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] scale-110'
                  : 'bg-emerald-950/60 opacity-40'
              }`}></span>
            </div>

            <button
              onClick={() => onToggleSignal(signalState === 'RED' ? 'GREEN' : 'RED')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1 font-mono uppercase ${
                signalState === 'RED'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title="Click to toggle traffic light between RED and GREEN"
            >
              <span>SIGNAL: {signalState}</span>
            </button>
          </div>

          {/* Simulate Live Violation Button */}
          <button
            onClick={onSimulateViolation}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-cyan-500/20 border border-cyan-400/30 active:scale-95 transition disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Injecting...' : 'Simulate Violation'}</span>
          </button>

          {/* User profile / Logout */}
          <div className="flex items-center space-x-2 pl-1 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-300">
              {user?.username ? user.username[0].toUpperCase() : 'O'}
            </div>
            <button
              onClick={onLogout}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition"
              title="Switch / Logout"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
