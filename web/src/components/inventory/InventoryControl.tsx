import React from 'react';
import { useDrop } from 'react-dnd';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectItemAmount, setItemAmount } from '../../store/inventory';
import { DragSource } from '../../typings';
import { onUse } from '../../dnd/onUse';
import { onGive } from '../../dnd/onGive';
import { fetchNui } from '../../utils/fetchNui';
import { Locale } from '../../store/locale';

const InventoryControl: React.FC = () => {
  const itemAmount = useAppSelector(selectItemAmount);
  const dispatch = useAppDispatch();

  const [, use] = useDrop<DragSource, void, unknown>(() => ({
    accept: 'SLOT',
    drop: (source) => {
      source.inventory === 'player' && onUse(source.item);
    },
  }));

  const [, give] = useDrop<DragSource, void, unknown>(() => ({
    accept: 'SLOT',
    drop: (source) => {
      source.inventory === 'player' && onGive(source.item);
    },
  }));

  const handleAmountChange = (value: number) => {
    const newValue = Math.max(0, Math.min(99999, value));
    dispatch(setItemAmount(newValue));
  };

  const inputHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10) || 0;
    handleAmountChange(value);
  };

  return (
    <div className="inventory-control">
      <div className="inventory-control-wrapper">
        <span className="inventory-control-qty-label">QTY</span>
        <button type="button" className="inventory-control-step" onClick={() => handleAmountChange(itemAmount - 1)} aria-label="Decrease amount">
          −
        </button>
        <input
          className="inventory-control-input"
          type="number"
          value={itemAmount || ''}
          onChange={inputHandler}
          min={0}
          max={99999}
          placeholder="Amount"
        />
        <button type="button" className="inventory-control-step" onClick={() => handleAmountChange(itemAmount + 1)} aria-label="Increase amount">
          +
        </button>
        <div className="inventory-control-divider" aria-hidden />
        <button type="button" className="inventory-control-action inventory-control-action--use" ref={use}>
          {Locale.ui_use || 'USE'}
        </button>
        <button type="button" className="inventory-control-action inventory-control-action--give" ref={give}>
          {Locale.ui_give || 'GIVE'}
        </button>
        <button type="button" className="inventory-control-close" onClick={() => fetchNui('exit')} aria-label={Locale.ui_close || 'Close'}>
          ×
        </button>
      </div>
    </div>
  );
};

export default InventoryControl;
