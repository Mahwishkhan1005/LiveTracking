import React, { createContext, ReactNode, useContext, useState } from 'react';

// Define the shape of a Cart Item
interface CartItem {
  pid: number | string;
  pname: string;
  price: number;
  photo: string;
  quantity: number;
}

// Define the Context properties
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (pid: number | string) => void;
  updateQuantity: (pid: number | string, amount: number) => void;
  clearCart: () => void;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (product: any) => {
    setCartItems((prev) => {
      const existingItem = prev.find(item => item.pid === product.pid);
      if (existingItem) {
        return prev.map(item =>
          item.pid === product.pid ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (pid: number | string) => {
    setCartItems((prev) => prev.filter(item => item.pid !== pid));
  };

  const updateQuantity = (pid: number | string, amount: number) => {
    setCartItems((prev) =>
      prev.map(item =>
        item.pid === pid ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item
      )
    );
  };

  const clearCart = () => setCartItems([]);

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, cartTotal, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};