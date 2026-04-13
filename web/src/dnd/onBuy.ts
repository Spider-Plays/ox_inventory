import { isSlotWithItem } from '../helpers';
import { getUtilityRoleForPlayerSlot, isItemAllowedInUtilityRole } from '../helpers/utilitySlotsValidation';
import { store } from '../store';
import { DragSource, DropTarget } from '../typings';
import { Items } from '../store/items';
import { buyItem } from '../thunks/buyItem';

export const onBuy = (source: DragSource, target: DropTarget) => {
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

  const count =
    state.itemAmount !== 0
      ? sourceSlot.count
        ? state.itemAmount > sourceSlot.count
          ? sourceSlot.count
          : state.itemAmount
        : state.itemAmount
      : 1;

  const data = {
    fromSlot: sourceSlot,
    toSlot: targetSlot,
    fromType: sourceInventory.type,
    toType: targetInventory.type,
    count: count,
  };

  store.dispatch(
    buyItem({
      ...data,
      fromSlot: sourceSlot.slot,
      toSlot: targetSlot.slot,
    })
  );
};
