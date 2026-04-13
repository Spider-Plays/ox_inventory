import React, { useCallback, useMemo, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useAppDispatch, useAppSelector } from '../../store';
import { store } from '../../store';
import InventorySlot from './InventorySlot';
import { Inventory } from '../../typings';
import { DragSource } from '../../typings';
import { Items } from '../../store/items';
import { getItemUrl, isSlotWithItem } from '../../helpers';
import { findAvailablePlayerSlotRespectingUtility } from '../../helpers/utilitySlotsValidation';
import { SlotWithItem } from '../../typings';
import { selectItemAmount, selectIsBusy } from '../../store/inventory';
import { buyItem } from '../../thunks/buyItem';
import { Locale } from '../../store/locale';
import { SearchIcon } from './shopIcons';
import { CartIcon } from './InventoryPanelIcons';

type CartLine = {
  shopSlot: number;
  name: string;
  label: string;
  qty: number;
  unitPrice: number;
  unitWeight: number;
  maxBuy: number;
};

const formatMoney = (n: number) => `${Locale.$ || '$'}${n.toLocaleString('en-US')}`;

const formatKg = (grams: number) => (grams >= 1000 ? `${(grams / 1000).toFixed(2)}kg` : `${Math.round(grams)}g`);

type Props = {
  leftInventory: Inventory;
  rightInventory: Inventory;
};

