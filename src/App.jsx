import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import emailjs from "@emailjs/browser";

export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [clientList, setClientList] = useState([]);

  const [hasEntered, setHasEntered] = useState(false);

  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const [invitationCodeInput, setInvitationCodeInput] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [matchedCustomerName, setMatchedCustomerName] = useState("");
  const [cartValidationMessage, setCartValidationMessage] = useState("");

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const chefStarImage = "/images/ChefStar.png";
  const mainBackgroundImage = "/images/Main.png";

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1100;

  useEffect(() => {
    async function loadAllData() {
      try {
        const [menuResponse, clientResponse] = await Promise.all([
          fetch("/Menu.csv"),
          fetch("/Client_List.csv"),
        ]);

        const [menuCsvText, clientCsvText] = await Promise.all([
          menuResponse.text(),
          clientResponse.text(),
        ]);

        const parsedMenu = Papa.parse(menuCsvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
        });

        const normalizedMenu = parsedMenu.data.map((row) => ({
          id: Number(row.Dish_ID) || 0,
          name: row.Name?.trim() || "",
          cuisine: row.Cuisine?.trim() || "",
          ingredient: row.Ingredient?.trim() || "",
          tags: row.Tag
            ? row.Tag.split("|").map((tag) => tag.trim()).filter(Boolean)
            : [],
          chefRecommend:
            String(row.Chef_Recommend).trim().toUpperCase() === "TRUE",
          price: Number(row.Price) || 0,
          description: row.Description?.trim() || "",
          image: row.Image?.trim() || "",
        }));

        const parsedClients = Papa.parse(clientCsvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
        });

        const normalizedClients = parsedClients.data.map((row) => ({
          invitationCode: String(row.Invitation_Code || "").trim(),
          clientName: String(row.Client_Name || "").trim(),
        }));

        setMenuItems(normalizedMenu);
        setClientList(normalizedClients);
      } catch (error) {
        console.error("Failed to load CSV files:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, []);

  const cuisines = useMemo(() => {
    return [...new Set(menuItems.map((item) => item.cuisine).filter(Boolean))].sort();
  }, [menuItems]);

  const ingredients = useMemo(() => {
    return [...new Set(menuItems.map((item) => item.ingredient).filter(Boolean))].sort();
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const cuisineMatch =
        !selectedCuisine || item.cuisine === selectedCuisine;
      const ingredientMatch =
        !selectedIngredient || item.ingredient === selectedIngredient;
      return cuisineMatch && ingredientMatch;
    });
  }, [menuItems, selectedCuisine, selectedIngredient]);

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

  function isValidDateMMDDYYYY(value) {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    return regex.test(value);
  }

  function validateOrderAccess() {
    const cleanCode = invitationCodeInput.trim();
    const cleanDate = orderDate.trim();

    if (!cleanCode) {
      setCartValidationMessage("Please enter invitation code.");
      setMatchedCustomerName("");
      return null;
    }

    if (!isValidDateMMDDYYYY(cleanDate)) {
      setCartValidationMessage("Please enter date in mm/dd/yyyy format.");
      setMatchedCustomerName("");
      return null;
    }

    const matchedClient = clientList.find(
      (row) => row.invitationCode === cleanCode
    );

    if (!matchedClient) {
      setCartValidationMessage("Wrong Code");
      setMatchedCustomerName("");
      return null;
    }

    setCartValidationMessage("");
    setMatchedCustomerName(matchedClient.clientName);
    return matchedClient.clientName;
  }

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function submitOrder() {
    if (cart.length === 0) {
      setSubmitMessage("Cart is empty.");
      return;
    }

    const customerName = validateOrderAccess();
    if (!customerName) {
      setSubmitMessage("");
      return;
    }

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setSubmitMessage("Missing EmailJS configuration.");
      return;
    }

    const orderText = cart
      .map((item) => `${item.name} | Qty: ${item.quantity}`)
      .join("\n");

    const templateParams = {
      customer_name: customerName,
      invitation_code: invitationCodeInput.trim(),
      order_date: orderDate.trim(),
      order_text: orderText,
      total_quantity: totalQuantity,
      total: `$${totalPrice.toFixed(2)}`,
      email: "tplentertainment@gmail.com",
    };

    try {
      setSubmittingOrder(true);
      setSubmitMessage("");

      await emailjs.send(serviceId, templateId, templateParams, publicKey);

      setSubmitMessage("Order submitted successfully.");
      setCart([]);
    } catch (error) {
      console.error("Email send failed:", error);
      setSubmitMessage("Failed to submit order.");
    } finally {
      setSubmittingOrder(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", fontFamily: "Arial, sans-serif", color: "#000" }}>
        Loading menu...
      </div>
    );
  }

  if (!hasEntered) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundImage: `url(${mainBackgroundImage})`,
          backgroundSize: "contain",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#000",
          position: "relative",
          fontFamily: "Arial, sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            zIndex: 2,
          }}
        >
          <button
            onClick={() => setHasEntered(true)}
            style={{
              padding: "12px 22px",
              borderRadius: "10px",
              border: "1px solid #222",
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              fontWeight: "700",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Enter
          </button>
        </div>
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
          padding: isMobile ? "0 12px" : "0 20px",
          borderBottom: "1px solid #ddd",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#000",
            fontSize: isMobile ? "26px" : "36px",
            fontWeight: "700",
            letterSpacing: isMobile ? "1px" : "2px",
          }}
        >
          ChezTonini
        </h1>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setHasEntered(false)}
            style={{
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "8px",
              border: "1px solid #333",
              background: "#fff",
              cursor: "pointer",
              fontWeight: "600",
              color: "#000",
              fontSize: isMobile ? "13px" : "14px",
            }}
          >
            Home
          </button>

          <button
            onClick={() => setShowCart(!showCart)}
            style={{
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "8px",
              border: "1px solid #333",
              background: "#fff",
              cursor: "pointer",
              fontWeight: "600",
              color: "#000",
              fontSize: isMobile ? "13px" : "14px",
            }}
          >
            Cart ({totalQuantity})
          </button>
        </div>
      </div>

      <div
        style={{
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: isTablet ? "110px 130px 1fr" : "100px 120px 1fr",
          height: isMobile ? "auto" : "calc(100vh - 72px)",
        }}
      >
        <div
          style={{
            borderRight: isMobile ? "none" : "1px solid #ddd",
            borderBottom: isMobile ? "1px solid #ddd" : "none",
            padding: "14px 8px",
            overflowY: isMobile ? "visible" : "auto",
            overflowX: isMobile ? "auto" : "visible",
            background: "#fff",
            color: "#000",
            whiteSpace: isMobile ? "nowrap" : "normal",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#5e7089", fontSize: "18px" }}>
            Cuisine
          </h3>

          <div style={{ display: isMobile ? "flex" : "block", gap: "8px" }}>
            <button
              onClick={() => setSelectedCuisine("")}
              style={filterButtonStyle(selectedCuisine === "", isMobile)}
            >
              All
            </button>

            {cuisines.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                style={filterButtonStyle(selectedCuisine === cuisine, isMobile)}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            borderRight: isMobile ? "none" : "1px solid #ddd",
            borderBottom: isMobile ? "1px solid #ddd" : "none",
            padding: "14px 8px",
            overflowY: isMobile ? "visible" : "auto",
            overflowX: isMobile ? "auto" : "visible",
            background: "#fff",
            color: "#000",
            whiteSpace: isMobile ? "nowrap" : "normal",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#5e7089", fontSize: "18px" }}>
            Ingredient
          </h3>

          <div style={{ display: isMobile ? "flex" : "block", gap: "8px" }}>
            <button
              onClick={() => setSelectedIngredient("")}
              style={filterButtonStyle(selectedIngredient === "", isMobile)}
            >
              All
            </button>

            {ingredients.map((ingredient) => (
              <button
                key={ingredient}
                onClick={() => setSelectedIngredient(ingredient)}
                style={filterButtonStyle(selectedIngredient === ingredient, isMobile)}
              >
                {ingredient}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: isMobile ? "12px" : "20px",
            overflowY: isMobile ? "visible" : "auto",
          }}
        >
          <div
            style={{
              marginBottom: "12px",
              textAlign: "center",
              color: "#7b8798",
              fontSize: isMobile ? "15px" : "18px",
            }}
          >
            Selected: {selectedCuisine || "All Cuisines"} /{" "}
            {selectedIngredient || "All Ingredients"}
          </div>

          {matchedCustomerName && (
            <div
              style={{
                marginBottom: "18px",
                textAlign: "center",
                color: "#555",
                fontSize: "14px",
              }}
            >
              Client: <strong>{matchedCustomerName}</strong> | Date:{" "}
              <strong>{orderDate}</strong>
            </div>
          )}

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
                    gridTemplateColumns: isMobile ? "1fr" : "220px 1fr",
                    gap: "16px",
                    background: "#fff",
                    border: "1px solid #d7d2ca",
                    borderRadius: "16px",
                    padding: "16px",
                    marginBottom: "18px",
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
                        height: isMobile ? "200px" : "180px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        background: "#eee",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.background = "#ddd";
                      }}
                    />
                  </div>

                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ textAlign: "left", flex: 1 }}>
                        <h2
                          style={{
                            margin: "0 0 6px 0",
                            color: "#000",
                            fontWeight: "700",
                            fontSize: isMobile ? "24px" : "28px",
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
                            lineHeight: 1.5,
                          }}
                        >
                          {item.tags.join(" · ")}
                        </div>
                      </div>

                      {item.chefRecommend && (
                        <div style={{ marginTop: "4px" }}>
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
                        style={qtyButtonStyle(quantity === 0)}
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
                        style={qtyButtonStyle(false)}
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
            top: isMobile ? 0 : 72,
            right: 0,
            width: isMobile ? "100vw" : "360px",
            height: isMobile ? "100vh" : "calc(100vh - 72px)",
            background: "#fff",
            borderLeft: isMobile ? "none" : "1px solid #ddd",
            padding: "16px",
            overflowY: "auto",
            boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
            color: "#000",
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              position: "sticky",
              top: 0,
              background: "#fff",
              paddingBottom: "8px",
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
                    Qty: {item.quantity}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => changeQuantity(item.id, -1)}
                      style={cartButtonMiniStyle()}
                    >
                      -
                    </button>

                    <button
                      onClick={() => changeQuantity(item.id, 1)}
                      style={cartButtonMiniStyle()}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px 12px",
                  background: "#f7f4ef",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  color: "#000",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "600",
                    }}
                  >
                    Invitation Code
                  </label>
                  <input
                    type="text"
                    value={invitationCodeInput}
                    onChange={(e) => setInvitationCodeInput(e.target.value)}
                    style={cartInputStyle()}
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "600",
                    }}
                  >
                    Date
                  </label>
                  <input
                    type="text"
                    placeholder="mm/dd/yyyy"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    style={cartInputStyle()}
                  />
                </div>

                <button
                  onClick={validateOrderAccess}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    background: "#fff",
                    color: "#000",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Validate
                </button>

                {matchedCustomerName && (
                  <div style={{ marginTop: "10px", color: "#000" }}>
                    Client: <strong>{matchedCustomerName}</strong>
                  </div>
                )}

                {cartValidationMessage && (
                  <div
                    style={{
                      marginTop: "10px",
                      color: "#b00020",
                      fontWeight: "600",
                    }}
                  >
                    {cartValidationMessage}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "20px" }}>
                <button
                  onClick={submitOrder}
                  disabled={submittingOrder}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    background: submittingOrder ? "#ddd" : "#222",
                    color: "#fff",
                    fontWeight: "700",
                    cursor: submittingOrder ? "not-allowed" : "pointer",
                  }}
                >
                  {submittingOrder ? "Submitting..." : "Submit Order"}
                </button>

                {submitMessage && (
                  <p
                    style={{
                      marginTop: "10px",
                      color: "#555",
                      fontSize: "14px",
                    }}
                  >
                    {submitMessage}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function filterButtonStyle(active, isMobile) {
  return {
    display: isMobile ? "inline-block" : "block",
    width: isMobile ? "auto" : "100%",
    marginBottom: isMobile ? 0 : "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #bbb",
    background: active ? "#ece5da" : "#fff",
    cursor: "pointer",
    textAlign: "left",
    fontWeight: active ? "600" : "400",
    color: "#000",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}

function qtyButtonStyle(disabled) {
  return {
    width: "30px",
    height: "30px",
    borderRadius: "4px",
    border: "1px solid #555",
    background: disabled ? "#ddd" : "#555",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function cartButtonMiniStyle() {
  return {
    width: "28px",
    height: "28px",
    borderRadius: "4px",
    border: "1px solid #555",
    background: "#555",
    color: "#fff",
    cursor: "pointer",
  };
}

function cartInputStyle() {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #bbb",
    fontSize: "14px",
    boxSizing: "border-box",
    color: "#000",
    background: "#fff",
  };
}