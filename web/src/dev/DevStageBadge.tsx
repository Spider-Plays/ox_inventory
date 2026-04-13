import React from 'react';
import { shouldShowDevStageChrome } from './mockInventoryEvents';

const DevStageBadge: React.FC = () => {
  if (!shouldShowDevStageChrome()) return null;

  return (
    <div className="inventory-dev-badge" role="status">
      <span className="inventory-dev-badge__dot" aria-hidden />
      <span>Dev preview — localhost</span>
    </div>
  );
};

export default DevStageBadge;
