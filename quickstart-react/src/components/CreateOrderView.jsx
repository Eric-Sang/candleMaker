import React, { useRef, useState, useEffect } from "react";
import { TextField, Button, Text } from "@vibe/core";
import { OrderRow } from "./OrderRow";
import { ReturnCustomerModal } from "./ReturnCustomerModal";
import {
  getBoardColumns,
  mapBoardColumnsForOrder,
  createOrderItems,
  addCustomerToCrmBoard,
  getCandleOptionsFromBoard,
  getCustomersFromBoard,
  CANDLES_BOARD_ID,
  CRM_BOARD_ID,
} from "../services/mondayApi";

export function CreateOrderView({ monday, boardId }) {
  const [customerMode, setCustomerMode] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [orderRows, setOrderRows] = useState([]);
  const [columnIds, setColumnIds] = useState(null);
  const [candleOptions, setCandleOptions] = useState([]);
  const [candleSource, setCandleSource] = useState("idle");
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const nextOrderIdRef = useRef(0);

  useEffect(() => {
    if (!boardId || !monday) return;
    let cancelled = false;
    getBoardColumns(monday, boardId)
      .then((cols) => {
        if (!cancelled) setColumnIds(mapBoardColumnsForOrder(cols));
      })
      .catch(() => {
        if (!cancelled) setColumnIds({});
      });
    return () => { cancelled = true; };
  }, [monday, boardId]);

  useEffect(() => {
    if (!returnModalOpen || !monday || !CRM_BOARD_ID) {
      if (!returnModalOpen) setCustomers([]);
      return;
    }
    let cancelled = false;
    setCustomersLoading(true);
    setCustomersError(null);
    getCustomersFromBoard(monday, CRM_BOARD_ID)
      .then((list) => {
        if (!cancelled) {
          setCustomers(list || []);
          setCustomersLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCustomers([]);
          setCustomersLoading(false);
          setCustomersError(err?.message || "Failed to load customers.");
        }
      });
    return () => { cancelled = true; };
  }, [returnModalOpen, monday]);

  useEffect(() => {
    if (!monday) return;
    if (!CANDLES_BOARD_ID) {
      setCandleOptions([]);
      setCandleSource("no-board");
      return;
    }
    let cancelled = false;
    setCandleSource("loading");
    getCandleOptionsFromBoard(monday, CANDLES_BOARD_ID)
      .then((opts) => {
        if (cancelled) return;
        setCandleOptions(opts || []);
        setCandleSource(opts?.length ? "board" : "empty");
      })
      .catch(() => {
        if (!cancelled) {
          setCandleOptions([]);
          setCandleSource("error");
        }
      });
    return () => { cancelled = true; };
  }, [monday]);

  const openReturnModal = () => setReturnModalOpen(true);

  const selectReturnCustomer = (customer) => {
    setCustomerMode("return");
    setFirstName(customer.firstName || "");
    setLastName(customer.lastName || "");
    setReturnModalOpen(false);
  };

  const goBackToCustomerType = () => {
    setCustomerMode(null);
    setFirstName("");
    setLastName("");
    setOrderRows([]);
  };

  const handleAddOrder = () => {
    const id = nextOrderIdRef.current++;
    setOrderRows((prev) => [...prev, { id, values: [null, null, null], inscription: "" }]);
  };

  const handleDropdownChange = (rowId, dropdownIndex, option) => {
    setOrderRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, values: [...row.values.slice(0, dropdownIndex), option, ...row.values.slice(dropdownIndex + 1)] }
          : row
      )
    );
  };

  const handleRemoveOrder = (rowId) => {
    setOrderRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleInscriptionChange = (rowId, value) => {
    setOrderRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, inscription: value } : row))
    );
  };

  const getTextFieldValue = (e) =>
    (e?.target?.value !== undefined ? e.target.value : (typeof e === "string" ? e : "")) ?? "";

  const isRowComplete = (row) =>
    row.values.length >= 3 &&
    row.values.every((v) => v && (v.label != null || v.value != null));

  const allRowsComplete = orderRows.length > 0 && orderRows.every(isRowComplete);

  const handleSubmit = async () => {
    if (orderRows.length === 0) {
      setSubmitStatus("error");
      setSubmitError("Add at least one order line.");
      return;
    }

    if (!boardId || !monday) {
      try {
        const payload = {
          firstName,
          lastName,
          orderRows: orderRows.map((row) => ({
            values: row.values.map((v) => (v ? { label: v.label, value: v.value } : null)),
            inscription: row.inscription ?? "",
          })),
          submittedAt: new Date().toISOString(),
        };
        localStorage.setItem("candleOrdersDev", JSON.stringify(payload));
        setSubmitStatus("success");
        setCustomerMode(null);
        setOrderRows([]);
        setFirstName("");
        setLastName("");
        setSubmitError(null);
      } catch {
        setSubmitStatus("error");
        setSubmitError("Open this app on a board to create orders.");
      }
      return;
    }

    const hasMapping = columnIds && Object.values(columnIds).some(Boolean);
    if (!hasMapping) {
      setSubmitStatus("error");
      setSubmitError('Board must have columns: "First name", "Last name", "Candle 1", "Candle 2", "Candle 3", "Inscription".');
      return;
    }

    setSubmitStatus("loading");
    setSubmitError(null);
    try {
      await createOrderItems(monday, boardId, columnIds, firstName, lastName, orderRows);
      if (customerMode === "new" && CRM_BOARD_ID) {
        await addCustomerToCrmBoard(monday, CRM_BOARD_ID, firstName, lastName);
      }
      setSubmitStatus("success");
      setCustomerMode(null);
      setOrderRows([]);
      setFirstName("");
      setLastName("");
      setSubmitError(null);
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err?.message || err?.errors?.[0]?.message || "Failed to create orders.");
    }
  };

  return (
    <>
      {customerMode === null && (
        <section className="customer-mode-buttons">
          <Button size="medium" onClick={() => setCustomerMode("new")}>
            New customer
          </Button>
          <Button size="medium" kind="secondary" onClick={openReturnModal}>
            Return customer
          </Button>
        </section>
      )}

      {(customerMode === "new" || customerMode === "return") && (
        <>
          <header className="create-order-section-header">
            <Text type="text1" weight="bold">
              {customerMode === "new" ? "New customer" : "Returning customer"}
            </Text>
            <div className="create-order-section-header-actions">
              {customerMode === "return" && (
                <Button size="small" kind="tertiary" onClick={() => setReturnModalOpen(true)}>
                  Change customer
                </Button>
              )}
              <Button size="small" kind="tertiary" onClick={goBackToCustomerType}>
                Back
              </Button>
            </div>
          </header>
          <section className="order-form">
            {customerMode === "return" ? (
              <>
                <div className="order-form-field">
                  <Text type="text2" color="secondary" className="order-form-label">First name</Text>
                  <Text type="text1">{firstName || "—"}</Text>
                </div>
                <div className="order-form-field">
                  <Text type="text2" color="secondary" className="order-form-label">Last name</Text>
                  <Text type="text1">{lastName || "—"}</Text>
                </div>
              </>
            ) : (
              <>
                <div className="order-form-field">
                  <TextField
                    size="small"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(getTextFieldValue(e))}
                  />
                </div>
                <div className="order-form-field">
                  <TextField
                    size="small"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(getTextFieldValue(e))}
                  />
                </div>
              </>
            )}
            <Button className="order-form-add-btn" size="small" onClick={handleAddOrder}>
              Add order
            </Button>
            {candleSource === "no-board" && (
              <Text type="text2" color="secondary" className="order-form-hint">Set VITE_CANDLES_BOARD_ID in .env to load candle options.</Text>
            )}
            {candleSource === "error" && (
              <Text type="text2" color="secondary" className="order-form-hint">Could not load candles from board.</Text>
            )}
            {candleSource === "empty" && (
              <Text type="text2" color="secondary" className="order-form-hint">No items on the candles board.</Text>
            )}
          </section>
        </>
      )}

      <ReturnCustomerModal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        customers={customers}
        loading={customersLoading}
        error={customersError}
        hasCrmBoardId={!!CRM_BOARD_ID}
        onSelectCustomer={selectReturnCustomer}
      />

      <section className="order-rows">
        {orderRows.map((row, rowIndex) => (
          <OrderRow
            key={row.id}
            row={row}
            rowIndex={rowIndex}
            candleOptions={candleOptions}
            onDropdownChange={handleDropdownChange}
            onInscriptionChange={handleInscriptionChange}
            onRemove={handleRemoveOrder}
            isComplete={isRowComplete(row)}
          />
        ))}
      </section>
      <section className="order-submit">
        {submitStatus === "error" && submitError && (
          <Text type="text2" color="negative" className="order-submit-message">{submitError}</Text>
        )}
        {submitStatus === "success" && (
          <Text type="text2" color="positive" className="order-submit-message">Orders created.</Text>
        )}
        <Button onClick={handleSubmit} disabled={submitStatus === "loading" || !allRowsComplete}>
          {submitStatus === "loading" ? "Creating…" : "Submit"}
        </Button>
      </section>
    </>
  );
}
