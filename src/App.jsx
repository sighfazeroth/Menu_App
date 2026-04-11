import { useState } from "react";

export default function App() {
  const menuItems = [
    { id: 1, name: "Beef Noodles", price: 14.99 },
    { id: 2, name: "Scallion Pancake", price: 6.5 },
    { id: 3, name: "Milk Tea", price: 4.75 },
  ];

  const [cart, setCart] = useState([]);

  function addToCart(item) {
    setCart((current) => {
      const existing = current.find((i) => i.id === item.id);

      if (existing) {
        return current.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      return [...current, { ...item, quantity: 1 }];
    });
  }

  function changeQuantity(id, delta) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Menu App</h1>

      <h2>Menu</h2>
      {menuItems.map((item) => (
        <div key={item.id} style={{ marginBottom: "10px" }}>
          {item.name} - ${item.price}
          <button
            onClick={() => addToCart(item)}
            style={{ marginLeft: "10px" }}
          >
            Add
          </button>
        </div>
      ))}

      <h2>Cart</h2>
      {cart.length === 0 ? (
        <p>No items yet</p>
      ) : (
        <>
          {cart.map((item) => (
            <div key={item.id} style={{ marginBottom: "10px" }}>
              {item.name} - ${item.price} × {item.quantity}
              <button
                onClick={() => changeQuantity(item.id, -1)}
                style={{ marginLeft: "10px" }}
              >
                -
              </button>
              <button
                onClick={() => changeQuantity(item.id, 1)}
                style={{ marginLeft: "5px" }}
              >
                +
              </button>
            </div>
          ))}
          <h3>Total: ${total.toFixed(2)}</h3>
        </>
      )}
    </div>
  );
}