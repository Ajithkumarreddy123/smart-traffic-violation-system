import React, { useState, useEffect } from 'react';
import { Search, Plus, Car, Phone, Mail, MapPin, Check, Shield } from 'lucide-react';
import HSRPPlateBadge from './HSRPPlateBadge';

export default function RTORegistryTab() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    license_plate: '',
    owner_name: '',
    owner_phone: '+91 ',
    owner_email: '',
    vehicle_model: '',
    vehicle_type: 'Two-Wheeler',
    rto_office: 'KA-01 Koramangala RTO, Bengaluru'
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const url = search ? `/api/vehicles?search=${encodeURIComponent(search)}` : '/api/vehicles';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search]);

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle)
      });
      if (res.ok) {
        setModalOpen(false);
        setNewVehicle({
          license_plate: '',
          owner_name: '',
          owner_phone: '+91 ',
          owner_email: '',
          vehicle_model: '',
          vehicle_type: 'Two-Wheeler',
          rto_office: 'KA-01 Koramangala RTO, Bengaluru'
        });
        fetchVehicles();
      } else {
        const err = await res.json();
        alert(err.detail || "Error creating vehicle");
      }
    } catch (err) {
      alert("Failed to connect to backend server");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Add Vehicle Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search VAHAN records by plate or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-lg shadow-cyan-600/20 border border-cyan-400/30 transition active:scale-95 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Register Test Vehicle</span>
        </button>
      </div>

      {/* Grid of Registered Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="glass-panel p-4 rounded-xl space-y-3 border border-white/10 hover:border-cyan-500/40 transition group"
          >
            <div className="flex items-center justify-between">
              <HSRPPlateBadge
                plate={v.license_plate}
                isCommercial={v.vehicle_type === 'Commercial'}
                size="sm"
              />
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {v.vehicle_type}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-slate-100 text-sm">{v.owner_name}</div>
              <div className="text-slate-400 font-medium">{v.vehicle_model}</div>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-1 text-xs text-slate-400">
              <div className="flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                <span className="font-mono text-slate-300">{v.owner_phone}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-cyan-400 flex-shrink-0" />
                <span className="truncate text-slate-300">{v.rto_office}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal to Register Mock Vehicle */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center">
              <Shield className="w-5 h-5 mr-2 text-cyan-400" />
              Register Test Vehicle (VAHAN Mock Registry)
            </h3>
            <p className="text-xs text-slate-400">
              Add a custom vehicle plate so your vision engine or simulation automatically matches owner contact details!
            </p>

            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">License Plate (e.g. KA05XY9999)</label>
                <input
                  type="text"
                  required
                  value={newVehicle.license_plate}
                  onChange={(e) => setNewVehicle({ ...newVehicle, license_plate: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                  placeholder="KA05AB9999"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={newVehicle.owner_name}
                  onChange={(e) => setNewVehicle({ ...newVehicle, owner_name: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Anand Murthy"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Owner Mobile</label>
                  <input
                    type="text"
                    required
                    value={newVehicle.owner_phone}
                    onChange={(e) => setNewVehicle({ ...newVehicle, owner_phone: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Vehicle Type</label>
                  <select
                    value={newVehicle.vehicle_type}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Two-Wheeler">Two-Wheeler</option>
                    <option value="Four-Wheeler">Four-Wheeler</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Vehicle Model</label>
                <input
                  type="text"
                  required
                  value={newVehicle.vehicle_model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_model: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Ather 450X Gen 3"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">RTO Jurisdiction</label>
                <input
                  type="text"
                  required
                  value={newVehicle.rto_office}
                  onChange={(e) => setNewVehicle({ ...newVehicle, rto_office: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition shadow-lg shadow-cyan-600/20"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
