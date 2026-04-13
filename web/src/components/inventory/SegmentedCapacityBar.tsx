import React, { useMemo } from 'react';

type Props = {
  percent: number;
  /** Number of vertical segments in the bar */
  segments?: number;
};

const SegmentedCapacityBar: React.FC<Props> = ({ percent, segments = 48 }) => {
  const filled = useMemo(() => Math.min(segments, Math.round((Math.min(100, percent) / 100) * segments)), [percent, segments]);

  return (
    <div className="segmented-capacity-bar" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className="segmented-capacity-bar__track">
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className={`segmented-capacity-bar__seg ${i < filled ? 'is-filled' : ''}`} />
        ))}
      </div>
      <div className="segmented-capacity-bar__accent-line" />
    </div>
  );
};

export default SegmentedCapacityBar;
