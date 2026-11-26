import React, { useState, useEffect, useRef } from 'react';
import { Video, Camera, Upload, Play, CheckCircle2, AlertCircle, RefreshCw, Maximize2, Shield } from 'lucide-react';

export default function LiveCameraStream({ signalState }) {
  const [activeSource, setActiveSource] = useState('sample_real');
  const [zebraStatus, setZebraStatus] = useState('AUTO-DETECTED');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const fileInputRef = useRef(null);

  const fetchSource = async () => {
    try {
      const res = await fetch('/api/video-source');
      if (res.ok) {
        const data = await res.json();
        setActiveSource(data.active_source || 'sample_real');
        setZebraStatus(data.zebra_status || 'AUTO-DETECTED');
      }
    } catch (e) {
      // offline
    }
  };

  useEffect(() => {
    fetchSource();
  }, []);

  const switchSource = async (sourceType, webcamIndex = 0) => {
    try {
      const res = await fetch('/api/set-video-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_type: sourceType, webcam_index: webcamIndex })
      });
      if (res.ok) {
        setActiveSource(sourceType);
        setStreamError(false);
        setUploadMessage(
          sourceType === 'webcam'
            ? 'Switched to Laptop Webcam (Device 0). Move in front of camera or hold up a plate to test detection!'
            : sourceType === 'uploaded'
            ? 'Switched to Uploaded Video feed.'
            : 'Switched to Demo Traffic feed.'
        );
        setTimeout(() => setUploadMessage(''), 6000);
      }
    } catch (e) {
      alert("Failed to switch video source.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadMessage('Uploading traffic video...');

    try {
      const res = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSource('uploaded');
        setStreamError(false);
        setUploadMessage(`Success! Active video: ${file.name}`);
        setTimeout(() => setUploadMessage(''), 6000);
      } else {
        const err = await res.json();
        alert(err.detail || 'Upload failed');
      }
    } catch (err) {
      alert('Error uploading video to backend');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-xl space-y-3 relative overflow-hidden border border-white/10 group">
      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex flex-wrap items-center gap-1.5">
              <span>LIVE AI CAMERA FEED & OBJECT DETECTION</span>
              <span className="flex items-center text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1"></span>
                YOLOv8 STREAM
              </span>
              <span className="flex items-center text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1 animate-pulse"></span>
                ZEBRA: {zebraStatus}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Automatic Zebra Crossing stripe detection with real-time dynamic Virtual Stop-Line calibration
            </p>
          </div>
        </div>

        {/* Source Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
          {/* Real Traffic Video Button */}
          <button
            onClick={() => switchSource('sample_real')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              activeSource === 'sample_real'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-md shadow-emerald-500/10'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-750'
            }`}
            title="Switch to Real 1080p Traffic Crossroad surveillance footage"
          >
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real Traffic (1080p)</span>
          </button>

          {/* Webcam Button */}
          <button
            onClick={() => switchSource('webcam')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              activeSource === 'webcam'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-md shadow-cyan-500/10'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-750'
            }`}
            title="Switch to your Laptop Webcam to test with yourself, car picture, or phone"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Laptop Webcam</span>
          </button>

          {/* Upload Video Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/mp4,video/avi,video/quicktime,video/x-matroska"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              activeSource === 'uploaded'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold shadow-md shadow-purple-500/10'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-750'
            }`}
            title="Upload any real traffic MP4 or AVI video from your computer"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>{isUploading ? 'Uploading...' : 'Upload Video'}</span>
          </button>

          {/* Demo Loop Button */}
          <button
            onClick={() => switchSource('demo')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              activeSource === 'demo'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold shadow-md shadow-amber-500/10'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-750'
            }`}
            title="Switch to synthetic stop-line demo"
          >
            <Play className="w-3.5 h-3.5 text-amber-400" />
            <span>Synthetic Demo</span>
          </button>

          {/* Toggle Minimize/Maximize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isExpanded ? "Collapse video" : "Expand video"}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {uploadMessage && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs px-3 py-1.5 rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {/* Video Stream Display */}
      {isExpanded && (
        <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-white/10 aspect-video max-h-[380px] flex items-center justify-center">
          <img
            src="/api/video-feed"
            alt="Live AI Camera Feed"
            className="w-full h-full object-contain"
            onError={() => setStreamError(true)}
            onLoad={() => setStreamError(false)}
          />

          {streamError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-slate-200">Video Feed Initializing</p>
              <p className="text-xs text-slate-400 mt-1">
                Make sure the backend is running (`uvicorn backend.app.main:app`).
              </p>
              <button
                onClick={() => { setStreamError(false); fetchSource(); }}
                className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-cyan-300 flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Stream</span>
              </button>
            </div>
          )}

          {/* Live Overlay HUD Information */}
          <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-[11px] font-mono text-slate-300 flex items-center space-x-2">
            <span className="text-cyan-400 font-bold">SOURCE: {activeSource.toUpperCase()}</span>
            <span>•</span>
            <span>SIGNAL: <strong className={signalState === 'RED' ? 'text-red-400' : 'text-emerald-400'}>{signalState}</strong></span>
          </div>

          <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-[10px] font-mono text-cyan-400">
            YOLOv8 NANO + BYTE TRACK
          </div>
        </div>
      )}
    </div>
  );
}
