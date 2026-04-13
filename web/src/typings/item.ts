export type ItemData = {
  name: string;
  label: string;
  stack: boolean;
  usable: boolean;
  close: boolean;
  count: number;
  /** Grams per unit (optional; used for UI) */
  weight?: number;
  /** Shop category tab (optional) */
  category?: string;
  description?: string;
  buttons?: string[];
  ammoName?: string;
  image?: string;
};
