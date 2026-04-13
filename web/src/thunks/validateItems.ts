import { createAsyncThunk } from '@reduxjs/toolkit';
import { setContainerWeight } from '../store/inventory';
import { fetchNui } from '../utils/fetchNui';

export const validateMove = createAsyncThunk(
  'inventory/validateMove',
  async (
    data: {
      fromSlot: number;
      fromType: string;
      toSlot: number;
      toType: string;
      count: number;
      /** Client plays armour equip progress before swap (parity with “Use”). */
      armourVestEquip?: boolean;
      /** Drag body armour out of the utility vest slot. */
      armourVestRemove?: boolean;
      armourItemName?: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await fetchNui<boolean | number>('swapItems', data);

      if (response === false) return rejectWithValue(response);

      if (typeof response === 'number') dispatch(setContainerWeight(response));
    } catch (error) {
      return rejectWithValue(false);
    }
  }
);
