import { useState, useEffect } from "react";
import {
  getCandleOptionsFromBoard,
  CANDLES_BOARD_ID,
} from "../services/mondayApi";

/** Returns { options, source } where source is "idle" | "loading" | "board" | "empty" | "error" | "no-board". */
export function useCandleOptions(monday) {
  const [options, setOptions] = useState([]);
  const [source, setSource] = useState("idle");

  useEffect(() => {
    if (!monday) return;
    if (!CANDLES_BOARD_ID) {
      setOptions([]);
      setSource("no-board");
      return;
    }
    let cancelled = false;
    setSource("loading");
    getCandleOptionsFromBoard(monday, CANDLES_BOARD_ID)
      .then((opts) => {
        if (cancelled) return;
        setOptions(opts || []);
        setSource(opts?.length ? "board" : "empty");
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setSource("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [monday]);

  return { options, source };
}
