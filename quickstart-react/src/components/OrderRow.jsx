import React from "react";
import { TextField, Button, Dropdown } from "@vibe/core";

export function OrderRow({ row, rowIndex, candleOptions, onDropdownChange, onInscriptionChange, onRemove }) {
  const options = candleOptions ?? [];
  return (
    <div className="order-row">
      <span className="order-row-number">Order {rowIndex + 1}</span>
      <div className="order-row-dropdown">
        <Dropdown
          size="small"
          placeholder="Select..."
          options={options}
          value={row.values[0]}
          onChange={(opt) => onDropdownChange(row.id, 0, opt)}
        />
      </div>
      <div className="order-row-dropdown">
        <Dropdown
          size="small"
          placeholder="Select..."
          options={options}
          value={row.values[1]}
          onChange={(opt) => onDropdownChange(row.id, 1, opt)}
        />
      </div>
      <div className="order-row-dropdown">
        <Dropdown
          size="small"
          placeholder="Select..."
          options={options}
          value={row.values[2]}
          onChange={(opt) => onDropdownChange(row.id, 2, opt)}
        />
      </div>
      <div className="order-row-inscription">
        <TextField
          size="small"
          placeholder="Inscription (optional)"
          value={row.inscription ?? ""}
          onChange={(e) => {
            const v = e?.target?.value !== undefined ? e.target.value : (typeof e === "string" ? e : "");
            onInscriptionChange(row.id, v ?? "");
          }}
        />
      </div>
      <Button className="order-row-remove" kind="tertiary" size="small" onClick={() => onRemove(row.id)}>
        Remove
      </Button>
    </div>
  );
}
