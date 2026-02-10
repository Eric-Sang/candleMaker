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
  FIRST_NAME: "First Name",
  LAST_NAME: "Last Name",
  CANDLE_1: "Candle 1",
  CANDLE_2: "Candle 2",
  CANDLE_3: "Candle 3",
  INSCRIPTION: "Inscription",
  LAST_UPDATE_DATE: "Created Date",
  STATUS: "Status",
};

/** CRM (Contacts) board column titles – used when adding a new customer to the CRM. */
const CRM_COLUMN_TITLES = {
  CONTACT: "Contact",
  FIRST_NAME: "First Name",
  LAST_NAME: "Last Name",
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
  const isTextColumn = (type) => type && String(type).toLowerCase() === "text";
  if (columnIds.option1 && payload.option1)
    values[columnIds.option1] = isTextColumn(columnIds.option1Type)
      ? payload.option1
      : { labels: [payload.option1] };
  if (columnIds.option2 && payload.option2)
    values[columnIds.option2] = isTextColumn(columnIds.option2Type)
      ? payload.option2
      : { labels: [payload.option2] };
  if (columnIds.option3 && payload.option3)
    values[columnIds.option3] = isTextColumn(columnIds.option3Type)
      ? payload.option3
      : { labels: [payload.option3] };
  const inscription = (payload.inscription || "").trim();
  if (columnIds.inscription && inscription !== "")
    values[columnIds.inscription] = inscription;
  if (columnIds.lastUpdateDate && payload.lastUpdateDate) {
    values[columnIds.lastUpdateDate] = payload.lastUpdateDate;
  }
  if (columnIds.status)
    values[columnIds.status] = isTextColumn(columnIds.statusType)
      ? "Created"
      : { labels: ["Created"] };
  return values;
}

