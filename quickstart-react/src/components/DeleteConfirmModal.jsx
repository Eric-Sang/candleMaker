import React from "react";
import { Button, Text } from "@vibe/core";

export function DeleteConfirmModal({
  open,
  onClose,
  order,
  onConfirm,
  deleting,
  error,
}) {
  if (!open) return null;

  const customerName =
    order?.customerName ||
    [order?.firstName, order?.lastName].filter(Boolean).join(" ") ||
    "this customer";

  return (
    <div
      className="customer-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="customer-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete order"
      >
        <div className="customer-modal-header">
          <Text type="text1" weight="bold">
            Delete order
          </Text>
          <Button size="small" kind="tertiary" onClick={onClose} disabled={deleting}>
            Close
          </Button>
        </div>
        <div className="customer-modal-body">
          {error && (
            <Text type="text2" color="negative" className="edit-order-error">
              {error}
            </Text>
          )}
          <Text type="text2">
            Delete order for {customerName}?
          </Text>
          <div className="edit-order-actions" style={{ marginTop: 16 }}>
            <Button kind="secondary" size="small" onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button size="small" kind="primary" onClick={() => onConfirm?.(order)} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
