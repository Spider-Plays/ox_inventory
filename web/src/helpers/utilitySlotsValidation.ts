import { isEqual } from 'lodash';
import type { UtilitySlotConfig } from '../store/uiLayout';
import type { Inventory, ItemData, Slot } from '../typings';

export type UtilityRole = 'vest' | 'backpack' | 'phone' | 'cash';

/** Slot roles and allowed items — keep in sync with `modules/utility_slots/server.lua`. */
export function getUtilityRoleForPlayerSlot(
  slot: number,
  totalSlots: number,
  config: UtilitySlotConfig | null
): UtilityRole | null {
  if (totalSlots < 4) return null;

  let vest: number;
  let backpack: number;
  let phone: number;
  let cash: number;

  if (config && config.vest > 0 && config.backpack > 0 && config.phone > 0 && config.cash > 0) {
    ({ vest, backpack, phone, cash } = config);
  } else {
    vest = totalSlots - 3;
    backpack = totalSlots - 2;
    phone = totalSlots - 1;
    cash = totalSlots;
  }

  if (slot === vest) return 'vest';
  if (slot === backpack) return 'backpack';
  if (slot === phone) return 'phone';
  if (slot === cash) return 'cash';
  return null;
}

export function isItemAllowedInUtilityRole(role: UtilityRole, itemName: string): boolean {
  switch (role) {
    case 'vest':
      return itemName === 'armour' || itemName === 'armor';
    case 'phone':
      return itemName === 'phone';
    case 'cash':
      return itemName === 'money';
    case 'backpack':
      if (itemName === 'backpack') return true;
      return itemName.toLowerCase().includes('backpack');
    default:
      return true;
  }
}

/** Like `findAvailableSlot`, but skips utility slots that do not accept this item (e.g. shop checkout). */
export function findAvailablePlayerSlotRespectingUtility(
  item: Slot,
  data: ItemData,
  leftInventory: Inventory,
  utilConfig: UtilitySlotConfig | null
): Slot | undefined {
  const items = leftInventory.items;

  const allow = (target: Slot) => {
    const role = getUtilityRoleForPlayerSlot(target.slot, leftInventory.slots, utilConfig);
    if (!role) return true;
    return item.name !== undefined && isItemAllowedInUtilityRole(role, item.name);
  };

  if (!data.stack) return items.find((target) => target.name === undefined && allow(target));

  const stackableSlot = items.find(
    (target) =>
      target.name === item.name &&
      target.metadata !== undefined &&
      item.metadata !== undefined &&
      isEqual(target.metadata, item.metadata) &&
      allow(target)
  );

  return stackableSlot || items.find((target) => target.name === undefined && allow(target));
}
