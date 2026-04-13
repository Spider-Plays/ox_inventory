import React, { useCallback, useRef } from 'react';
import { DragSource, Inventory, InventoryType, Slot, SlotWithItem } from '../../typings';
import { useDrag, useDragDropManager, useDrop } from 'react-dnd';
import { store, useAppDispatch } from '../../store';
import WeightBar from '../utils/WeightBar';
import { onDrop } from '../../dnd/onDrop';
import { onBuy } from '../../dnd/onBuy';
import { Items } from '../../store/items';
import { canCraftItem, canPurchaseItem, getItemUrl, isSlotWithItem } from '../../helpers';
import type { UtilityRole } from '../../helpers/utilitySlotsValidation';
import { getUtilityRoleForPlayerSlot, isItemAllowedInUtilityRole } from '../../helpers/utilitySlotsValidation';
import { onUse } from '../../dnd/onUse';
import { Locale } from '../../store/locale';
import { onCraft } from '../../dnd/onCraft';
import useNuiEvent from '../../hooks/useNuiEvent';
import { ItemsPayload } from '../../reducers/refreshSlots';
import { closeTooltip, openTooltip } from '../../store/tooltip';
import { openContextMenu } from '../../store/contextMenu';
import { useMergeRefs } from '@floating-ui/react';

interface SlotProps {
  inventoryId: Inventory['id'];
  inventoryType: Inventory['type'];
  inventoryGroups: Inventory['groups'];
  item: Slot;
  /** UTILITY rack: thinner chrome; empty state uses parent ghost artwork */
  utilityFrame?: boolean;
  /** When set, only matching item types may be dropped here (player inventory). */
  utilitySlotRole?: UtilityRole;
}

const formatUnitWeight = (weight?: number, count?: number): string | null => {
  if (weight === undefined || weight <= 0) return null;
  const units = count && count > 0 ? weight / count : weight;
  if (units >= 1000) return `${(units / 1000).toFixed(2)}kg`;
  return `${Math.round(units)}g`;
};

/** Colored radial glow behind icons (reference UI). */
const getSlotGlowClass = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('money') || n === 'cash' || n.includes('bill')) return 'inventory-slot-glow--amber';
  if (n.includes('water') || n.includes('drink') || n.includes('cola') || n.includes('juice') || n.includes('coffee'))
    return 'inventory-slot-glow--blue';
  if (n.includes('burger') || n.includes('food') || n.includes('sandwich') || n.includes('bread') || n.includes('meal'))
    return 'inventory-slot-glow--rose';
  if (
    n.includes('weapon') ||
    n.includes('ammo') ||
    n.includes('pistol') ||
    n.includes('rifle') ||
    n.includes('shotgun') ||
    n.includes('smg')
  )
    return 'inventory-slot-glow--orange';
  if (n.includes('phone') || n.includes('laptop') || n.includes('radio')) return 'inventory-slot-glow--green';
  return 'inventory-slot-glow--cyan';
};

