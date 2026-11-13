"use client";
import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError, isObject } from "@/lib/api";
import { parseIngredients, type Ingredient } from "@/lib/ingredients";
import InventoryDialog from "./InventoryDialog";
import {
  actionTitles,
  integerInput,
  inventoryError,
  isSystemTopping,
  type InventoryAction,
} from "./inventory-utils";

type Attempt = { path: string; init: RequestInit };
const success: Record<InventoryAction, string> = {
  create: "Đã thêm nguyên liệu.",
  edit: "Đã lưu nguyên liệu.",
  restock: "Đã nhập kho.",
  adjust: "Đã kiểm kho.",
  delete: "Đã xóa nguyên liệu.",
};
export default function IngredientForm({
  action,
  ingredient,
  onClose,
  onSuccess,
  onDenied,
}: {
  action: InventoryAction;
  ingredient?: Ingredient;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onDenied: (cause: unknown) => void;
}) {
  const { request } = useAuth();
  const [current, setCurrent] = useState(ingredient);
  const [name, setName] = useState(ingredient?.name ?? "");
  const [unit, setUnit] = useState("g");
  const [minimum, setMinimum] = useState(String(ingredient?.minStock ?? 0));
  const [quantity, setQuantity] = useState(
    action === "adjust" ? String(ingredient?.stock ?? "") : "",
  );
  const [initialStock, setInitialStock] = useState("0");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [stale, setStale] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  const stockAction = action === "restock" || action === "adjust";
  const locked = busy || uncertain || stale || missing;
  const system = current && isSystemTopping(current.name);
  function close() {
    if (sending.current) return;
    if (
      uncertain &&
      !window.confirm(
        "Máy chủ có thể đã xử lý thao tác. Nếu đóng, hãy kiểm tra tồn và lịch sử trước khi tạo thao tác mới. Bạn vẫn muốn đóng?",
      )
    )
      return;
    onClose();
  }
  function buildAttempt(): Attempt {
    let body: Record<string, unknown>;
    if (action === "create" || action === "edit") {
      if (!name.trim()) throw new Error("Nhập tên nguyên liệu.");
      body = {
        ...(system && action === "edit" ? {} : { name: name.trim() }),
        minStock: integerInput(minimum, "Ngưỡng tối thiểu"),
      };
      if (action === "create") {
        if (isSystemTopping(name))
          throw new Error("Tên nguyên liệu dành riêng cho topping hệ thống.");
        body.unit = unit;
        body.stock = integerInput(initialStock, "Tồn ban đầu");
      }
    } else if (stockAction) {
      if (!reason.trim() || reason.trim().length > 300)
        throw new Error("Nhập lý do từ 1 đến 300 ký tự.");
      const value = integerInput(
        quantity,
        action === "adjust" ? "Tồn thực" : "Số lượng nhập",
        action === "restock" ? 1 : 0,
      );
      if (action === "adjust") {
        if (current?.version === undefined)
          throw new Error(
            "Thiếu phiên bản tồn kho. Hãy đóng và tải lại danh sách.",
          );
        if (value < current.reserved)
          throw new Error(
            "Tồn thực không được thấp hơn lượng đang giữ cho đơn hàng.",
          );
        body = {
          stock: value,
          expectedVersion: current.version,
          reason: reason.trim(),
        };
      } else body = { quantity: value, reason: reason.trim() };
    } else body = {};
    const path =
      action === "create"
        ? "/ingredients"
        : `/ingredients/${current!.id}${stockAction ? `/${action}` : ""}`;
    return {
      path,
      init: {
        method:
          action === "edit" ? "PATCH" : action === "delete" ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(stockAction ? { "Idempotency-Key": crypto.randomUUID() } : {}),
        },
        body: JSON.stringify(body),
      },
    };
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current || stale || missing) return;
    sending.current = true;
    setError("");
    try {
      // An ambiguous failure retains the exact payload (including expectedVersion) and key.
      attempt.current ??= buildAttempt();
      setBusy(true);
      const result = await request(attempt.current.path, attempt.current.init);
      if (action === "delete") {
        if (
          !isObject(result) ||
          result.deleted !== true ||
          result.id !== current?.id
        )
          throw new Error("Kết quả xóa chưa xác định. Hãy tải lại danh sách.");
      } else {
        const [saved] = parseIngredients([result]);
        if (current && saved.id !== current.id)
          throw new Error("Máy chủ trả sai nguyên liệu.");
      }
      onSuccess(success[action]);
    } catch (cause) {
      setError(inventoryError(cause));
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
        onDenied(cause);
      } else if (
        cause instanceof ApiError &&
        cause.status < 500 &&
        cause.status !== 408 &&
        cause.status !== 429
      ) {
        attempt.current = null;
        setUncertain(false);
        setStale(cause.status === 409 && action !== "delete");
        setMissing(cause.status === 404);
      } else if (attempt.current) setUncertain(true);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function refresh() {
    if (sending.current || !current) return;
    sending.current = true;
    setBusy(true);
    try {
      const fresh = parseIngredients(await request("/ingredients")).find(
        (item) => item.id === current.id,
      );
      if (!fresh) throw new ApiError("Không tìm thấy nguyên liệu.", 404);
      setCurrent(fresh);
      setName(fresh.name);
      setMinimum(String(fresh.minStock));
      if (action === "adjust") setQuantity(String(fresh.stock));
      attempt.current = null;
      setStale(false);
      setMissing(false);
      setUncertain(false);
      setError("");
    } catch (cause) {
      setError(inventoryError(cause));
      if (cause instanceof ApiError && [401, 403].includes(cause.status))
        onDenied(cause);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const submitLabel = busy
    ? "Đang xử lý…"
    : uncertain
      ? "Thử lại cùng thao tác"
      : {
          create: "Tạo nguyên liệu",
          edit: "Lưu thay đổi",
          restock: "Xác nhận nhập kho",
          adjust: "Xác nhận kiểm kho",
          delete: "Xác nhận xóa",
        }[action];
  return (
    <InventoryDialog
      title={`${actionTitles[action]}${current ? ` — ${current.name}` : ""}`}
      busy={busy}
      onClose={close}
    >
      <form className="bl-admin-form bl-inventory-form" onSubmit={submit}>
        {error && (
          <p role="alert" className="bl-alert bl-alert-error">
            {error}
          </p>
        )}
        {uncertain && (
          <p>
            Chưa xác định kết quả. Giữ nguyên dữ liệu và thử lại cùng thao tác
            để tránh ghi kho trùng. Không tạo thao tác mới trước khi xác minh.
          </p>
        )}
        {(action === "create" || action === "edit") && (
          <>
            <label>
              Tên nguyên liệu
              <input
                autoFocus
                required
                value={name}
                disabled={locked || !!system}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {system && <p>Topping hệ thống: không được đổi tên hoặc đơn vị.</p>}
            {action === "create" && (
              <>
                <label>
                  Đơn vị
                  <select
                    value={unit}
                    disabled={locked}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                </label>
                <label>
                  Tồn ban đầu
                  <input
                    type="number"
                    min="0"
                    max="2147483647"
                    step="1"
                    required
                    value={initialStock}
                    disabled={locked}
                    onChange={(e) => setInitialStock(e.target.value)}
                  />
                </label>
              </>
            )}
            <label>
              Ngưỡng tối thiểu
              <input
                type="number"
                min="0"
                max="2147483647"
                step="1"
                required
                value={minimum}
                disabled={locked}
                onChange={(e) => setMinimum(e.target.value)}
              />
            </label>
          </>
        )}
        {stockAction && current && (
          <>
            <p>
              Tồn thực:{" "}
              <strong>
                {current.stock} {current.unit}
              </strong>{" "}
              · Đang giữ: {current.reserved} {current.unit} · Khả dụng:{" "}
              {current.available} {current.unit}
            </p>
            <label>
              {action === "adjust" ? "Tồn thực sau kiểm" : "Số lượng nhập"} (
              {current.unit})
              <input
                autoFocus
                type="number"
                required
                min={action === "adjust" ? current.reserved : 1}
                max="2147483647"
                step="1"
                value={quantity}
                disabled={locked}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label>
              Lý do
              <textarea
                required
                maxLength={300}
                value={reason}
                disabled={locked}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {action === "adjust" && (
              <p>
                Phiên bản: {current.version ?? "chưa có"}. Nếu tồn thay đổi, hãy
                tải lại và kiểm tra số đếm trước khi xác nhận.
              </p>
            )}
          </>
        )}
        {action === "delete" && (
          <p>
            Bạn chắc chắn muốn xóa <strong>{current?.name}</strong>? Máy chủ chỉ
            cho xóa khi nguyên liệu không phải topping hệ thống, không đang giữ
            và không liên kết công thức, đơn hàng hoặc lịch sử kho.
          </p>
        )}
        <div className="bl-actions">
          <button
            type="submit"
            className={action === "delete" ? "bl-admin-danger" : "bl-button"}
            disabled={
              busy ||
              stale ||
              missing ||
              (action === "adjust" && current?.version === undefined)
            }
          >
            {submitLabel}
          </button>
          {(stale || missing) && current && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Tải lại nguyên liệu
            </button>
          )}
          <button type="button" disabled={busy} onClick={close}>
            Hủy
          </button>
        </div>
      </form>
    </InventoryDialog>
  );
}
