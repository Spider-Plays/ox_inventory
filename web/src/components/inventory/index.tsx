import React, { useEffect, useMemo, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import InventoryControl from './InventoryControl';
import InventoryHotbar from './InventoryHotbar';
import { useAppDispatch, useAppSelector } from '../../store';
import { refreshSlots, selectLeftInventory, selectRightInventory, setAdditionalMetadata, setupInventory } from '../../store/inventory';
import { useExitListener } from '../../hooks/useExitListener';
import { InventoryType, type Inventory as InventoryProps } from '../../typings';
import InventoryGrid from './InventoryGrid';
import UtilityRack from './UtilityRack';
import Tooltip from '../utils/Tooltip';
import { closeTooltip } from '../../store/tooltip';
import InventoryContext from './InventoryContext';
import { closeContextMenu } from '../../store/contextMenu';
import Fade from '../utils/transitions/Fade';
import { getPlayerUtilitySlotIndices } from '../../config/utilitySlots';
import { selectUtilitySlots } from '../../store/uiLayout';
import ShopPanel from './ShopPanel';
import { fetchNui } from '../../utils/fetchNui';

const Inventory: React.FC = () => {
  const [inventoryVisible, setInventoryVisible] = useState(false);
  const dispatch = useAppDispatch();
  const leftInventory = useAppSelector(selectLeftInventory);
  const rightInventory = useAppSelector(selectRightInventory);
  const utilityConfig = useAppSelector(selectUtilitySlots);

  const utilitySlots = useMemo(
    () => getPlayerUtilitySlotIndices(leftInventory.slots, utilityConfig),
    [leftInventory.slots, utilityConfig]
  );

  const isBagUnderPlayer = useMemo(() => {
    if (!rightInventory?.id || rightInventory.type !== InventoryType.CONTAINER) return false;
    if (leftInventory.items.some((s) => s.metadata?.container === rightInventory.id)) return true;
    return /\b(backpack|bag|rucksack|duffel)\b/i.test(rightInventory.label || '');
  }, [leftInventory.items, rightInventory]);
  const utilityExclude = useMemo(
    () => (utilitySlots ? new Set(utilitySlots) : undefined),
    [utilitySlots]
  );

  useNuiEvent<boolean>('setInventoryVisible', setInventoryVisible);
  useNuiEvent<false>('closeInventory', () => {
    setInventoryVisible(false);
    dispatch(closeContextMenu());
    dispatch(closeTooltip());
  });
  useExitListener(setInventoryVisible);

  // NUI steals keyboard from the game; Tab must not cycle focus in CEF — second Tab closes like Escape.
  useEffect(() => {
    if (!inventoryVisible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Tab') return;
      e.preventDefault();
      e.stopPropagation();
      setInventoryVisible(false);
      dispatch(closeTooltip());
      dispatch(closeContextMenu());
      fetchNui('exit');
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [inventoryVisible, dispatch]);

  useNuiEvent<{
    leftInventory?: InventoryProps;
    rightInventory?: InventoryProps;
  }>('setupInventory', (data) => {
    dispatch(setupInventory(data));
    !inventoryVisible && setInventoryVisible(true);
  });

  useNuiEvent('refreshSlots', (data) => dispatch(refreshSlots(data)));

  useNuiEvent('displayMetadata', (data: Array<{ metadata: string; value: string }>) => {
    dispatch(setAdditionalMetadata(data));
  });

  return (
    <>
      <Fade in={inventoryVisible}>
        <div className="inventory-wrapper">
          <div className="inventory-shell animate-fadeIn">
            <div className="inventory-columns">
              <div className="inventory-column inventory-column--left">
                <InventoryGrid inventory={leftInventory} excludeSlots={utilityExclude} showSearch={false} />
                {isBagUnderPlayer && (
                  <InventoryGrid
                    inventory={rightInventory}
                    showSearch={false}
                    className="inventory-grid-wrapper--nested"
                  />
                )}
              </div>
              <div
                className={`inventory-column inventory-column--right${
                  rightInventory.type === 'shop' ? ' inventory-column--shop' : ''
                }`}
              >
                {rightInventory.slots > 0 && !isBagUnderPlayer && rightInventory.type === 'shop' && (
                  <ShopPanel leftInventory={leftInventory} rightInventory={rightInventory} />
                )}
                {rightInventory.slots > 0 && !isBagUnderPlayer && rightInventory.type !== 'shop' && (
                  <InventoryGrid inventory={rightInventory} showSearch={false} />
                )}
              </div>
            </div>

            <div className="inventory-bottom-dock">
              {utilitySlots && <UtilityRack inventory={leftInventory} slotIndices={utilitySlots} />}
              <InventoryControl />
            </div>
          </div>

          <Tooltip />
          <InventoryContext />
        </div>
      </Fade>
      <InventoryHotbar hideWhenInventoryOpen={inventoryVisible} />
    </>
  );
};

export default Inventory;
