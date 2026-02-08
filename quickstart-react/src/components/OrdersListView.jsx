import React, { useState, useEffect } from "react";
import { Loader, Text } from "@vibe/core";
import { getBoardItems } from "../services/mondayApi";

export function OrdersListView({ monday, boardId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!boardId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBoardItems(monday, boardId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [monday, boardId]);

  if (!boardId) {
    let devOrder = null;
    try {
      const raw = localStorage.getItem("candleOrdersDev");
      if (raw) devOrder = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return (
      <section className="orders-list-view">
        {devOrder ? (
          <>
            <Text type="text2" color="secondary" className="orders-list-view-note">
              Demo: last order submitted when not on a board (not saved to Monday).
            </Text>
            <ul className="orders-list">
              {(devOrder.orderRows || []).map((row, idx) => (
                <li key={idx} className="orders-list-item">
                  <span className="orders-list-item-name">
                    {[devOrder.firstName, devOrder.lastName].filter(Boolean).join(" ") || `Order ${idx + 1}`}
                  </span>
                  <span className="orders-list-item-cols">
                    {(row.values || []).map((v, i) => v?.label ? (
                      <span key={i} className="orders-list-item-col">Candle {i + 1}: {v.label}</span>
                    ) : null)}
                    {row.inscription ? (
                      <span className="orders-list-item-col">Inscription: {row.inscription}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Text type="text2" color="secondary">Open this app on a board to view orders, or submit an order first (without a board) to see it here.</Text>
        )}
      </section>
    );
  }

  if (loading) return <Loader size="medium" />;
  if (error) return <Text type="text2" color="negative">{error}</Text>;

  return (
    <section className="orders-list-view">
      <ul className="orders-list">
        {items.map((item) => (
          <li key={item.id} className="orders-list-item">
            <span className="orders-list-item-name">{item.name}</span>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <Text type="text2" color="secondary">No orders yet.</Text>
      )}
    </section>
  );
}
