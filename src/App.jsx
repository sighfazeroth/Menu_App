import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);

  const chefStarImage = "/images/ChefStar.png";

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await fetch("/Menu.csv");
        const csvText = await response.text();

        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
        });

        const normalized = parsed.data.map((row) => ({
          id: Number(row.Dish_ID) || 0,
          name: row.Name?.trim() || "",
          cuisine: row.Cuisine?.trim() || "",
          tags: row.Tag
            ? row.Tag.split("|").map((tag) => tag.trim()).filter(Boolean)
            : [],
          chefRecommend:
            String(row.Chef_Recommend).trim().toUpperCase() === "TRUE",
          price: Number(row.Price) || 0,
          description: row.Description?.trim() || "",
          image: row.Image?.trim() || "",
        }));

        setMenuItems(normalized);
      } catch (error) {
        console.error("Failed to load Menu.csv:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  const cuisines = useMemo(() => {
    return [...new Set(menuItems.map((item) => item.cuisine))].sort();
  }, [menuItems]);

  const tags = useMemo(() => {
    return [...new Set(menuItems.flatMap((item) => item.tags))].sort();
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const cuisineMatch =
        !selectedCuisine || item.cuisine === selectedCuisine;
      const tagMatch = !selectedTag || item.tags.includes(selectedTag);
      return cuisineMatch && tagMatch;
    });
  }, [menuItems, selectedCuisine, selectedTag]);

  function addToCart(item) {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id);

      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
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

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          fontFamily: "Arial, sans-serif",
          color: "#000",
        }}
      >
        Loading menu...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        background: "#f7f4ef",
        color: "#222",
      }}
    >
      <div
        style={{
          height: "72px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid #ddd",
          background: "#fff",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#000",
            fontSize: "36px",
            fontWeight: "700",
            letterSpacing: "2px",
          }}
        >
          风满楼
        </h1>

        <button
          onClick={() => setShowCart(!showCart)}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid #333",
            background: "#fff",
            cursor: "pointer",
            fontWeight: "600",
            color: "#000",
          }}
        >
          Cart ({totalQuantity})
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 210px 1fr",
          height: "calc(100vh - 72px)",
        }}
      >
        <div
          style={{
            borderRight: "1px solid #ddd",
            padding: "18px 12px",
            overflowY: "auto",
            background: "#fff",
            color: "#000",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#5e7089",
              fontSize: "18px",
            }}
          >
            Cuisine
          </h3>

          <button
            onClick={() => setSelectedCuisine("")}
            style={{
              display: "block",
              width: "100%",
              marginBottom: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #bbb",
              background: selectedCuisine === "" ? "#ece5da" : "#fff",
              cursor: "pointer",
              textAlign: "left",
              fontWeight: "600",
              color: "#000",
            }}
          >
            All
          </button>

          {cuisines.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => setSelectedCuisine(cuisine)}
              style={{
                display: "block",
                width: "100%",
                marginBottom: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #bbb",
                background:
                  selectedCuisine === cuisine ? "#ece5da" : "#fff",
                cursor: "pointer",
                textAlign: "left",
                color: "#000",
              }}
            >
              {cuisine}
            </button>
          ))}
        </div>

        <div
          style={{
            borderRight: "1px solid #ddd",
            padding: "18px 12px",
            overflowY: "auto",
            background: "#fff",
            color: "#000",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#5e7089",
              fontSize: "18px",
            }}
          >
            Tag
          </h3>

          <button
            onClick={() => setSelectedTag("")}
            style={{
              display: "block",
              width: "100%",
              marginBottom: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #bbb",
              background: selectedTag === "" ? "#ece5da" : "#fff",
              cursor: "pointer",
              textAlign: "left",
              fontWeight: "600",
              color: "#000",
            }}
          >
            All
          </button>

          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                display: "block",
                width: "100%",
                marginBottom: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #bbb",
                background: selectedTag === tag ? "#ece5da" : "#fff",
                cursor: "pointer",
                textAlign: "left",
                color: "#000",
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              marginBottom: "20px",
              textAlign: "center",
              color: "#7b8798",
              fontSize: "18px",
            }}
          >
            Selected: {selectedCuisine || "All Cuisines"} /{" "}
            {selectedTag || "All Tags"}
          </div>

          {filteredItems.length === 0 ? (
            <p style={{ color: "#000" }}>No dishes found.</p>
          ) : (
            filteredItems.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
              const quantity = cartItem ? cartItem.quantity : 0;

              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "260px 1fr",
                    gap: "20px",
                    background: "#fff",
                    border: "1px solid #d7d2ca",
                    borderRadius: "16px",
                    padding: "16px",
                    marginBottom: "20px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    alignItems: "start",
                  }}
                >
                  <div>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "180px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        background: "#eee",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.background = "#ddd";
                      }}
                    />
                  </div>

                  <div
                    style={{
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          textAlign: "left",
                          flex: 1,
                        }}
                      >
                        <h2
                          style={{
                            margin: "0 0 6px 0",
                            color: "#000",
                            fontWeight: "700",
                            fontSize: "28px",
                            textAlign: "left",
                          }}
                        >
                          {item.name}
                        </h2>

                        <div
                          style={{
                            color: "#000",
                            marginBottom: "8px",
                            fontSize: "15px",
                            fontWeight: "500",
                            textAlign: "left",
                          }}
                        >
                          {item.cuisine}
                        </div>

                        <div
                          style={{
                            fontSize: "14px",
                            color: "#000",
                            marginBottom: "14px",
                            textAlign: "left",
                          }}
                        >
                          {item.tags.join(" · ")}
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                          minWidth: "110px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "700",
                            fontSize: "20px",
                            color: "#7b8798",
                          }}
                        >
                          ${item.price.toFixed(2)}
                        </div>

                        {item.chefRecommend && (
                          <div style={{ marginTop: "8px" }}>
                            <img
                              src={chefStarImage}
                              alt="Chef Recommend"
                              style={{
                                width: "28px",
                                height: "28px",
                                objectFit: "contain",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <p
                      style={{
                        margin: "0 0 16px 0",
                        lineHeight: 1.7,
                        color: "#777",
                        fontSize: "15px",
                        fontStyle: "italic",
                        textAlign: "left",
                      }}
                    >
                      {item.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() => changeQuantity(item.id, -1)}
                        disabled={quantity === 0}
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "4px",
                          border: "1px solid #555",
                          background: quantity === 0 ? "#ddd" : "#555",
                          color: "#fff",
                          cursor: quantity === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        -
                      </button>

                      <span
                        style={{
                          minWidth: "20px",
                          textAlign: "center",
                          color: "#555",
                          fontWeight: "600",
                        }}
                      >
                        {quantity}
                      </span>

                      <button
                        onClick={() => addToCart(item)}
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "4px",
                          border: "1px solid #555",
                          background: "#555",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showCart && (
        <div
          style={{
            position: "fixed",
            top: 72,
            right: 0,
            width: "340px",
            height: "calc(100vh - 72px)",
            background: "#fff",
            borderLeft: "1px solid #ddd",
            padding: "16px",
            overflowY: "auto",
            boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
            color: "#000",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ margin: 0, color: "#000" }}>Cart</h2>
            <button
              onClick={() => setShowCart(false)}
              style={{
                border: "1px solid #999",
                background: "#fff",
                borderRadius: "6px",
                padding: "6px 10px",
                cursor: "pointer",
                color: "#000",
              }}
            >
              Close
            </button>
          </div>

          {cart.length === 0 ? (
            <p style={{ color: "#000" }}>Your cart is empty.</p>
          ) : (
            <>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    marginBottom: "14px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "700",
                      color: "#000",
                      marginBottom: "4px",
                    }}
                  >
                    {item.name}
                  </div>

                  <div
                    style={{
                      color: "#555",
                      marginBottom: "8px",
                    }}
                  >
                    ${item.price.toFixed(2)} × {item.quantity}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => changeQuantity(item.id, -1)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "4px",
                        border: "1px solid #555",
                        background: "#555",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      -
                    </button>

                    <button
                      onClick={() => changeQuantity(item.id, 1)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "4px",
                        border: "1px solid #555",
                        background: "#555",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <h3 style={{ color: "#000" }}>Total: ${totalPrice.toFixed(2)}</h3>
            </>
          )}
        </div>
      )}
    </div>
  );
}