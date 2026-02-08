/**
 * Monday.com API helpers. All monday.api calls go through here.
 * Functions accept the monday SDK instance (from useMondayContext).
 */

const _raw =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_CANDLES_BOARD_ID) ||
  "";
export const CANDLES_BOARD_ID =
  (typeof _raw === "string" ? _raw.trim() : _raw) || null;

const _crmRaw =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_CRM_BOARD_ID) ||
  "";
export const CRM_BOARD_ID =
  (typeof _crmRaw === "string" ? _crmRaw.trim() : _crmRaw) || null;

/** Column title → id mapping. Your board should have columns with these exact titles for create order to work. */
export const ORDER_COLUMN_TITLES = {
  CUSTOMER_NAME: "Customer name",
  ORDER_NUMBER: "Order Number",
  FIRST_NAME: "First name",
  LAST_NAME: "Last name",
  CANDLE_1: "Candle 1",
  CANDLE_2: "Candle 2",
  CANDLE_3: "Candle 3",
  INSCRIPTION: "Inscription",
  LAST_UPDATE_DATE: "Last Update Date",
  STATUS: "Status",
};

/** CRM (Contacts) board column titles – used when adding a new customer to the CRM. */
const CRM_COLUMN_TITLES = {
  CONTACT: "Contact",
  FIRST_NAME: "First name",
  LAST_NAME: "Last name",
};

export async function getCandleOptionsFromBoard(monday, boardId) {
  if (!monday || !boardId) return [];
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 200) {
          items { id name }
        }
      }
    }
  `;
  const res = await monday.api(query, { variables: { boardId } });
  const board = res?.data?.boards?.[0];
  const items = board?.items_page?.items ?? [];
  return items
    .filter((item) => item.name != null && String(item.name).trim() !== "")
    .map((item) => ({ value: item.name, label: item.name }));
}

export async function getBoardColumns(monday, boardId) {
  if (!boardId) return [];
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns { id title type }
      }
    }
  `;
  const res = await monday.api(query, { variables: { boardId } });
  const board = res?.data?.boards?.[0];
  return board?.columns ?? [];
}

function buildOrderLineColumnValues(columnIds, payload) {
  const values = {};
  const customerName = [payload.firstName, payload.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (columnIds.customerName && customerName)
    values[columnIds.customerName] = customerName;
  if (columnIds.orderNumber && payload.orderNumber)
    values[columnIds.orderNumber] = payload.orderNumber;
  const first = (payload.firstName || "").trim();
  if (columnIds.firstName && first !== "") values[columnIds.firstName] = first;
  const last = (payload.lastName || "").trim();
  if (columnIds.lastName && last !== "") values[columnIds.lastName] = last;
  if (columnIds.option1 && payload.option1)
    values[columnIds.option1] = { labels: [payload.option1] };
  if (columnIds.option2 && payload.option2)
    values[columnIds.option2] = { labels: [payload.option2] };
  if (columnIds.option3 && payload.option3)
    values[columnIds.option3] = { labels: [payload.option3] };
  const inscription = (payload.inscription || "").trim();
  if (columnIds.inscription && inscription !== "")
    values[columnIds.inscription] = inscription;
  if (columnIds.lastUpdateDate && payload.lastUpdateDate) {
    values[columnIds.lastUpdateDate] = payload.lastUpdateDate;
  }
  if (columnIds.status) {
    values[columnIds.status] = { labels: ["Created"] };
  }
  return values;
}

function formatMondayDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dateStr = d.toISOString().slice(0, 10);
  const timeStr = d.toTimeString().slice(0, 8);
  return { date: dateStr, time: timeStr };
}

/**
 * Create Monday items for a full order (one item per order line).
 * Generates one Order Number per submission and sets Status = "Created" and Last Update Date = creation time
 * on every row so you can group by order and see creation date.
 */
export async function createOrderItems(
  monday,
  boardId,
  columnIds,
  firstName,
  lastName,
  orderRows
) {
  const ids = Object.values(columnIds).filter(Boolean);
  if (!boardId || ids.length === 0 || orderRows.length === 0) {
    throw new Error("Missing board, column mapping, or order rows");
  }
  const orderNumber = `ORD-${Date.now()}`;
  const createdAt = new Date();
  const lastUpdateDateValue = formatMondayDate(createdAt);
  const created = [];
  for (let i = 0; i < orderRows.length; i++) {
    const row = orderRows[i];
    const itemName =
      [firstName, lastName].filter(Boolean).join(" ") +
        (orderRows.length > 1 ? ` - Line ${i + 1}` : "") || `Order ${i + 1}`;
    const columnValues = buildOrderLineColumnValues(columnIds, {
      firstName,
      lastName,
      orderNumber,
      lastUpdateDate: lastUpdateDateValue,
      option1: row.values[0]?.label ?? null,
      option2: row.values[1]?.label ?? null,
      option3: row.values[2]?.label ?? null,
      inscription: row.inscription ?? "",
    });
    const item = await createItem(monday, boardId, itemName, columnValues);
    if (item?.id) created.push(item);
  }
  return created;
}