const InventorySlot: React.ForwardRefRenderFunction<HTMLDivElement, SlotProps> = (
  { item, inventoryId, inventoryType, inventoryGroups, utilityFrame, utilitySlotRole },
  ref
) => {
  const manager = useDragDropManager();
  const dispatch = useAppDispatch();
  const timerRef = useRef<number | null>(null);

  const canDrag = useCallback(() => {
    return canPurchaseItem(item, { type: inventoryType, groups: inventoryGroups }) && canCraftItem(item, inventoryType);
  }, [item, inventoryType, inventoryGroups]);

  const [{ isDragging }, drag] = useDrag<DragSource, void, { isDragging: boolean }>(
    () => ({
      type: 'SLOT',
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      item: () =>
        isSlotWithItem(item, inventoryType !== InventoryType.SHOP)
          ? {
              inventory: inventoryType,
              item: {
                name: item.name,
                slot: item.slot,
              },
              image: item?.name && `url(${getItemUrl(item) || 'none'}`,
            }
          : null,
      canDrag,
    }),
    [inventoryType, item]
  );

  const [{ isOver }, drop] = useDrop<DragSource, void, { isOver: boolean }>(
    () => ({
      accept: 'SLOT',
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
      drop: (source) => {
        dispatch(closeTooltip());
        switch (source.inventory) {
          case InventoryType.SHOP:
            onBuy(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
          case InventoryType.CRAFTING:
            onCraft(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
          default:
            onDrop(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
        }
      },
      canDrop: (source) => {
        const base =
          (source.item.slot !== item.slot || source.inventory !== inventoryType) &&
          inventoryType !== InventoryType.SHOP &&
          inventoryType !== InventoryType.CRAFTING;
        if (!base) return false;
        if (utilitySlotRole && inventoryType === 'player') {
          if (!isItemAllowedInUtilityRole(utilitySlotRole, source.item.name)) return false;
          if (isSlotWithItem(item, true) && item.name) {
            const s = store.getState();
            const roleFrom = getUtilityRoleForPlayerSlot(
              source.item.slot,
              s.inventory.leftInventory.slots,
              s.uiLayout.utilitySlots
            );
            if (roleFrom && !isItemAllowedInUtilityRole(roleFrom, item.name)) return false;
          }
        }
        return true;
      },
    }),
    [inventoryType, item, utilitySlotRole]
  );

  useNuiEvent('refreshSlots', (data: { items?: ItemsPayload | ItemsPayload[] }) => {
    if (!isDragging && !data.items) return;
    if (!Array.isArray(data.items)) return;

    const itemSlot = data.items.find(
      (dataItem) => dataItem.item.slot === item.slot && dataItem.inventory === inventoryId
    );

    if (!itemSlot) return;

    manager.dispatch({ type: 'dnd-core/END_DRAG' });
  });

  const connectRef = (element: HTMLDivElement) => drag(drop(element));

  const handleContext = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (inventoryType !== 'player' || !isSlotWithItem(item)) return;

    dispatch(openContextMenu({ item, coords: { x: event.clientX, y: event.clientY } }));
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    dispatch(closeTooltip());
    if (timerRef.current) clearTimeout(timerRef.current);
    if (event.ctrlKey && isSlotWithItem(item) && inventoryType !== 'shop' && inventoryType !== 'crafting') {
      onDrop({ item: item, inventory: inventoryType });
    } else if (event.altKey && isSlotWithItem(item) && inventoryType === 'player') {
      onUse(item);
    }
  };

  const refs = useMergeRefs([connectRef, ref]);

  const isEmpty = !item?.name;
  const unitWeightLabel = isSlotWithItem(item) ? formatUnitWeight(item.weight, item.count) : null;

  return (
    <div
      ref={refs}
      onContextMenu={handleContext}
      onClick={handleClick}
      className={`inventory-slot ${isEmpty ? 'inventory-slot-empty' : ''} ${utilityFrame ? 'inventory-slot--utility' : ''}`}
      style={{
        filter:
          !isEmpty && (!canPurchaseItem(item, { type: inventoryType, groups: inventoryGroups }) || !canCraftItem(item, inventoryType))
            ? 'brightness(80%) grayscale(100%)'
            : undefined,
        opacity: isDragging ? 0.4 : 1.0,
        border: isOver ? '1px dashed rgba(91, 188, 201, 0.55)' : '',
        backgroundColor: isOver && isEmpty ? 'rgba(91, 188, 201, 0.08)' : undefined,
      }}
    >
      {isSlotWithItem(item) && (
        <div
          className="item-slot-wrapper"
          onMouseEnter={() => {
            timerRef.current = window.setTimeout(() => {
              dispatch(openTooltip({ item, inventoryType }));
            }, 500) as unknown as number;
          }}
          onMouseLeave={() => {
            dispatch(closeTooltip());
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
          }}
        >
          <div className={`inventory-slot-glow ${getSlotGlowClass(item.name)}`} aria-hidden />

          {/* Hotbar slot number - top left */}
          {inventoryType === 'player' && item.slot <= 5 && (
            <div className="inventory-slot-number">{item.slot}</div>
          )}

          {/* Count badge - top right */}
          {item.count !== undefined && item.count > 0 && (
            <div className="inventory-slot-count">{item.count}x</div>
          )}

          {/* Centered item image */}
          <img
            src={getItemUrl(item as SlotWithItem)}
            alt={item.name}
            className="inventory-slot-image"
            draggable={false}
          />

          {/* Item label */}
          <div className="inventory-slot-label">
            {item.metadata?.label ? item.metadata.label : Items[item.name]?.label || item.name}
          </div>

          {unitWeightLabel && <div className="inventory-slot-unit-weight">{unitWeightLabel}</div>}

          {/* Durability bar */}
          {inventoryType !== 'shop' && item?.durability !== undefined && (
            <div className="inventory-slot-durability">
              <WeightBar percent={item.durability} durability />
            </div>
          )}

          {/* Shop price */}
          {inventoryType === 'shop' && item?.price !== undefined && item.price > 0 && (
            <div className="inventory-slot-price">
              {item?.currency !== 'money' && item.currency !== 'black_money' && item.currency ? (
                <>
                  <img
                    src={getItemUrl(item.currency)}
                    alt="currency"
                    className="inventory-slot-currency-icon"
                  />
                  <span>{item.price.toLocaleString('en-us')}</span>
                </>
              ) : (
                <span
                  className={
                    item.currency === 'money' || !item.currency ? 'inventory-slot-price__cash' : 'inventory-slot-price__other'
                  }
                >
                  {Locale.$ || '$'}
                  {item.price.toLocaleString('en-us')}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(React.forwardRef(InventorySlot));
