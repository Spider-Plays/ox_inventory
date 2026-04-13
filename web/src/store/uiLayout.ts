import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '.';

export type UtilitySlotConfig = { vest: number; backpack: number; phone: number; cash: number } | null;

type UiLayoutState = {
  utilitySlots: UtilitySlotConfig;
};

const initialState: UiLayoutState = {
  utilitySlots: null,
};

export const uiLayoutSlice = createSlice({
  name: 'uiLayout',
  initialState,
  reducers: {
    setUtilitySlots: (state, action: PayloadAction<UtilitySlotConfig>) => {
      state.utilitySlots = action.payload;
    },
  },
});

export const { setUtilitySlots } = uiLayoutSlice.actions;
export const selectUtilitySlots = (state: RootState) => state.uiLayout.utilitySlots;
export default uiLayoutSlice.reducer;
