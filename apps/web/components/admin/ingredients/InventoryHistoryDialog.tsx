"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import {
  parseInventoryHistory,
  type Ingredient,
  type InventoryHistory,
} from "@/lib/ingredients";
import InventoryDialog from "./InventoryDialog";
import { inventoryError } from "./inventory-utils";

export default function InventoryHistoryDialog({
  ingredient,
  onClose,
  onDenied,
}: {
  ingredient: Ingredient;
  onClose: () => void;
  onDenied: (cause: unknown) => void;
}) {
  const { request } = useAuth();
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<InventoryHistory | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let disposed = false;
    request(`/ingredients/${ingredient.id}/movements?page=${page}`)
      .then(parseInventoryHistory)
      .then((value) => {
        if (
          value.page !== page ||
          value.data.some((row) => row.ingredientId !== ingredient.id)
        )
          throw new Error(
            "Máy chủ trả sai trang hoặc nguyên liệu trong lịch sử.",
          );
        if (!disposed) {
          setResult(value);
          setError("");
        }
      })
      .catch((cause) => {
        if (!disposed) {
          setError(inventoryError(cause));
          setResult(null);
          if (cause instanceof ApiError && [401, 403].includes(cause.status))
            onDenied(cause);
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [ingredient.id, page, retry, request, onDenied]);
  function navigate(value: number) {
    setLoading(true);
    setError("");
    setResult(null);
    setPage(value);
  }
  return (
    <InventoryDialog
      title={`Lịch sử kho — ${ingredient.name}`}
      onClose={onClose}
    >
      {loading && <p role="status">Đang tải lịch sử…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              setRetry((n) => n + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      )}
      {!loading && result && (
        <>
          <p>
            {result.total} lần nhập/kiểm kho · Đơn vị: {ingredient.unit}
          </p>
          {result.data.length === 0 ? (
            <p>Chưa có lịch sử nhập hoặc kiểm kho.</p>
          ) : (
            <div
              className="bl-admin-table bl-inventory-table"
              tabIndex={0}
              role="region"
              aria-label="Lịch sử biến động kho"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Thời gian</th>
                    <th scope="col">Thao tác</th>
                    <th scope="col">Trước</th>
                    <th scope="col">Thay đổi</th>
                    <th scope="col">Sau</th>
                    <th scope="col">Lý do</th>
                    <th scope="col">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <time dateTime={row.createdAt}>
                          {new Date(row.createdAt).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </time>
                      </td>
                      <td>
                        {row.kind === "RESTOCK" ? "Nhập kho" : "Kiểm kho"}
                      </td>
                      <td>{row.stockBefore}</td>
                      <td>
                        {row.delta > 0 ? "+" : ""}
                        {row.delta}
                      </td>
                      <td>{row.stockAfter}</td>
                      <td>{row.reason}</td>
                      <td>
                        {row.actor.name ?? "Admin"} · {row.actor.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <div className="bl-admin-pagination">
        <button
          disabled={loading || page <= 1}
          onClick={() => navigate(page - 1)}
        >
          Trang trước
        </button>
        <span>
          Trang {page}
          {result ? `/${result.totalPages}` : ""}
        </span>
        <button
          disabled={loading || !result || page >= result.totalPages}
          onClick={() => navigate(page + 1)}
        >
          Trang sau
        </button>
      </div>
    </InventoryDialog>
  );
}
