import React from 'react';
import ViolationFeed from '../components/ViolationFeed';
import AnalyticsPanel from '../components/AnalyticsPanel';

export default function Dashboard({
  violations,
  stats,
  onSelectViolation,
  onUpdateStatus,
  filterType,
  setFilterType
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left 65%: Live Feed & Evidence Stream */}
      <div className="lg:col-span-8">
        <ViolationFeed
          violations={violations}
          onSelectViolation={onSelectViolation}
          onUpdateStatus={onUpdateStatus}
          filterType={filterType}
          setFilterType={setFilterType}
        />
      </div>

      {/* Right 35%: Analytics & Live SMS Alert Stream */}
      <div className="lg:col-span-4 sticky top-20">
        <AnalyticsPanel stats={stats} violations={violations} />
      </div>
    </div>
  );
}