export function mapBoardColumnsForOrder(columns) {
  const titles = ORDER_COLUMN_TITLES;
  const byTitle = {};
  columns.forEach((col) => {
    byTitle[col.title] = col.id;
  });
  return {
    customerName: byTitle[titles.CUSTOMER_NAME],
    orderNumber: byTitle[titles.ORDER_NUMBER],
    firstName: byTitle[titles.FIRST_NAME],
    lastName: byTitle[titles.LAST_NAME],
    option1: byTitle[titles.CANDLE_1],
    option2: byTitle[titles.CANDLE_2],
    option3: byTitle[titles.CANDLE_3],
    inscription: byTitle[titles.INSCRIPTION],
    lastUpdateDate: byTitle[titles.LAST_UPDATE_DATE],
    status: byTitle[titles.STATUS],
  };
}

export async function addCustomerToCrmBoard(
  monday,
  crmBoardId,
  firstName,
  lastName
) {
  if (!monday || !crmBoardId) return null;
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  const fullName = [first, last].filter(Boolean).join(" ") || "New contact";
  const columns = await getBoardColumns(monday, crmBoardId);
  const byTitle = {};
  columns.forEach((col) => {
    byTitle[col.title] = col.id;
  });
  const contactColId = byTitle[CRM_COLUMN_TITLES.CONTACT];
  const firstNameColId = byTitle[CRM_COLUMN_TITLES.FIRST_NAME];
  const lastNameColId = byTitle[CRM_COLUMN_TITLES.LAST_NAME];
  const columnValues = {};
  if (contactColId) columnValues[contactColId] = fullName;
  if (firstNameColId && first) columnValues[firstNameColId] = first;
  if (lastNameColId && last) columnValues[lastNameColId] = last;
  const item = await createItem(monday, crmBoardId, fullName, columnValues);
  return item ?? null;
}

export async function getBoardItems(monday, boardId) {
  if (!boardId) return [];
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns { id title }
        items_page(limit: 100) {
          items {
            id
            name
            column_values {
              id
              text
              value
              type
            }
          }
        }
      }
    }
  `;
  const res = await monday.api(query, { variables: { boardId } });
  const board = res?.data?.boards?.[0];
  if (!board) return [];
  const columns = board.columns ?? [];
  const idToTitle = columns.reduce((acc, col) => {
    if (col?.id != null) acc[col.id] = col.title ?? "";
    return acc;
  }, {});
  const items = board?.items_page?.items ?? [];
  return items.map((item) => ({
    ...item,
    column_values: (item.column_values ?? []).map((cv) => ({
      ...cv,
      title: idToTitle[cv.id] ?? cv.id,
    })),
  }));
}

function getCustomerNameFromItem(item) {
  const cols = (item.column_values || []).reduce((acc, cv) => {
    if (cv?.title != null) acc[cv.title] = cv?.text ?? "";
    return acc;
  }, {});
  let firstName = (cols["First name"] ?? "").trim();
  let lastName = (cols["Last name"] ?? "").trim();
  const name = (cols["Name"] ?? "").trim();
  const contact = (cols["Contact"] ?? "").trim();
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    name ||
    contact ||
    (item.name != null ? String(item.name).trim() : "") ||
    "Unnamed";
  if (!firstName && !lastName && displayName) {
    const firstSpace = displayName.indexOf(" ");
    if (firstSpace > 0) {
      firstName = displayName.slice(0, firstSpace).trim();
      lastName = displayName.slice(firstSpace).trim();
    } else {
      firstName = displayName;
    }
  }
  return { displayName, firstName, lastName };
}

export async function getCustomersFromBoard(monday, boardId) {
  if (!monday || !boardId) return [];
  const items = await getBoardItems(monday, boardId);
  return items.map((item) => {
    const { displayName, firstName, lastName } = getCustomerNameFromItem(item);
    return {
      id: item.id,
      displayName,
      firstName: firstName || "",
      lastName: lastName || "",
    };
  });
}

function formatMondayError(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const first = errors[0];
  const msg = first?.message || "Unknown error";
  const data = first?.extensions?.error_data;
  if (data?.column_name) {
    return `${msg} (column: ${data.column_name})`;
  }
  return msg;
}

export async function createItem(monday, boardId, itemName, columnValues) {
  const query = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }
  `;
  const res = await monday.api(query, {
    variables: {
      boardId,
      itemName,
      columnValues: JSON.stringify(columnValues),
    },
  });
  if (res?.errors?.length) {
    const message = formatMondayError(res.errors) || "Invalid column value";
    throw new Error(message);
  }
  return res?.data?.create_item;
}

export async function updateItem(monday, itemId, boardId, columnValues) {
  const query = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
        id
      }
    }
  `;
  const res = await monday.api(query, {
    variables: {
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues),
    },
  });
  return res?.data?.change_multiple_column_values;
}
