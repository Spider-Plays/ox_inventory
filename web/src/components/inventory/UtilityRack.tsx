import React from 'react';
import type { UtilityRole } from '../../helpers/utilitySlotsValidation';
import { Inventory } from '../../typings';
import InventorySlot from './InventorySlot';

type Props = {
  inventory: Inventory;
  slotIndices: [number, number, number, number];
};

const VestGhost: React.FC = () => (
  <svg className="utility-rack__ghost-icon" viewBox="0 0 64 64" fill="none" aria-hidden>
    <path
      d="M20 18h24v8l-4 4v20H24V30l-4-4v-8z"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.35"
    />
    <path d="M26 22h12M26 28h12" stroke="currentColor" strokeWidth="1" opacity="0.25" />
  </svg>
);

const BackpackGhost: React.FC = () => (
  <svg className="utility-rack__ghost-icon" viewBox="0 0 64 64" fill="none" aria-hidden>
    <rect x="18" y="20" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <path d="M26 20v-4a6 6 0 0112 0v4" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
  </svg>
);

const PhoneGhost: React.FC = () => (
  <svg className="utility-rack__ghost-icon" viewBox="0 0 64 64" fill="none" aria-hidden>
    <rect x="22" y="12" width="20" height="40" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <path d="M28 18h8M32 46h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
  </svg>
);

const CashGhost: React.FC = () => (
  <svg className="utility-rack__ghost-icon" viewBox="0 0 64 64" fill="none" aria-hidden>
    <rect x="14" y="22" width="36" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <path
      d="M32 26v14M26 30c0-2 2.5-3 6-3s6 1 6 3-2.5 3-6 3-6-1-6-3z"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.3"
    />
  </svg>
);

const GHOSTS: React.FC[] = [VestGhost, BackpackGhost, PhoneGhost, CashGhost];
const LABELS: [string, string, string, string] = ['VEST', 'BACKPACK', 'PHONE', 'CASH'];
const ROLES: UtilityRole[] = ['vest', 'backpack', 'phone', 'cash'];

/**
 * Equipment strip — slots remain normal player inventory slots for DnD + context menu.
 */
const UtilityRack: React.FC<Props> = ({ inventory, slotIndices }) => {
  return (
    <div className="utility-rack">
      <p className="utility-rack__title">UTILITY</p>
      <div className="utility-rack__slots">
        {slotIndices.map((slotNum, idx) => {
          const item = inventory.items.find((s) => s.slot === slotNum);
          const slotData = item ?? { slot: slotNum };
          const Ghost = GHOSTS[idx];
          return (
            <div key={slotNum} className="utility-rack__cell">
              <span className="utility-rack__label">{LABELS[idx]}</span>
              <div className="utility-rack__slot-frame">
                {!item?.name && (
                  <div className="utility-rack__ghost" aria-hidden>
                    <Ghost />
                  </div>
                )}
                <InventorySlot
                  item={slotData}
                  inventoryId={inventory.id}
                  inventoryType={inventory.type}
                  inventoryGroups={inventory.groups}
                  utilityFrame
                  utilitySlotRole={ROLES[idx]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UtilityRack;
