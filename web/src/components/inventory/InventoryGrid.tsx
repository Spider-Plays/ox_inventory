import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Inventory, InventoryType } from '../../typings';
import InventorySlot from './InventorySlot';
import { getTotalWeight } from '../../helpers';
import { useAppSelector } from '../../store';
import { useIntersection } from '../../hooks/useIntersection';
import { Items } from '../../store/items';
import { Locale } from '../../store/locale';
import { fetchNui } from '../../utils/fetchNui';
import SegmentedCapacityBar from './SegmentedCapacityBar';
import { BriefcaseIcon, CartIcon, VaultIcon } from './InventoryPanelIcons';

const PAGE_SIZE = 30;

// Search icon component
const SearchIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

// X icon component for clear button
const XIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// Weight/Scale icon component
const WeightIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: 'calc((0.729vw + 1.296vh) / 2)', height: 'calc((0.729vw + 1.296vh) / 2)' }}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z"
      clipRule="evenodd"
    />
  </svg>
);

// Format weight helper (inventory totals — same gram base as ox)
const formatWeight = (weight: number): string => {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(2)}kg`;
  }
  return `${Math.round(weight)}g`;
};

// Get weight display color class based on capacity percentage
const getWeightColorClass = (percent: number): string => {
  if (percent >= 100) return 'weight-critical';
  if (percent >= 80) return 'weight-warning';
  return '';
};

type GridProps = {
  inventory: Inventory;
  excludeSlots?: Set<number>;
  showSearch?: boolean;
  className?: string;
};

const InventoryGrid: React.FC<GridProps> = ({ inventory, excludeSlots, showSearch, className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const weight = useMemo(
    () => (inventory.maxWeight !== undefined ? Math.floor(getTotalWeight(inventory.items) * 1000) / 1000 : 0),
    [inventory.maxWeight, inventory.items]
  );
  const weightPercent = useMemo(
    () => (inventory.maxWeight ? (weight / inventory.maxWeight) * 100 : 0),
    [weight, inventory.maxWeight]
  );
  const [page, setPage] = useState(0);
  const containerRef = useRef(null);
  const { ref, entry } = useIntersection({ threshold: 0.5 });
  const isBusy = useAppSelector((state) => state.inventory.isBusy);

  const baseItems = useMemo(() => {
    if (!excludeSlots?.size) return inventory.items;
    return inventory.items.filter((slot) => !excludeSlots.has(slot.slot));
  }, [inventory.items, excludeSlots]);

  const searchVisible = showSearch ?? inventory.type === InventoryType.SHOP;

  const panelIcon =
    inventory.type === InventoryType.PLAYER ? (
      <BriefcaseIcon className="inv-panel-header__icon" />
    ) : inventory.type === InventoryType.SHOP ? (
      <CartIcon className="inv-panel-header__icon" />
    ) : (
      <VaultIcon className="inv-panel-header__icon" />
    );

  useEffect(() => {
    if (entry && entry.isIntersecting) {
      setPage((prev) => ++prev);
    }
  }, [entry]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return baseItems;

    const lowerSearch = searchTerm.toLowerCase();

    return baseItems.map((item) => {
      if (!item.name) return item; // Empty slot, keep as is

      // Get label from metadata, Items store, or fallback to name
      const itemLabel = item.metadata?.label || Items[item.name]?.label || item.name;

      const matchesSearch =
        item.name.toLowerCase().includes(lowerSearch) ||
        itemLabel.toLowerCase().includes(lowerSearch);

      // If doesn't match, return empty slot placeholder
      if (!matchesSearch) {
        return { ...item, name: undefined, count: undefined, metadata: undefined };
      }

      return item;
    });
  }, [baseItems, searchTerm]);

  // Count actual items (non-empty slots) in this grid view
  const itemCount = useMemo(() => baseItems.filter((item) => item.name).length, [baseItems]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div
      className={`inventory-grid-wrapper${className ? ` ${className}` : ''}`}
      style={{ pointerEvents: isBusy ? 'none' : 'auto' }}
    >
      <div className="inv-panel-header">
        <div className="inv-panel-header__black-bar">
          <div className="inv-panel-header__black-bar-main">
            {panelIcon}
            <p className="inv-panel-header__label">{(inventory.label || 'INVENTORY').toUpperCase()}</p>
          </div>
          <div className="inv-panel-header__black-bar-right">
            <span className="inv-panel-header__meta">{itemCount} ITEMS</span>
            <button type="button" className="inv-panel-header__chevron" tabIndex={-1} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
            </button>
          </div>
        </div>
        {inventory.maxWeight !== undefined && inventory.maxWeight > 0 && (
          <div className="inv-panel-header__body">
            <div className={`inv-panel-header__weight-row inventory-weight-display ${getWeightColorClass(weightPercent)}`}>
              <WeightIcon />
              <span>
                {formatWeight(weight)}/{formatWeight(inventory.maxWeight)}
              </span>
            </div>
            <SegmentedCapacityBar percent={weightPercent} />
          </div>
        )}
      </div>

      {searchVisible && (
        <div className="inventory-search-wrapper">
          <div className="inventory-search-container">
            <input
              type="text"
              placeholder={Locale.ui_search_items || 'Search items...'}
              value={searchTerm}
              onChange={handleSearchChange}
              onClick={(e) => {
                e.stopPropagation();
                (e.target as HTMLInputElement).focus();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={() => fetchNui('lockControls', true)}
              onBlur={() => fetchNui('lockControls', false)}
              className="inventory-search-input"
            />
            {searchTerm ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="inventory-search-clear"
                type="button"
              >
                <XIcon />
              </button>
            ) : (
              <span className="inventory-search-icon">
                <SearchIcon />
              </span>
            )}
          </div>
        </div>
      )}

      <div className="inventory-grid-container" ref={containerRef}>
        {filteredItems.slice(0, (page + 1) * PAGE_SIZE).map((item, index) => (
          <InventorySlot
            key={`${inventory.type}-${inventory.id}-${item.slot}`}
            item={item}
            ref={index === (page + 1) * PAGE_SIZE - 1 ? ref : null}
            inventoryType={inventory.type}
            inventoryGroups={inventory.groups}
            inventoryId={inventory.id}
          />
        ))}
      </div>
    </div>
  );
};

export default InventoryGrid;
