import { getUtilityRoleForPlayerSlot, isItemAllowedInUtilityRole } from '../helpers/utilitySlotsValidation';
import { store } from '../store';
import { DragSource, DropTarget } from '../typings';
import { isSlotWithItem } from '../helpers';
import { Items } from '../store/items';
import { craftItem } from '../thunks/craftItem';

export const onCraft = (source: DragSource, target: DropTarget) => {
  const root = store.getState();
  const state = root.inventory;
  const utilConfig = root.uiLayout.utilitySlots;

  const sourceInventory = state.rightInventory;
  const targetInventory = state.leftInventory;

  const sourceSlot = sourceInventory.items[source.item.slot - 1];

  if (!isSlotWithItem(sourceSlot)) throw new Error(`Item ${sourceSlot.slot} name === undefined`);

  if (sourceSlot.count === 0) return;

  const sourceData = Items[sourceSlot.name];

  if (sourceData === undefined) return console.error(`Item ${sourceSlot.name} data undefined!`);

  const targetSlot = targetInventory.items[target.item.slot - 1];

  if (targetSlot === undefined) return console.error(`Target slot undefined`);

  if (targetInventory.type === 'player') {
    const role = getUtilityRoleForPlayerSlot(targetSlot.slot, targetInventory.slots, utilConfig);
    if (role && !isItemAllowedInUtilityRole(role, sourceSlot.name)) return;
  }

  const count = state.itemAmount === 0 ? 1 : state.itemAmount;

  const data = {
    fromSlot: sourceSlot,
    toSlot: targetSlot,
    fromType: sourceInventory.type,
    toType: targetInventory.type,
    count,
  };

  store.dispatch(
    craftItem({
      ...data,
      fromSlot: sourceSlot.slot,
      toSlot: targetSlot.slot,
    })
  );
};
