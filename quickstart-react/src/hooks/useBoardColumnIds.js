import { useState, useEffect } from "react";
import {
  getBoardColumns,
  mapBoardColumnsForOrder,
} from "../services/mondayApi";

export function useBoardColumnIds(monday, boardId) {
  const [columnIds, setColumnIds] = useState(null);

  useEffect(() => {
    if (!boardId || !monday) {
      setColumnIds(null);
      return;
    }
    let cancelled = false;
    getBoardColumns(monday, boardId)
      .then((cols) => {
        if (!cancelled) setColumnIds(mapBoardColumnsForOrder(cols));
      })
      .catch(() => {
        if (!cancelled) setColumnIds({});
      });
    return () => {
      cancelled = true;
    };
  }, [monday, boardId]);

  return columnIds;
}
