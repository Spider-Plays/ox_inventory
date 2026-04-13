import React, { useState, useEffect } from 'react';
import InventoryComponent from './components/inventory';
import useNuiEvent from './hooks/useNuiEvent';
import { Items } from './store/items';
import { Locale } from './store/locale';
import { setImagePath } from './store/imagepath';
import { setupInventory } from './store/inventory';
import { Inventory } from './typings';
import { useAppDispatch } from './store';
import { setUtilitySlots } from './store/uiLayout';
import DragPreview from './components/utils/DragPreview';
import { fetchNui } from './utils/fetchNui';
import { useDragDropManager } from 'react-dnd';
import KeyPress from './components/utils/KeyPress';
import DevStageBadge from './dev/DevStageBadge';

type UiConfig = {
  gridCols?: number;
  gridSize?: number;
  gridGap?: number;
  visibleRowsMain?: number;
  visibleRowsBackpack?: number;
};

const applyUiConfig = (cfg: UiConfig) => {
  const root = document.documentElement;
  if (!root) return;

  if (typeof cfg.gridCols === 'number') root.style.setProperty('--inv-grid-cols', String(cfg.gridCols));
  if (typeof cfg.gridSize === 'number') root.style.setProperty('--inv-grid-size', `calc(((${cfg.gridSize}/1920)*100vw + (${cfg.gridSize}/1080)*100vh)/2)`);
  if (typeof cfg.gridGap === 'number') root.style.setProperty('--inv-grid-gap', `calc(((${cfg.gridGap}/1920)*100vw + (${cfg.gridGap}/1080)*100vh)/2)`);
  if (typeof cfg.visibleRowsMain === 'number')
    root.style.setProperty('--inv-visible-rows-main', String(cfg.visibleRowsMain));
  if (typeof cfg.visibleRowsBackpack === 'number')
    root.style.setProperty('--inv-visible-rows-backpack', String(cfg.visibleRowsBackpack));
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const manager = useDragDropManager();
  const [noBackdrop, setNoBackdrop] = useState(false);

  useNuiEvent<{
    locale: { [key: string]: string };
    items: typeof Items;
    leftInventory: Inventory;
    imagepath: string;
    utilitySlots?: { vest: number; backpack: number; phone: number; cash: number } | null;
  }>('init', ({ locale, items, leftInventory, imagepath, utilitySlots }) => {
    for (const name in locale) Locale[name] = locale[name];
    for (const name in items) Items[name] = items[name];

    setImagePath(imagepath);
    dispatch(setupInventory({ leftInventory }));
    if (
      utilitySlots?.vest &&
      utilitySlots?.backpack &&
      utilitySlots?.phone &&
      utilitySlots?.cash
    ) {
      dispatch(
        setUtilitySlots({
          vest: utilitySlots.vest,
          backpack: utilitySlots.backpack,
          phone: utilitySlots.phone,
          cash: utilitySlots.cash,
        })
      );
    } else {
      dispatch(setUtilitySlots(null)); // fallback: last four slots in getPlayerUtilitySlotIndices
    }
  });

  fetchNui('uiLoaded', {});

  useNuiEvent('closeInventory', () => {
    manager.dispatch({ type: 'dnd-core/END_DRAG' });
    setNoBackdrop(false); // Reset on close
  });

  useNuiEvent<boolean>('setNoBackdrop', setNoBackdrop);

  useNuiEvent<UiConfig>('setUiConfig', (cfg) => {
    applyUiConfig(cfg || {});
  });

  // Apply no-backdrop-mode class to body and #root for proper pointer-events passthrough
  useEffect(() => {
    const root = document.getElementById('root');
    if (noBackdrop) {
      document.body.classList.add('no-backdrop-mode');
      root?.classList.add('no-backdrop-mode');
    } else {
      document.body.classList.remove('no-backdrop-mode');
      root?.classList.remove('no-backdrop-mode');
    }
  }, [noBackdrop]);

  // When in no-backdrop mode, detect clicks on the right side and transfer focus to sd-crafting
  useEffect(() => {
    if (!noBackdrop) return;

    const handleClick = (e: MouseEvent) => {
      const screenMidpoint = window.innerWidth / 2;
      if (e.clientX > screenMidpoint) {
        // Click was on the right side - transfer focus to sd-crafting
        fetchNui('transferFocusToCrafting', {});
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [noBackdrop]);

  return (
    <div className={`app-wrapper${noBackdrop ? ' no-backdrop-mode' : ''}`}>
      <DevStageBadge />
      <InventoryComponent />
      <DragPreview />
      <KeyPress />
    </div>
  );
};

addEventListener('dragstart', function (event) {
  event.preventDefault();
});

export default App;
