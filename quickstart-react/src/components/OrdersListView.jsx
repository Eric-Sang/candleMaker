import React, { useState, useEffect, useMemo } from "react";
import { Loader, Text, Button } from "@vibe/core";
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@vibe/core";
import { getOrdersWithStatusCreated, getBoardColumns, mapBoardColumnsForOrder, getCandleOptionsFromBoard, deleteItem, CANDLES_BOARD_ID } from "../services/mondayApi";
import { EditOrderModal } from "./EditOrderModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

const ORDER_COLUMNS = [
  { id: "customerName", title: "Customer name" },
  { id: "orderNumber", title: "Order Number" },
  { id: "firstName", title: "First Name" },
  { id: "lastName", title: "Last Name" },
  { id: "candle1", title: "Candle 1" },
  { id: "candle2", title: "Candle 2" },
  { id: "candle3", title: "Candle 3" },
  { id: "inscription", title: "Inscription" },
  { id: "lastUpdateDate", title: "Created Date" },
  { id: "status", title: "Status" },
  { id: "actions", title: "Actions" },
];

export function OrdersListView({ monday, boardId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columnIds, setColumnIds] = useState(null);
  const [candleOptions, setCandleOptions] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!boardId || !monday) {
      setLoading(false);
      setOrders([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrdersWithStatusCreated(monday, boardId)
      .then((data) => {
        if (!cancelled) setOrders(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [monday, boardId]);

  useEffect(() => {
    if (!boardId || !monday) return;
    let cancelled = false;
    getBoardColumns(monday, boardId)
      .then((cols) => {
        if (!cancelled) setColumnIds(mapBoardColumnsForOrder(cols));
      })
      .catch(() => {
        if (!cancelled) setColumnIds(null);
      });
    return () => { cancelled = true; };
  }, [monday, boardId]);

  useEffect(() => {
    if (!monday || !CANDLES_BOARD_ID) return;
    let cancelled = false;
    getCandleOptionsFromBoard(monday, CANDLES_BOARD_ID)
      .then((opts) => {
        if (!cancelled) setCandleOptions(opts ?? []);
      })
      .catch(() => {
        if (!cancelled) setCandleOptions([]);
      });
    return () => { cancelled = true; };
  }, [monday]);

  const refetchOrders = () => {
    if (!monday || !boardId) return;
    getOrdersWithStatusCreated(monday, boardId)
      .then((data) => setOrders(data ?? []))
      .catch(() => {});
  };

  const openDeleteModal = (order) => {
    setOrderToDelete(order);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setOrderToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async (order) => {
    if (!monday || !order?.id) return;
    setDeletingId(order.id);
    setDeleteError(null);
    try {
      await deleteItem(monday, order.id);
      refetchOrders();
      closeDeleteModal();
    } catch (err) {
      setDeleteError(err?.message || err?.errors?.[0]?.message || "Failed to delete order.");
    } finally {
      setDeletingId(null);
    }
  };

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const timeA = new Date(a.lastUpdateDate || 0).getTime();
      const timeB = new Date(b.lastUpdateDate || 0).getTime();
      return timeB - timeA;
    });
  }, [orders]);

  if (!boardId) {
    let devOrder = null;
    try {
      const raw = localStorage.getItem("candleOrdersDev");
      if (raw) devOrder = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return (
      <section className="orders-list-view">
        {devOrder ? (
          <ul className="orders-list">
            {(devOrder.orderRows || []).map((row, idx) => (
              <li key={idx} className="orders-list-item">
                <span className="orders-list-item-name">
                  {[devOrder.firstName, devOrder.lastName].filter(Boolean).join(" ") || `Order ${idx + 1}`}
                </span>
                <span className="orders-list-item-cols">
                  {(row.values || []).map((v, i) => v?.label ? (
                    <span key={i} className="orders-list-item-col">Candle {i + 1}: {v.label}</span>
                  ) : null)}
                  {row.inscription ? (
                    <span className="orders-list-item-col">Inscription: {row.inscription}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Text type="text2" color="secondary">
            Open this app on the Candle Orders board to view orders with status &quot;Created&quot;.
          </Text>
        )}
      </section>
    );
  }

  if (loading) return <Loader size="medium" />;
  if (error) return <Text type="text2" color="negative">{error}</Text>;

  return (
    <section className="orders-list-view">
      <Text type="text2" color="secondary" className="orders-list-view-note">
        Orders with status &quot;Created&quot; from this board.
      </Text>
      {sortedOrders.length === 0 ? (
        <Text type="text2" color="secondary">No orders with status &quot;Created&quot; yet.</Text>
      ) : (
        <div className="table-container">
        <Table
          columns={ORDER_COLUMNS}
          dataState={{ isLoading: false, isError: false }}
          errorState={<Text type="text2" color="negative">Failed to load orders.</Text>}
          emptyState={
            <Text type="text2" color="secondary">No orders with status &quot;Created&quot; yet.</Text>
          }
        >
          <TableHeader>
            {ORDER_COLUMNS.map((col) => (
              <TableHeaderCell key={col.id} title={col.title} />
            ))}
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => (
              <TableRow key={order.id}>
                {ORDER_COLUMNS.map((col) =>
                  col.id === "actions" ? (
                    <TableCell key={col.id} className="order-actions-cell">
                      <Button size="small" kind="primary" onClick={() => { setOrderToEdit(order); setEditModalOpen(true); }}>
                        Edit
                      </Button>
                      <Button size="small" kind="primary" onClick={() => openDeleteModal(order)} disabled={deletingId === order.id}>
                        {deletingId === order.id ? "Deleting…" : "Delete"}
                      </Button>
                    </TableCell>
                  ) : (
                    <TableCell key={col.id}>{order[col.id] ?? "—"}</TableCell>
                  )
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
      <EditOrderModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setOrderToEdit(null); }}
        order={orderToEdit}
        monday={monday}
        boardId={boardId}
        columnIds={columnIds}
        candleOptions={candleOptions}
        onSaved={refetchOrders}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={closeDeleteModal}
        order={orderToDelete}
        onConfirm={handleDeleteConfirm}
        deleting={deletingId != null}
        error={deleteError}
      />
    </section>
  );
}
