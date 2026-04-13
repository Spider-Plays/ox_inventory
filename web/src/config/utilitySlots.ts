import type { UtilitySlotConfig } from '../store/uiLayout';
import { isEnvBrowser } from '../utils/misc';

/** True when running Vite dev server in a normal browser (not CEF). */
export const isInventoryLocalDev = (): boolean =>
  Boolean(import.meta.env.DEV && import.meta.env.VITE_INVENTORY_DEV && isEnvBrowser());

/**
 * VEST / BACKPACK / PHONE / CASH strip — four real player slots.
 * - Override with convars (all four) → `init` sends `utilitySlots` from client.lua.
 * - Default: last four slots (N-3 … N).
 */
export function getPlayerUtilitySlotIndices(
  totalSlots: number,
  config: UtilitySlotConfig
): [number, number, number, number] | null {
  if (totalSlots < 4) return null;
  if (config && config.vest > 0 && config.backpack > 0 && config.phone > 0 && config.cash > 0) {
    return [config.vest, config.backpack, config.phone, config.cash];
  }
  return [totalSlots - 3, totalSlots - 2, totalSlots - 1, totalSlots];
}