/** Build column values for updating an order item (first name, last name, customer name, candles, inscription only). */
function buildOrderUpdateColumnValues(columnIds, payload) {
  const values = {};
  const customerName = [payload.firstName, payload.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (columnIds.customerName && customerName)
    values[columnIds.customerName] = customerName;
  const first = (payload.firstName || "").trim();
  if (columnIds.firstName) values[columnIds.firstName] = first;
  const last = (payload.lastName || "").trim();
  if (columnIds.lastName) values[columnIds.lastName] = last;
  const isTextColumn = (type) => type && String(type).toLowerCase() === "text";
  if (columnIds.option1 != null)
    values[columnIds.option1] = payload.option1
      ? isTextColumn(columnIds.option1Type)
        ? payload.option1
        : { labels: [payload.option1] }
      : "";
  if (columnIds.option2 != null)
    values[columnIds.option2] = payload.option2
      ? isTextColumn(columnIds.option2Type)
        ? payload.option2
        : { labels: [payload.option2] }
      : "";
  if (columnIds.option3 != null)
    values[columnIds.option3] = payload.option3
      ? isTextColumn(columnIds.option3Type)
        ? payload.option3
        : { labels: [payload.option3] }
      : "";
  const inscription = (payload.inscription || "").trim();
  if (columnIds.inscription != null)
    values[columnIds.inscription] = inscription;
  return values;
}

export async function updateOrderItem(
  monday,
  boardId,
  itemId,
  columnIds,
  payload
) {
  if (!monday || !boardId || !itemId || !columnIds) return null;
  const columnValues = buildOrderUpdateColumnValues(columnIds, payload);
  return updateItem(monday, itemId, boardId, columnValues);
}

function formatMondayDate(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const dateStr = d.toISOString().slice(0, 10);
  const timeStr = d.toTimeString().slice(0, 8);
  return { date: dateStr, time: timeStr };
}

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
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      `Order ${i + 1}`;
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

function findColumn(byTitle, typeByTitle, ...possibleTitles) {
  for (const t of possibleTitles) {
    if (byTitle[t]) return { id: byTitle[t], type: typeByTitle[t] || "" };
  }
  return null;
}

/**
 * Maps board columns to the IDs needed for order creation.
 * Supports "First name"/"First Name" and "Last name"/"Last Name" etc.
 */
export function mapBoardColumnsForOrder(columns) {
  if (!Array.isArray(columns) || columns.length === 0) return null;
  const byTitle = {};
  const typeByTitle = {};
  columns.forEach((col) => {
    if (col?.title != null) {
      byTitle[col.title] = col.id;
      typeByTitle[col.title] = col.type ?? "";
    }
  });
  const titles = ORDER_COLUMN_TITLES;
  const firstNameCol = findColumn(
    byTitle,
    typeByTitle,
    "First Name",
    "First name"
  );
  const lastNameCol = findColumn(
    byTitle,
    typeByTitle,
    "Last Name",
    "Last name"
  );
  const customerNameCol = findColumn(
    byTitle,
    typeByTitle,
    titles.CUSTOMER_NAME,
    "Customer name"
  );
  const orderNumberCol = findColumn(
    byTitle,
    typeByTitle,
    titles.ORDER_NUMBER,
    "Order Number"
  );
  const option1Col = findColumn(
    byTitle,
    typeByTitle,
    titles.CANDLE_1,
    "Candle 1"
  );
  const option2Col = findColumn(
    byTitle,
    typeByTitle,
    titles.CANDLE_2,
    "Candle 2"
  );
  const option3Col = findColumn(
    byTitle,
    typeByTitle,
    titles.CANDLE_3,
    "Candle 3"
  );
  const inscriptionCol = findColumn(
    byTitle,
    typeByTitle,
    titles.INSCRIPTION,
    "Inscription"
  );
  const lastUpdateDateCol = findColumn(
    byTitle,
    typeByTitle,
    titles.LAST_UPDATE_DATE,
    "Created Date"
  );
  const statusCol = findColumn(byTitle, typeByTitle, titles.STATUS, "Status");

  return {
    firstName: firstNameCol?.id,
    lastName: lastNameCol?.id,
    customerName: customerNameCol?.id,
    orderNumber: orderNumberCol?.id,
    option1: option1Col?.id,
    option2: option2Col?.id,
    option3: option3Col?.id,
    option1Type: option1Col?.type,
    option2Type: option2Col?.type,
    option3Type: option3Col?.type,
    inscription: inscriptionCol?.id,
    lastUpdateDate: lastUpdateDateCol?.id,
    status: statusCol?.id,
    statusType: statusCol?.type,
  };
}

export async function addCustomerToCrmBoard(
  monday,
  crmBoardId,
  firstName,
  lastName
) {
  if (!monday || !crmBoardId) return null;
  const cols = await getBoardColumns(monday, crmBoardId);
  const byTitle = {};
  cols.forEach((c) => {
    if (c?.id != null && c?.title != null) byTitle[c.title] = c.id;
  });
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown";
  const columnValues = {};
  const contactColId = byTitle[CRM_COLUMN_TITLES.CONTACT] || byTitle["Contact"];
  if (contactColId) columnValues[contactColId] = fullName;
  const firstNameColId =
    byTitle[CRM_COLUMN_TITLES.FIRST_NAME] ||
    byTitle["First Name"] ||
    byTitle["First name"];
  const lastNameColId =
    byTitle[CRM_COLUMN_TITLES.LAST_NAME] ||
    byTitle["Last Name"] ||
    byTitle["Last name"];
  if (firstNameColId && firstName) columnValues[firstNameColId] = firstName;
  if (lastNameColId && lastName) columnValues[lastNameColId] = lastName;
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

/** Get column values as title -> text for an item. */
function getItemColumnTextMap(item) {
  const map = {};
  (item.column_values ?? []).forEach((cv) => {
    const title = cv.title ?? cv.id;
    if (title) map[title] = (cv.text ?? "").trim();
  });
  return map;
}

/**
 * Fetch all items from the Candle Orders board and return only those with Status = "Created".
 * Each returned item includes a row object for table display.
 */
export async function getOrdersWithStatusCreated(monday, boardId) {
  const items = await getBoardItems(monday, boardId);
  const created = items.filter((item) => {
    const cols = getItemColumnTextMap(item);
    const status = (cols["Status"] ?? cols["status"] ?? "").toLowerCase();
    return status === "created";
  });
  return created.map((item) => {
    const cols = getItemColumnTextMap(item);
    return {
      id: item.id,
      name: item.name,
      customerName:
        cols["Customer name"] ?? cols["Customer Name"] ?? item.name ?? "",
      orderNumber: cols["Order Number"] ?? cols["Order number"] ?? "",
      firstName: cols["First Name"] ?? cols["First name"] ?? "",
      lastName: cols["Last Name"] ?? cols["Last name"] ?? "",
      candle1: cols["Candle 1"] ?? "",
      candle2: cols["Candle 2"] ?? "",
      candle3: cols["Candle 3"] ?? "",
      inscription: cols["Inscription"] ?? "",
      lastUpdateDate: cols["Created Date"] ?? "",
      status: cols["Status"] ?? cols["status"] ?? "",
    };
  });
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

export async function createItem(monday, boardId, itemName, columnValues) {
  if (!monday || !boardId) return null;
  const mutation = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }
  `;
  const res = await monday.api(mutation, {
    variables: {
      boardId,
      itemName: itemName || "New item",
      columnValues: JSON.stringify(columnValues || {}),
    },
  });
  return res?.data?.create_item ?? null;
}

export async function updateItem(monday, itemId, boardId, columnValues) {
  if (!monday || !boardId || !itemId) return null;
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
        id
      }
    }
  `;
  const res = await monday.api(mutation, {
    variables: {
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues || {}),
    },
  });
  return res?.data?.change_multiple_column_values ?? null;
}

export async function deleteItem(monday, itemId) {
  if (!monday || !itemId) return null;
  const mutation = `
    mutation ($itemId: ID!) {
      delete_item(item_id: $itemId) {
        id
      }
    }
  `;
  const res = await monday.api(mutation, {
    variables: { itemId },
  });
  return res?.data?.delete_item ?? null;
}
