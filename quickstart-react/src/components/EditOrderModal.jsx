import React, { useState, useEffect } from "react";
import { Button, Text, TextField, Dropdown } from "@vibe/core";
import { updateOrderItem } from "../services/mondayApi";

export function EditOrderModal({
  open,
  onClose,
  order,
  monday,
  boardId,
  columnIds,
  candleOptions,
  onSaved,
}) {
  const [candle1, setCandle1] = useState(null);
  const [candle2, setCandle2] = useState(null);
  const [candle3, setCandle3] = useState(null);
  const [inscription, setInscription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !order) return;
    setInscription(order.inscription ?? "");
    const options = candleOptions ?? [];
    const match = (label) =>
      options.find((o) => (o.label || o.value) === label) || (label ? { value: label, label } : null);
    setCandle1(match(order.candle1));
    setCandle2(match(order.candle2));
    setCandle3(match(order.candle3));
    setError(null);
  }, [open, order, candleOptions]);

  const getTextFieldValue = (e) =>
    (e?.target?.value !== undefined ? e.target.value : (typeof e === "string" ? e : "")) ?? "";

  const handleSave = async () => {
    if (!monday || !boardId || !order?.id || !columnIds) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrderItem(monday, boardId, order.id, columnIds, {
        firstName: order.firstName ?? "",
        lastName: order.lastName ?? "",
        option1: candle1?.label ?? candle1?.value ?? "",
        option2: candle2?.label ?? candle2?.value ?? "",
        option3: candle3?.label ?? candle3?.value ?? "",
        inscription: inscription.trim(),
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || err?.errors?.[0]?.message || "Failed to update order.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !order) return null;

  const options = candleOptions ?? [];

  return (
    <div
      className="customer-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="customer-modal edit-order-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit order"
      >
        <div className="customer-modal-header">
          <Text type="text1" weight="bold">
            Edit order
          </Text>
          <Button size="small" kind="tertiary" onClick={onClose} disabled={saving}>
            Close
          </Button>
        </div>
        <div className="customer-modal-body">
          {error && (
            <Text type="text2" color="negative" className="edit-order-error">
              {error}
            </Text>
          )}
          <div className="edit-order-form">
            <div className="edit-order-field">
              <label className="edit-order-label">First name</label>
              <Text type="text2" weight="bold">{order.firstName || "—"}</Text>
            </div>
            <div className="edit-order-field">
              <label className="edit-order-label">Last name</label>
              <Text type="text2" weight="bold">{order.lastName || "—"}</Text>
            </div>
            <div className="edit-order-field">
              <label className="edit-order-label">Candle 1</label>
              <Dropdown
                size="small"
                placeholder="Select..."
                options={options}
                value={candle1}
                onChange={setCandle1}
              />
            </div>
            <div className="edit-order-field">
              <label className="edit-order-label">Candle 2</label>
              <Dropdown
                size="small"
                placeholder="Select..."
                options={options}
                value={candle2}
                onChange={setCandle2}
              />
            </div>
            <div className="edit-order-field">
              <label className="edit-order-label">Candle 3</label>
              <Dropdown
                size="small"
                placeholder="Select..."
                options={options}
                value={candle3}
                onChange={setCandle3}
              />
            </div>
            <div className="edit-order-field">
              <label className="edit-order-label">Inscription</label>
              <TextField
                size="small"
                placeholder="Inscription (optional)"
                value={inscription}
                onChange={(e) => setInscription(getTextFieldValue(e))}
              />
            </div>
          </div>
          <div className="edit-order-actions">
            <Button kind="secondary" size="small" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="small" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
