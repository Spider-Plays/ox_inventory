import { canStack, findAvailableSlot, getTargetInventory, isSlotWithItem } from '../helpers';
import {
  findAvailablePlayerSlotRespectingUtility,
  getUtilityRoleForPlayerSlot,
  isItemAllowedInUtilityRole,
} from '../helpers/utilitySlotsValidation';
import { validateMove } from '../thunks/validateItems';
import { store } from '../store';
import { DragSource, DropTarget, InventoryType, SlotWithItem } from '../typings';
import { moveSlots, stackSlots, swapSlots } from '../store/inventory';
import { Items } from '../store/items';

export const onDrop = (source: DragSource, target?: DropTarget) => {
  const root = store.getState();
  const state = root.inventory;
  const utilConfig = root.uiLayout.utilitySlots;

  const { sourceInventory, targetInventory } = getTargetInventory(state, source.inventory, target?.inventory);

  const sourceSlot = sourceInventory.items[source.item.slot - 1] as SlotWithItem;

  const sourceData = Items[sourceSlot.name];

  if (sourceData === undefined) return console.error(`${sourceSlot.name} item data undefined!`);

  // If dragging from container slot
  if (sourceSlot.metadata?.container !== undefined) {
    // Prevent storing container in container
    if (targetInventory.type === InventoryType.CONTAINER)
      return console.log(`Cannot store container ${sourceSlot.name} inside another container`);

    // Prevent dragging of container slot when opened
    if (state.rightInventory.id === sourceSlot.metadata.container)
      return console.log(`Cannot move container ${sourceSlot.name} when opened`);
  }

  const targetSlot = target
    ? targetInventory.items[target.item.slot - 1]
    : targetInventory.type === 'player'
    ? findAvailablePlayerSlotRespectingUtility(sourceSlot, sourceData, targetInventory, utilConfig)
    : findAvailableSlot(sourceSlot, sourceData, targetInventory.items);

  if (targetSlot === undefined) return console.error('Target slot undefined!');

  // If dropping on container slot when opened
  if (targetSlot.metadata?.container !== undefined && state.rightInventory.id === targetSlot.metadata.container)
    return console.log(`Cannot swap item ${sourceSlot.name} with container ${targetSlot.name} when opened`);

  const left = state.leftInventory;
  const roleTo =
    targetInventory === left && left.type === 'player'
      ? getUtilityRoleForPlayerSlot(targetSlot.slot, left.slots, utilConfig)
      : undefined;
  const roleFrom =
    sourceInventory === left && left.type === 'player'
      ? getUtilityRoleForPlayerSlot(sourceSlot.slot, left.slots, utilConfig)
      : undefined;
  if (roleTo && !isItemAllowedInUtilityRole(roleTo, sourceSlot.name)) return;
  if (roleFrom && isSlotWithItem(targetSlot, true) && targetSlot.name && !isItemAllowedInUtilityRole(roleFrom, targetSlot.name))
    return;

  const count =
    state.shiftPressed && sourceSlot.count > 1 && sourceInventory.type !== 'shop'
      ? Math.floor(sourceSlot.count / 2)
      : state.itemAmount === 0 || state.itemAmount > sourceSlot.count
      ? sourceSlot.count
      : state.itemAmount;

  const data = {
    fromSlot: sourceSlot,
    toSlot: targetSlot,
    fromType: sourceInventory.type,
    toType: targetInventory.type,
    count: count,
  };

  const armourVestEquip =
    (sourceSlot.name === 'armour' || sourceSlot.name === 'armor') &&
    targetInventory === left &&
    left.type === 'player' &&
    roleTo === 'vest' &&
    roleFrom !== 'vest';

  const armourVestRemove =
    (sourceSlot.name === 'armour' || sourceSlot.name === 'armor') &&
    sourceInventory === left &&
    left.type === 'player' &&
    roleFrom === 'vest' &&
    roleTo !== 'vest';

  store.dispatch(
    validateMove({
      ...data,
      fromSlot: sourceSlot.slot,
      toSlot: targetSlot.slot,
      ...(armourVestEquip ? { armourVestEquip: true, armourItemName: sourceSlot.name } : {}),
      ...(armourVestRemove ? { armourVestRemove: true, armourItemName: sourceSlot.name } : {}),
    })
  );

  isSlotWithItem(targetSlot, true)
    ? sourceData.stack && canStack(sourceSlot, targetSlot)
      ? store.dispatch(
          stackSlots({
            ...data,
            toSlot: targetSlot,
          })
        )
      : store.dispatch(
          swapSlots({
            ...data,
            toSlot: targetSlot,
          })
        )
    : store.dispatch(moveSlots(data));
};
