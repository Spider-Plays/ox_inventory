import { isInventoryLocalDev } from '../config/utilitySlots';
import { isEnvBrowser } from '../utils/misc';

const imagepath = 'https://cfx-nui-ox_inventory/web/images/';

const mockLocale: Record<string, string> = {
  ui_use: 'USE',
  ui_give: 'GIVE',
  ui_close: 'CLOSE',
  ui_drop: 'DROP',
  ui_search_items: 'Search items...',
  ui_shop: 'SHOP',
  ui_give_nearby: 'Give to Nearby Player',
  $: '$',
};

const mockItems: Record<string, Record<string, unknown>> = {
  money: {
    name: 'money',
    label: 'MONEY',
    stack: true,
    usable: false,
    close: false,
    count: 0,
    weight: 0,
  },
  phone: {
    name: 'phone',
    label: 'IPHONE BASIC',
    stack: false,
    usable: true,
    close: true,
    count: 0,
    weight: 1100,
    category: 'MISC',
  },
  burger: {
    name: 'burger',
    label: 'BURGER',
    stack: true,
    usable: true,
    close: true,
    count: 0,
    weight: 250,
    category: 'FOOD',
  },
  water: {
    name: 'water',
    label: 'WATER',
    stack: true,
    usable: true,
    close: true,
    count: 0,
    weight: 500,
    category: 'DRINKS',
  },
  paper: {
    name: 'paper',
    label: 'RENTAL PAPER',
    stack: true,
    usable: false,
    close: false,
    count: 0,
    weight: 10,
    category: 'MISC',
  },
  backpack: {
    name: 'backpack',
    label: 'SMALL BACKPACK',
    stack: false,
    usable: false,
    close: false,
    count: 0,
    weight: 500000,
  },
  lockpick: {
    name: 'lockpick',
    label: 'LOCKPICK',
    stack: true,
    usable: true,
    close: true,
    count: 0,
    weight: 50,
    category: 'TOOLS',
  },
  iron: { name: 'iron', label: 'IRON', stack: true, usable: false, close: false, count: 0, weight: 100, category: 'MISC' },
  copper: { name: 'copper', label: 'COPPER', stack: true, usable: false, close: false, count: 0, weight: 50, category: 'MISC' },
  powersaw: {
    name: 'powersaw',
    label: 'POWERSAW',
    stack: false,
    usable: false,
    close: false,
    count: 0,
    weight: 3000,
    category: 'TOOLS',
  },
  bandage: {
    name: 'bandage',
    label: 'BANDAGE',
    stack: true,
    usable: true,
    close: true,
    count: 0,
    weight: 100,
    category: 'MEDICAL',
  },
};

function buildPlayerItems() {
  const slots = 50;
  const items: Record<number, object> = {
    1: { slot: 1, name: 'money', weight: 300000, count: 300, metadata: {} },
    2: { slot: 2, name: 'phone', weight: 1100, count: 1, metadata: {} },
    3: { slot: 3, name: 'burger', weight: 1250, count: 5, metadata: {} },
    4: { slot: 4, name: 'water', weight: 2500, count: 5, metadata: {} },
    5: { slot: 5, name: 'paper', weight: 10, count: 1, metadata: {} },
    6: { slot: 6, name: 'paper', weight: 10, count: 1, metadata: {} },
    49: { slot: 49, name: 'backpack', weight: 500000, count: 1, metadata: { label: 'SMALL BACKPACK' } },
  };
  return { slots, items: Object.values(items), label: 'KARTHIK PATEL', weight: 3800, maxWeight: 85000 };
}

function buildShopInventory() {
  return {
    id: 'shop_dev',
    type: 'shop',
    slots: 10,
    label: 'YOUTOOL',
    weight: 0,
    maxWeight: 0,
    items: [
      { slot: 1, name: 'lockpick', weight: 50, count: 99, price: 300, currency: 'money' },
      { slot: 2, name: 'water', weight: 500, count: 50, price: 25, currency: 'money' },
      { slot: 3, name: 'burger', weight: 250, count: 30, price: 40, currency: 'money' },
      { slot: 4, name: 'bandage', weight: 100, count: 20, price: 100, currency: 'money' },
      { slot: 5, name: 'iron', weight: 100, count: 100, price: 15, currency: 'money' },
      { slot: 6, name: 'copper', weight: 50, count: 100, price: 12, currency: 'money' },
    ],
  };
}

/**
 * Emulates Lua NUI messages so `npm run dev` shows the full inventory in the browser.
 */
export function scheduleLocalDevInventoryEvents(): void {
  if (!isEnvBrowser() || !import.meta.env.DEV || !import.meta.env.VITE_INVENTORY_DEV) return;

  const left = buildPlayerItems();
  const right = buildShopInventory();

  window.setTimeout(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          action: 'init',
          data: {
            locale: mockLocale,
            items: mockItems,
            leftInventory: {
              id: 'player_dev',
              type: 'player',
              slots: left.slots,
              label: left.label,
              weight: left.weight,
              maxWeight: left.maxWeight,
              items: left.items,
            },
            imagepath,
            utilitySlots: { vest: 47, backpack: 48, phone: 49, cash: 50 },
          },
        },
      })
    );
  }, 100);

  window.setTimeout(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          action: 'setupInventory',
          data: {
            leftInventory: {
              id: 'player_dev',
              type: 'player',
              slots: left.slots,
              label: left.label,
              weight: left.weight,
              maxWeight: left.maxWeight,
              items: left.items,
            },
            rightInventory: right,
          },
        },
      })
    );
  }, 350);
}

export function shouldShowDevStageChrome(): boolean {
  return isInventoryLocalDev();
}
