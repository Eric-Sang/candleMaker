import { useState, useEffect, useCallback } from "react";
import { getOrdersWithStatusCreated } from "../services/mondayApi";

export function useOrdersWithStatusCreated(monday, boardId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!boardId || !monday) {
      setLoading(false);
      setOrders([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrdersWithStatusCreated(monday, boardId)
      .then((data) => {
        if (!cancelled) setOrders(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [monday, boardId]);

  const refetch = useCallback(() => {
    if (!monday || !boardId) return;
    getOrdersWithStatusCreated(monday, boardId)
      .then((data) => setOrders(data ?? []))
      .catch(() => {});
  }, [monday, boardId]);

  return { orders, loading, error, refetch };
}
