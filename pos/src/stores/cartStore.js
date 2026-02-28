import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  discount: 0,
  notes: '',
  customerName: '',
  customerPhone: '',
  unitLembagaId: '',
  paymentType: 'CASH',
  paidAmount: 0,

  addItem: (product) => {
    const { items } = get();
    const existing = items.find((i) => i.productId === product.id);

    if (existing) {
      set({
        items: items.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            productId: product.id,
            product,
            quantity: 1,
            unitPrice: parseFloat(product.sellPrice) || 0,
            unitId: product.unitId || null,
            unitName: product.unitOfMeasure?.abbreviation || product.unit || 'pcs',
          },
        ],
      });
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity < 1) return;
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      ),
    });
  },

  updateUnitPrice: (productId, unitPrice) => {
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, unitPrice } : i
      ),
    });
  },

  setDiscount: (discount) => set({ discount }),
  setNotes: (notes) => set({ notes }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setUnitLembagaId: (unitLembagaId) => set({ unitLembagaId }),
  setPaymentType: (paymentType) => set({ paymentType }),
  setPaidAmount: (paidAmount) => set({ paidAmount }),

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal();
    return Math.max(0, subtotal - get().discount);
  },

  getChange: () => {
    return get().paidAmount - get().getGrandTotal();
  },

  getItemCount: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },

  clearCart: () =>
    set({
      items: [],
      discount: 0,
      notes: '',
      customerName: '',
      customerPhone: '',
      unitLembagaId: '',
      paymentType: 'CASH',
      paidAmount: 0,
    }),
}));

export default useCartStore;
