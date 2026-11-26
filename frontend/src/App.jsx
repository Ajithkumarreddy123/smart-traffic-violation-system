import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Activity, FileText, Database, Server, Radio,
  AlertCircle, CheckCircle2, ChevronRight, Zap, RefreshCw
} from 'lucide-react';

import TopCommandBar from './components/TopCommandBar';
import KPICards from './components/KPICards';
import LiveCameraStream from './components/LiveCameraStream';
import ViolationFeed from './components/ViolationFeed';
import AnalyticsPanel from './components/AnalyticsPanel';
import EvidenceModal from './components/EvidenceModal';
import ViolationRecordsTab from './components/ViolationRecordsTab';
import RTORegistryTab from './components/RTORegistryTab';
import SystemArchitectureTab from './components/SystemArchitectureTab';
import LoginModal from './components/LoginModal';

export default function App() {
  // Navigation Active Tab: 'COMMAND_CENTER', 'RECORDS', 'RTO_REGISTRY', 'ARCHITECTURE'
  const [activeTab, setActiveTab] = useState('COMMAND_CENTER');

  // Application Data States
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [signalState, setSignalState] = useState('RED');
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [filterType, setFilterType] = useState('ALL');

  // System States
  const [wsConnected, setWsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('traffic_user');
    return saved ? JSON.parse(saved) : { username: 'officer_sharma', role: 'admin' };
  });
  const [showLogin, setShowLogin] = useState(false);

  const wsRef = useRef(null);

  // Play subtle audio alert on new violation using Web Audio API
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.22);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Fetch initial data from REST API
  const fetchData = async () => {
    try {
      const [vRes, sRes, cRes, sigRes] = await Promise.all([
        fetch('/api/violations?limit=50'),
        fetch('/api/stats'),
        fetch('/api/cameras'),
        fetch('/api/signal')
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        setViolations(vData);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setStats(sData);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setCameras(cData);
        if (cData.length > 0 && !selectedCamera) {
          setSelectedCamera(cData[0]);
        }
      }
      if (sigRes.ok) {
        const sigData = await sigRes.json();
        setSignalState(sigData.state);
      }
    } catch (err) {
      console.warn("Initial API fetch error:", err);
    }
  };

  // Setup WebSocket Stream
  useEffect(() => {
    fetchData();

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/violations`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
        console.log("[WebSocket] Connected to traffic violation stream");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'NEW_VIOLATION') {
            const newViol = msg.data;
            setViolations(prev => [newViol, ...prev.filter(v => v.id !== newViol.id)]);
            playAlertSound();
            // Update stats
            setStats(prev => {
              if (!prev) return null;
              const type = newViol.violation_type;
              return {
                ...prev,
                total_violations_today: prev.total_violations_today + 1,
                total_revenue_inr: prev.total_revenue_inr + (newViol.fine_amount || 1000),
                breakdown_by_type: {
                  ...prev.breakdown_by_type,
                  [type]: (prev.breakdown_by_type[type] || 0) + 1
                }
              };
            });
          } else if (msg.event === 'VIOLATION_UPDATED') {
            const updated = msg.data;
            setViolations(prev => prev.map(v => v.id === updated.id ? updated : v));
          } else if (msg.event === 'SIGNAL_UPDATE') {
            setSignalState(msg.data.state);
          }
        } catch (e) {
          console.error("[WebSocket] Parse error:", e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log("[WebSocket] Disconnected. Reconnecting in 3 seconds...");
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Traffic Signal Toggle Handler
  const handleToggleSignal = async (newState) => {
    setSignalState(newState);
    try {
      await fetch(`/api/signal/${newState}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: user?.username || 'Command Center UI' })
      });
    } catch (e) {
      console.error("Failed to update signal:", e);
    }
  };

  // Simulate Violation Trigger Handler
  const handleSimulateViolation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate-violation', { method: 'POST' });
      if (!res.ok) throw new Error('Simulation failed');
    } catch (e) {
      alert("Simulation request failed. Check that the backend server is running.");
    } finally {
      setTimeout(() => setIsSimulating(false), 600);
    }
  };

  // Update Violation Status (Verify / Issue Challan / Dismiss)
  const handleUpdateStatus = async (violationId, newStatus) => {
    try {
      const res = await fetch(`/api/violations/${violationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          actor: user?.username || 'Traffic Officer'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setViolations(prev => prev.map(v => v.id === violationId ? data.violation : v));
        if (selectedViolation && selectedViolation.id === violationId) {
          setSelectedViolation(data.violation);
        }
      }
    } catch (e) {
      console.error("Status update error:", e);
    }
  };

  const navTabs = [
    { id: 'COMMAND_CENTER', label: 'Live Command Center', icon: Activity },
    { id: 'RECORDS', label: 'Violation Records & Challans', icon: FileText },
    { id: 'RTO_REGISTRY', label: 'RTO Vehicle Registry', icon: Database },
    { id: 'ARCHITECTURE', label: 'System Architecture & Audit', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* 1. Top Command Bar */}
      <TopCommandBar
        selectedCamera={selectedCamera}
        setSelectedCamera={setSelectedCamera}
        cameras={cameras}
        signalState={signalState}
        onToggleSignal={handleToggleSignal}
        onSimulateViolation={handleSimulateViolation}
        isSimulating={isSimulating}
        wsConnected={wsConnected}
        user={user}
        onLogout={() => setShowLogin(true)}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-5">
        {/* KPI Metrics Ribbon */}
        <KPICards stats={stats} />

        {/* Navigation Tabs Bar */}
        <div className="glass-panel p-1.5 rounded-xl flex items-center space-x-1 overflow-x-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Live Command Center View (65% Feed / 35% Analytics) */}
        {activeTab === 'COMMAND_CENTER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 65%: Live Camera/Video Stream + Evidence Feed */}
            <div className="lg:col-span-8 space-y-4">
              <LiveCameraStream signalState={signalState} />
              <ViolationFeed
                violations={violations}
                onSelectViolation={setSelectedViolation}
                onUpdateStatus={handleUpdateStatus}
                filterType={filterType}
                setFilterType={setFilterType}
              />
            </div>

            {/* Right 35%: Analytics & Live SMS Alert Stream */}
            <div className="lg:col-span-4 sticky top-20">
              <AnalyticsPanel stats={stats} violations={violations} />
            </div>
          </div>
        )}

        {/* Tab 2: Full Violation Records & E-Challans Data Table */}
        {activeTab === 'RECORDS' && (
          <ViolationRecordsTab
            violations={violations}
            onSelectViolation={setSelectedViolation}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {/* Tab 3: National VAHAN / RTO Registry Explorer */}
        {activeTab === 'RTO_REGISTRY' && (
          <RTORegistryTab />
        )}

        {/* Tab 4: System Architecture & Audit Trail */}
        {activeTab === 'ARCHITECTURE' && (
          <SystemArchitectureTab />
        )}
      </main>

      {/* High-Resolution Evidence Dossier Modal */}
      {selectedViolation && (
        <EvidenceModal
          violation={selectedViolation}
          onClose={() => setSelectedViolation(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Login / Switch Account Modal */}
      {showLogin && (
        <LoginModal
          onLoginSuccess={(loggedUser) => {
            setUser(loggedUser);
            setShowLogin(false);
          }}
        />
      )}

      {/* Footer */}
      <footer className="glass-panel border-t border-white/5 py-4 px-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI-Powered Smart Traffic Violation Detection & Automated E-Challan System</span>
          <span className="font-mono text-[11px] text-slate-400">YOLOv8 • ByteTrack • PaddleOCR • FastAPI • React</span>
        </div>
      </footer>
    </div>
  );
}
