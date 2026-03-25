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

  // Calculate total base qty used by a product across all units in cart
  getBaseQtyByProduct: (productId) => {
    return get().items
      .filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity * (i.conversionFactor || 1), 0);
  },

  addItem: (product, unitInfo) => {
    const { items } = get();
    const unitId = unitInfo?.unitId ?? product.unitId ?? null;
    const unitName = unitInfo?.unitName ?? product.unitOfMeasure?.abbreviation ?? product.unit ?? 'pcs';
    const unitPrice = unitInfo?.unitPrice ?? parseFloat(product.sellPrice) ?? 0;
    const conversionFactor = unitInfo?.conversionFactor ?? 1;

    // Check stock: calculate total base qty of this product in cart + new item
    const currentBaseQty = get().getBaseQtyByProduct(product.id);
    const newItemBaseQty = conversionFactor;
    const stock = product.stock || 0;

    if (currentBaseQty + newItemBaseQty > stock) {
      return { error: true, stock, currentBaseQty };
    }

    // Match by productId + unitId to allow same product with different units
    const cartKey = `${product.id}_${unitId || 'base'}`;
    const existing = items.find((i) => i.cartKey === cartKey);

    if (existing) {
      // Also validate increment
      const afterBaseQty = currentBaseQty + conversionFactor;
      if (afterBaseQty > stock) {
        return { error: true, stock, currentBaseQty };
      }
      set({
        items: items.map((i) =>
          i.cartKey === cartKey
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            cartKey,
            productId: product.id,
            product,
            quantity: 1,
            unitPrice,
            unitId,
            unitName,
            conversionFactor,
          },
        ],
      });
    }
    return { error: false };
  },

  removeItem: (cartKey) => {
    set({ items: get().items.filter((i) => i.cartKey !== cartKey) });
  },

  updateQuantity: (cartKey, quantity) => {
    if (quantity < 1) return;
    set({
      items: get().items.map((i) =>
        i.cartKey === cartKey ? { ...i, quantity } : i
      ),
    });
  },

  updateUnitPrice: (cartKey, unitPrice) => {
    set({
      items: get().items.map((i) =>
        i.cartKey === cartKey ? { ...i, unitPrice } : i
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
