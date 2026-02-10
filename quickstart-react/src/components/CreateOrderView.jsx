import React, { useRef, useState } from "react";
import { TextField, Button, Text } from "@vibe/core";
import { OrderRow } from "./OrderRow";
import { ReturnCustomerModal } from "./ReturnCustomerModal";
import { useBoardColumnIds } from "../hooks/useBoardColumnIds";
import { useCandleOptions } from "../hooks/useCandleOptions";
import { useCustomersFromBoard } from "../hooks/useCustomersFromBoard";
import { createOrderItems, addCustomerToCrmBoard, CRM_BOARD_ID } from "../services/mondayApi";

export function CreateOrderView({ monday, boardId }) {
  const [customerMode, setCustomerMode] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [orderRows, setOrderRows] = useState([]);
  const [submitState, setSubmitState] = useState({ status: null, error: null });
  const nextOrderIdRef = useRef(0);

  const columnIds = useBoardColumnIds(monday, boardId);
  const { options: candleOptions, source: candleSource } = useCandleOptions(monday);
  const { customers, loading: customersLoading, error: customersError } = useCustomersFromBoard(monday, returnModalOpen, CRM_BOARD_ID);

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
      setSubmitState({ status: "error", error: "Add at least one order line." });
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
        setSubmitState({ status: "success", error: null });
        setCustomerMode(null);
        setOrderRows([]);
        setFirstName("");
        setLastName("");
      } catch {
        setSubmitState({ status: "error", error: "Open this app on a board to create orders." });
      }
      return;
    }

    const hasMapping = columnIds && Object.values(columnIds).some(Boolean);
    if (!hasMapping) {
      setSubmitState({ status: "error", error: 'Board must have columns: "First name", "Last name", "Candle 1", "Candle 2", "Candle 3", "Inscription".' });
      return;
    }

    setSubmitState({ status: "loading", error: null });
    try {
      await createOrderItems(monday, boardId, columnIds, firstName, lastName, orderRows);
      if (customerMode === "new" && CRM_BOARD_ID) {
        await addCustomerToCrmBoard(monday, CRM_BOARD_ID, firstName, lastName);
      }
      setSubmitState({ status: "success", error: null });
      setCustomerMode(null);
      setOrderRows([]);
      setFirstName("");
      setLastName("");
    } catch (err) {
      setSubmitState({ status: "error", error: err?.message || err?.errors?.[0]?.message || "Failed to create orders." });
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
        {submitState.status === "error" && submitState.error && (
          <Text type="text2" color="negative" className="order-submit-message">{submitState.error}</Text>
        )}
        {submitState.status === "success" && (
          <Text type="text2" color="positive" className="order-submit-message">Orders created.</Text>
        )}
        <Button onClick={handleSubmit} disabled={submitState.status === "loading" || !allRowsComplete}>
          {submitState.status === "loading" ? "Creating…" : "Submit"}
        </Button>
      </section>
    </>
  );
}
