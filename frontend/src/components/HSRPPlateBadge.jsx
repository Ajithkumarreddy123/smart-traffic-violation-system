import React from 'react';

/**
 * Stylized Indian High Security Registration Plate (HSRP)
 * Features standard IND blue strip, Ashok Chakra graphic, and bold spaced plate number
 */
export default function HSRPPlateBadge({ plate, isCommercial = false, size = "md" }) {
  const cleanPlate = (plate || "KA01AB1234").toUpperCase().replace(/\s+/g, '');

  // Format plate nicely e.g., "KA 01 AB 1234"
  const formattedPlate = cleanPlate.length >= 10
    ? `${cleanPlate.slice(0, 2)} ${cleanPlate.slice(2, 4)} ${cleanPlate.slice(4, 6)} ${cleanPlate.slice(6)}`
    : cleanPlate;

  const sizeClasses = {
    sm: "h-7 text-xs px-1.5",
    md: "h-9 text-sm px-2.5",
    lg: "h-11 text-base px-3",
    xl: "h-14 text-xl px-4"
  };

  const bgClass = isCommercial ? "bg-amber-400 text-slate-950 border-amber-500" : "bg-white text-slate-900 border-slate-300";

  return (
    <div className={`inline-flex items-center rounded border-2 shadow-md font-mono font-bold tracking-wider select-none ${bgClass} ${sizeClasses[size] || sizeClasses.md}`}>
      {/* IND Blue Left Strip */}
      <div className="flex flex-col items-center justify-center bg-[#003399] text-white px-1 py-0.5 rounded-l -ml-1 mr-2 h-full">
        {/* Ashoka Chakra simulation icon */}
        <div className="w-2.5 h-2.5 rounded-full border border-sky-300 flex items-center justify-center my-0.5">
          <div className="w-1 h-1 rounded-full bg-sky-200"></div>
        </div>
        <span className="text-[9px] font-extrabold tracking-tight leading-none text-white">IND</span>
      </div>

      {/* Hologram Stamp Marker */}
      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/30 mr-1.5 border border-cyan-400/50 hidden sm:block"></div>

      {/* Plate Registration Number */}
      <span className="font-extrabold tracking-widest text-slate-900 drop-shadow-sm">
        {formattedPlate}
      </span>
    </div>
  );
}
