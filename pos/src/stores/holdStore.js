import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useHoldStore = create(
  persist(
    (set, get) => ({
      holds: [],

      addHold: (cartData) => {
        const hold = {
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          items: cartData.items,
          discount: cartData.discount || 0,
          notes: cartData.notes || '',
          customerName: cartData.customerName || '',
          subtotal: cartData.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
          itemCount: cartData.items.reduce((sum, i) => sum + i.quantity, 0),
        };
        set({ holds: [hold, ...get().holds] });
      },

      removeHold: (holdId) => {
        set({ holds: get().holds.filter((h) => h.id !== holdId) });
      },

      getHold: (holdId) => {
        return get().holds.find((h) => h.id === holdId);
      },

      clearAllHolds: () => set({ holds: [] }),
    }),
    {
      name: 'pos-hold-storage',
    }
  )
);

export default useHoldStore;
