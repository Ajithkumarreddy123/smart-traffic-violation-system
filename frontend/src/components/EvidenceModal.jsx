import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Printer, Download, ShieldCheck, MapPin, Calendar, Clock, AlertTriangle, FileText, Send, Camera, Crop } from 'lucide-react';
import HSRPPlateBadge from './HSRPPlateBadge';

export default function EvidenceModal({ violation, onClose, onUpdateStatus }) {
  if (!violation) return null;

  const [activePhotoTab, setActivePhotoTab] = useState('full'); // 'full' or 'crop'

  const handlePrint = () => {
    window.print();
  };

  const getMVActSection = (type) => {
    switch (type) {
      case 'RED_LIGHT_ZEBRA_BREACH':
        return 'Sec 119/177 - Illegal Entry into Zebra Crossing Pedestrian Zone during RED Signal';
      case 'RED_LIGHT_JUMP':
        return 'Sec 119/177 - Disobedience of Traffic Signal / Red Light Jumping';
      case 'NO_HELMET':
        return 'Sec 129/194D - Riding Two-Wheeler Without Protective Headgear (Helmet)';
      case 'TRIPLE_RIDING':
        return 'Sec 128/194C - Carrying More Than One Pillion Rider on Two-Wheeler';
      case 'STOP_LINE_BREACH':
        return 'Sec 177 - Violation of Mandatory Stop Line Road Markings';
      default:
        return 'Sec 177 - General Offense under Motor Vehicles (Amendment) Act 2019';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8 animate-slide-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                E-CHALLAN EVIDENCE & AUDIT DOSSIER
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  REF: CH-{violation.id.toString().padStart(6, '0')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">High-Resolution AI Detection Metadata & VAHAN RTO Registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Image + Data) */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto">
          {/* Left Column (5 Cols): High-Resolution Evidence Photo & Crop */}
          <div className="lg:col-span-5 space-y-3">
            {/* View Selector Tabs */}
            <div className="flex items-center space-x-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActivePhotoTab('full')}
                className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg font-medium transition ${
                  activePhotoTab === 'full'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5 mr-1" />
                <span>Full Scene View</span>
              </button>
              <button
                onClick={() => setActivePhotoTab('crop')}
                className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg font-medium transition ${
                  activePhotoTab === 'crop'
                    ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crop className="w-3.5 h-3.5 mr-1" />
                <span>Vehicle & Plate Crop</span>
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 shadow-inner group">
              <img
                src={
                  (activePhotoTab === 'crop' && violation.evidence?.crop_image_url)
                    ? violation.evidence.crop_image_url
                    : (violation.evidence?.image_url || '/evidence/sample.jpg')
                }
                alt={activePhotoTab === 'crop' ? 'Vehicle Crop' : 'Full Scene Evidence'}
                className="w-full h-auto object-cover rounded-xl"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';
                }}
              />

              {/* Timestamp Watermark */}
              <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center justify-between text-[11px] font-mono text-cyan-300">
                <span>{activePhotoTab === 'crop' ? 'ZOOMED FORENSIC CROP' : (violation.camera_code || "CAM-01")}</span>
                <span>{new Date(violation.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* AI Vision Metadata Card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>AI Vision Telemetry</span>
                <span className="text-cyan-400 font-mono">Confidence: {(violation.ocr_confidence * 100).toFixed(1)}%</span>
              </h4>

              {/* Confidence Meter Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 rounded-full"
                  style={{ width: `${Math.min(100, violation.ocr_confidence * 100)}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
                <div>Model: <span className="text-cyan-400">YOLOv8n + ByteTrack</span></div>
                <div>OCR Engine: <span className="text-cyan-400">PaddleOCR 2.8</span></div>
                <div>Track ID: <span className="text-cyan-400">#{violation.track_id || 104}</span></div>
                <div>Coordinates: <span className="text-slate-400">12.9176° N, 77.6238° E</span></div>
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols): Dossier & Challan Notice Details */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top Identity Block */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-white/5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Detected Registration Plate</span>
                <HSRPPlateBadge
                  plate={violation.license_plate}
                  isCommercial={violation.vehicle?.vehicle_type === 'Commercial'}
                  size="md"
                />
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Fine Assessment</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">₹{violation.fine_amount}</span>
              </div>
            </div>

            {/* Violation Specifics & Legal Code */}
            <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Offense: {violation.violation_type.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {getMVActSection(violation.violation_type)}
              </p>
              <div className="flex items-center space-x-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-cyan-400" /> {violation.location_name}</span>
                <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1 text-cyan-400" /> {new Date(violation.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* VAHAN / RTO Vehicle Registry Card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  National VAHAN / RTO Registry Record
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                  MATCH CONFIRMED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Registered Owner</span>
                  <span className="font-semibold text-slate-200">{violation.vehicle?.owner_name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Contact Phone</span>
                  <span className="font-mono text-slate-200">{violation.vehicle?.owner_phone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Vehicle Model</span>
                  <span className="text-slate-200">{violation.vehicle?.vehicle_model || "Motor Vehicle"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Vehicle Class</span>
                  <span className="text-slate-200">{violation.vehicle?.vehicle_type || "Two-Wheeler"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Registering Authority</span>
                  <span className="text-slate-200 truncate">{violation.vehicle?.rto_office || "KA-01 Bengaluru"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Insurance & PUC</span>
                  <span className="text-emerald-400 font-semibold">Active & Valid</span>
                </div>
              </div>
            </div>

            {/* Automated Telco Dispatch Log (SMS/WhatsApp) */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                <Send className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                Automated SMS & WhatsApp Dispatch Log
              </h4>

              {violation.notifications && violation.notifications.length > 0 ? (
                violation.notifications.map((notif, idx) => (
                  <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-white/5 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>To: <span className="text-slate-200">{notif.recipient_phone}</span> [{notif.channel}]</span>
                      <span className="text-emerald-400">STATUS: {notif.delivery_status}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-sans italic bg-black/40 p-2 rounded border border-white/5">
                      "{notif.message_body}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">Notice queued for immediate SMS dispatch.</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-950 border-t border-white/10">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-medium border border-white/10 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Challan</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-medium border border-white/10 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {violation.status !== 'DISMISSED' && (
              <button
                onClick={() => {
                  onUpdateStatus(violation.id, 'DISMISSED');
                  onClose();
                }}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 px-4 py-2 rounded-lg text-xs font-medium border border-white/10 transition"
              >
                <XCircle className="w-4 h-4" />
                <span>Mark False Positive</span>
              </button>
            )}

            {violation.status !== 'CHALLAN_ISSUED' && (
              <button
                onClick={() => {
                  onUpdateStatus(violation.id, 'CHALLAN_ISSUED');
                  onClose();
                }}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Issue Official E-Challan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