const ShopPanel: React.FC<Props> = ({ leftInventory, rightInventory }) => {
  const dispatch = useAppDispatch();
  const itemAmount = useAppSelector(selectItemAmount);
  const isBusy = useAppSelector(selectIsBusy);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [cart, setCart] = useState<CartLine[]>([]);

  const categories = useMemo(() => {
    const set = new Set<string>(['ALL']);
    rightInventory.items.forEach((slot) => {
      if (!slot.name) return;
      const c = Items[slot.name]?.category;
      set.add(c ? String(c).toUpperCase() : 'MISC');
    });
    return Array.from(set);
  }, [rightInventory.items]);

  const filteredStock = useMemo(() => {
    return rightInventory.items.filter((slot) => {
      if (!isSlotWithItem(slot)) return false;
      const label = (slot.metadata?.label as string) || Items[slot.name]?.label || slot.name;
      if (category !== 'ALL') {
        const c = Items[slot.name]?.category;
        const tab = c ? String(c).toUpperCase() : 'MISC';
        if (tab !== category) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!label.toLowerCase().includes(q) && !slot.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rightInventory.items, category, search]);

  const addToCart = useCallback(
    (shopSlot: number) => {
      const slot = rightInventory.items[shopSlot - 1];
      if (!isSlotWithItem(slot) || (slot.count !== undefined && slot.count === 0)) return;
      const qtyAdd = itemAmount > 0 ? itemAmount : 1;
      const maxStack = slot.count ?? 999999;
      const label = (slot.metadata?.label as string) || Items[slot.name]?.label || slot.name;
      const unitPrice = slot.price ?? 0;
      const unitW = slot.count ? slot.weight / slot.count : slot.weight;

      setCart((prev) => {
        const i = prev.findIndex((l) => l.shopSlot === shopSlot);
        if (i >= 0) {
          const next = [...prev];
          const nq = Math.min(next[i].qty + qtyAdd, maxStack);
          next[i] = { ...next[i], qty: nq, maxBuy: maxStack };
          return next;
        }
        return [
          ...prev,
          {
            shopSlot,
            name: slot.name,
            label,
            qty: Math.min(qtyAdd, maxStack),
            unitPrice,
            unitWeight: unitW,
            maxBuy: maxStack,
          },
        ];
      });
    },
    [rightInventory.items, itemAmount]
  );

  const [{ isOver }, drop] = useDrop<DragSource, void, { isOver: boolean }>(
    () => ({
      accept: 'SLOT',
      drop: (src) => {
        if (src.inventory === 'shop') addToCart(src.item.slot);
      },
      canDrop: (src) => src.inventory === 'shop',
      collect: (m) => ({ isOver: m.isOver() && m.canDrop() }),
    }),
    [addToCart]
  );

  const totalCost = useMemo(() => cart.reduce((s, l) => s + l.qty * l.unitPrice, 0), [cart]);
  const totalWeight = useMemo(() => cart.reduce((s, l) => s + l.qty * l.unitWeight, 0), [cart]);

  const updateLineQty = (shopSlot: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.shopSlot !== shopSlot) return l;
          const q = Math.max(1, Math.min(l.maxBuy, l.qty + delta));
          return { ...l, qty: q };
        })
        .filter((l) => l.qty > 0)
    );
  };

  const removeLine = (shopSlot: number) => setCart((prev) => prev.filter((l) => l.shopSlot !== shopSlot));

  const checkout = async (payment: 'cash' | 'bank') => {
    if (cart.length === 0 || isBusy) return;
    const overrideCurrency = payment === 'bank' ? 'bank' : undefined;
    let pending = [...cart];

    while (pending.length > 0) {
      const line = pending[0];
      const st = store.getState().inventory;
      const ui = store.getState().uiLayout;
      const shopSlot = st.rightInventory.items[line.shopSlot - 1];
      if (!isSlotWithItem(shopSlot)) break;
      const data = Items[shopSlot.name];
      if (!data) break;
      const target = findAvailablePlayerSlotRespectingUtility(shopSlot, data, st.leftInventory, ui.utilitySlots);
      if (!target?.slot) break;

      try {
        await dispatch(
          buyItem({
            fromSlot: line.shopSlot,
            toSlot: target.slot,
            fromType: 'shop',
            toType: 'player',
            count: line.qty,
            overrideCurrency,
          })
        ).unwrap();
        pending = pending.slice(1);
        setCart(pending);
      } catch {
        break;
      }
      await new Promise((r) => setTimeout(r, 140));
    }
  };

  return (
    <div className="shop-panel">
      <div className="shop-panel__top">
        <div className="shop-panel__title-row">
          <CartIcon className="shop-panel__title-icon" />
          <span className="shop-panel__title">
            {rightInventory.label ? rightInventory.label.toUpperCase() : Locale.ui_shop || 'SHOP'}
          </span>
        </div>
        <div className="shop-panel__toolbar">
          <div className="shop-panel__search">
            <input
              type="text"
              placeholder={Locale.ui_search_items || 'Search items...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="shop-panel__search-input"
            />
            <SearchIcon />
          </div>
          <div className="shop-panel__global-qty">
            <span className="shop-panel__global-qty-label">QTY</span>
            <span className="shop-panel__global-qty-val">{itemAmount > 0 ? itemAmount : 1}</span>
          </div>
        </div>
        <div className="shop-panel__tabs">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`shop-panel__tab ${category === c ? 'is-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="shop-panel__stock">
        <div className="shop-panel__stock-grid">
          {filteredStock.map((slot) => (
            <InventorySlot
              key={`shop-${slot.slot}`}
              item={slot}
              inventoryId={rightInventory.id}
              inventoryType={rightInventory.type}
              inventoryGroups={rightInventory.groups}
            />
          ))}
        </div>
      </div>

      <div className={`shop-panel__cart ${isOver ? 'is-drop-target' : ''}`} ref={drop}>
        <div className="shop-panel__cart-header">Shopping Cart!</div>
        {cart.length === 0 ? (
          <p className="shop-panel__cart-empty">Drag items here to purchase</p>
        ) : (
          <ul className="shop-panel__cart-list">
            {cart.map((line) => (
              <li key={line.shopSlot} className="shop-panel__cart-line">
                <img className="shop-panel__cart-thumb" src={getItemUrl({ name: line.name } as SlotWithItem)} alt="" />
                <div className="shop-panel__cart-meta">
                  <span className="shop-panel__cart-name">{line.label}</span>
                  <span className="shop-panel__cart-sub">
                    {formatKg(line.unitWeight)} · {formatMoney(line.unitPrice)} ea.
                  </span>
                </div>
                <div className="shop-panel__cart-qty">
                  <button type="button" onClick={() => updateLineQty(line.shopSlot, -1)}>
                    −
                  </button>
                  <span>{line.qty}</span>
                  <button type="button" onClick={() => updateLineQty(line.shopSlot, 1)}>
                    +
                  </button>
                </div>
                <span className="shop-panel__cart-line-total">{formatMoney(line.qty * line.unitPrice)}</span>
                <button type="button" className="shop-panel__cart-remove" onClick={() => removeLine(line.shopSlot)} aria-label="Remove">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="shop-panel__cart-summary">
          <div>
            <span>Total Cost</span>
            <strong>{formatMoney(totalCost)}</strong>
          </div>
          <div>
            <span>Total Weight</span>
            <strong>{formatKg(totalWeight)}</strong>
          </div>
        </div>
        <div className="shop-panel__pay-row">
          <button type="button" className="shop-panel__pay shop-panel__pay--bank" disabled={!cart.length || isBusy} onClick={() => checkout('bank')}>
            Pay with Bank
          </button>
          <button type="button" className="shop-panel__pay shop-panel__pay--cash" disabled={!cart.length || isBusy} onClick={() => checkout('cash')}>
            Pay with Cash
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopPanel;
