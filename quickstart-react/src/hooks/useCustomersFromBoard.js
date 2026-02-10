import { useState, useEffect } from "react";
import { getCustomersFromBoard } from "../services/mondayApi";

export function useCustomersFromBoard(monday, modalOpen, crmBoardId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!modalOpen || !monday || !crmBoardId) {
      if (!modalOpen) setCustomers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCustomersFromBoard(monday, crmBoardId)
      .then((list) => {
        if (!cancelled) {
          setCustomers(list || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCustomers([]);
          setLoading(false);
          setError(err?.message || "Failed to load customers.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, monday, crmBoardId]);

  return { customers, loading, error };
}
