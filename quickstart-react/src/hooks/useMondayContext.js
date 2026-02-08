import { useState, useEffect } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

/**
 * Hook to access Monday context (board, user, etc.) and the SDK instance for API calls.
 * @returns {{ context: object | undefined, monday: object, boardId: string | undefined, userId: string | undefined }}
 */
export function useMondayContext() {
  const [context, setContext] = useState();

  useEffect(() => {
    monday.execute("valueCreatedForUser");
    monday.listen("context", (res) => {
      setContext(res.data);
    });
  }, []);

  const boardId = context?.boardId ?? context?.board?.id;
  const userId = context?.user?.id;

  return { context, monday, boardId, userId };
}
