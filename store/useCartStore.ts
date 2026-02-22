import { create } from 'zustand';

interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartStore {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: [],
  
  addToCart: (product) => {
    const currentCart = get().cart;
    const isExist = currentCart.find((item) => item.id === product.id);

    if (isExist) {
      set({
        cart: currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ),
      });
    } else {
      set({ cart: [...currentCart, { ...product, quantity: 1 }] });
    }
  },

  removeFromCart: (id) => {
    set({ cart: get().cart.filter((item) => item.id !== id) });
  },

  clearCart: () => set({ cart: [] }),

  totalPrice: () => {
    return get().cart.reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));