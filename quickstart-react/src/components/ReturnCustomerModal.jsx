import React from "react";
import { Button, Text } from "@vibe/core";

export function ReturnCustomerModal({
  open,
  onClose,
  customers,
  loading,
  error,
  hasCrmBoardId,
  onSelectCustomer,
}) {
  if (!open) return null;

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
        aria-label="Select customer"
      >
        <div className="customer-modal-header">
          <Text type="text1" weight="bold">
            Select customer
          </Text>
          <Button size="small" kind="tertiary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="customer-modal-body">
          {!hasCrmBoardId && (
            <Text type="text2" color="secondary">
              Set VITE_CRM_BOARD_ID in .env to your Monday CRM board.
            </Text>
          )}
          {hasCrmBoardId && loading && (
            <Text type="text2" color="secondary">
              Loading customers…
            </Text>
          )}
          {hasCrmBoardId && error && (
            <Text type="text2" color="negative">
              {error}
            </Text>
          )}
          {hasCrmBoardId && !loading && !error && customers.length === 0 && (
            <Text type="text2" color="secondary">
              No customers found on the CRM board.
            </Text>
          )}
          {hasCrmBoardId && !loading && customers.length > 0 && (
            <ul className="customer-list">
              {customers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="customer-list-item"
                    onClick={() => onSelectCustomer(c)}
                  >
                    {c.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
