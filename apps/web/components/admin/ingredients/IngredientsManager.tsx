"use client";
import { useCallback, useState } from "react";
import { matchesSearch, downloadCsv } from "@/lib/admin-tools";
import type { Ingredient } from "@/lib/ingredients";
import IngredientForm from "./IngredientForm";
import InventoryHistoryDialog from "./InventoryHistoryDialog";
import {
  isSystemTopping,
  stockStatus,
  type InventoryAction,
} from "./inventory-utils";
import { useIngredients } from "./useIngredients";

type Selection = { action: InventoryAction | "history"; item?: Ingredient };
export default function IngredientsManager() {
  const list = useIngredients();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [unit, setUnit] = useState("all");
  const [sort, setSort] = useState("name");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [message, setMessage] = useState("");
  const denyAccess = list.deny;
  // Stable callback avoids re-fetching history whenever parent UI changes.
  const deny = useCallback(
    (cause: unknown) => {
      denyAccess(cause);
      setSelection(null);
    },
    [denyAccess],
  );
  const rows = list.items
    .filter(
      (item) =>
        matchesSearch(item.name, search) &&
        (unit === "all" || unit === item.unit) &&
        (filter === "all" ||
          (filter === "low"
            ? item.available < item.minStock || item.available <= 0
            : stockStatus(item) === filter)),
    )
    .sort((a, b) =>
      sort === "available-asc"
        ? a.available - b.available || a.id - b.id
        : sort === "available-desc"
          ? b.available - a.available || a.id - b.id
          : a.name.localeCompare(b.name, "vi") || a.id - b.id,
    );
  const disabled = list.loading || list.denied || !!list.error;
  function open(action: Selection["action"], item?: Ingredient) {
    setMessage("");
    setSelection({ action, item });
  }
  return (
    <section className="bl-inventory">
      <div className="bl-admin-section-heading">
        <h1>Kho nguyên liệu</h1>
        <button
          className="bl-button"
          disabled={disabled}
          onClick={() => open("create")}
        >
          Thêm nguyên liệu
        </button>
      </div>
      <p>
        Theo dõi tồn thực, lượng giữ cho đơn hàng và số lượng còn có thể sử
        dụng. Các số lượng tính theo đơn vị của từng nguyên liệu.
      </p>
      {message && (
        <p role="status" className="bl-alert">
          {message}
        </p>
      )}
      <div className="bl-admin-stats" aria-label="Tóm tắt nguyên liệu">
        <div>
          <span>Nguyên liệu</span>
          <strong>{list.items.length}</strong>
        </div>
        <div>
          <span>Cần bổ sung</span>
          <strong>
            {list.items.filter((item) => stockStatus(item) !== "ok").length}
          </strong>
        </div>
      </div>
      <div className="bl-admin-toolbar">
        <label>
          Tìm nguyên liệu
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên nguyên liệu…"
          />
        </label>
        <label>
          Đơn vị lọc
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="g">g</option>
            <option value="ml">ml</option>
          </select>
        </label>
        <label>
          Tình trạng kho
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="low">Cần bổ sung</option>
            <option value="empty">Hết khả dụng</option>
            <option value="ok">Đủ tồn</option>
          </select>
        </label>
        <label>
          Sắp xếp
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Tên A–Z</option>
            <option value="available-asc">Khả dụng tăng dần</option>
            <option value="available-desc">Khả dụng giảm dần</option>
          </select>
        </label>
        <button disabled={list.loading} onClick={list.reload}>
          Tải lại danh sách
        </button>
        <button
          disabled={disabled || rows.length === 0}
          onClick={() =>
            downloadCsv(
              "nguyen-lieu-dang-loc.csv",
              [
                "Tên",
                "Đơn vị",
                "Tồn thực",
                "Đang giữ",
                "Khả dụng",
                "Ngưỡng tối thiểu",
              ],
              rows.map((item) => [
                item.name,
                item.unit,
                item.stock,
                item.reserved,
                item.available,
                item.minStock,
              ]),
            )
          }
        >
          Xuất CSV kết quả đang lọc
        </button>
      </div>
      {list.loading && <p role="status">Đang tải nguyên liệu…</p>}
      {list.error && (
        <div role="alert" className="bl-alert bl-alert-error">
          <p>{list.error}</p>
          <button onClick={list.reload}>Thử lại</button>
        </div>
      )}
      {!list.loading &&
        !list.error &&
        (list.items.length === 0 ? (
          <p>Chưa có nguyên liệu. Hãy thêm nguyên liệu đầu tiên.</p>
        ) : rows.length === 0 ? (
          <p>Không có nguyên liệu phù hợp bộ lọc.</p>
        ) : (
          <>
            <p>
              {rows.length} nguyên liệu phù hợp. Cảnh báo dựa trên lượng khả
              dụng so với ngưỡng tối thiểu.
            </p>
            <div
              className="bl-admin-table bl-inventory-table"
              tabIndex={0}
              role="region"
              aria-label="Danh sách nguyên liệu"
            >
              <table>
                <thead>
                  <tr>
                    {[
                      "Tên",
                      "Đơn vị",
                      "Tồn thực",
                      "Đang giữ",
                      "Khả dụng",
                      "Ngưỡng tối thiểu",
                      "Tình trạng",
                      "Thao tác",
                    ].map((title) => (
                      <th key={title} scope="col">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.unit}</td>
                      <td>{item.stock}</td>
                      <td>{item.reserved}</td>
                      <td>{item.available}</td>
                      <td>{item.minStock}</td>
                      <td>
                        <span className={`bl-admin-stock-${stockStatus(item)}`}>
                          {stockStatus(item) === "empty"
                            ? "Hết khả dụng"
                            : stockStatus(item) === "low"
                              ? "Tồn thấp"
                              : "Đủ tồn"}
                        </span>
                      </td>
                      <td>
                        <div className="bl-actions">
                          <button
                            disabled={disabled}
                            onClick={() => open("edit", item)}
                          >
                            Sửa
                          </button>
                          <button
                            disabled={disabled}
                            onClick={() => open("restock", item)}
                          >
                            Nhập kho
                          </button>
                          <button
                            disabled={disabled || item.version === undefined}
                            title={
                              item.version === undefined
                                ? "Thiếu phiên bản: tải lại danh sách"
                                : undefined
                            }
                            onClick={() => open("adjust", item)}
                          >
                            Kiểm kho
                          </button>
                          <button
                            disabled={disabled}
                            onClick={() => open("history", item)}
                          >
                            Lịch sử
                          </button>
                          <button
                            className="bl-admin-danger"
                            disabled={
                              disabled ||
                              isSystemTopping(item.name) ||
                              item.reserved > 0
                            }
                            title={
                              isSystemTopping(item.name)
                                ? "Không xóa topping hệ thống"
                                : item.reserved > 0
                                  ? "Nguyên liệu đang giữ cho đơn hàng"
                                  : "Máy chủ sẽ kiểm tra liên kết trước khi xóa"
                            }
                            onClick={() => open("delete", item)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
      {selection &&
        !list.denied &&
        (selection.action === "history" && selection.item ? (
          <InventoryHistoryDialog
            ingredient={selection.item}
            onClose={() => setSelection(null)}
            onDenied={deny}
          />
        ) : selection.action !== "history" ? (
          <IngredientForm
            action={selection.action}
            ingredient={selection.item}
            onClose={() => setSelection(null)}
            onDenied={deny}
            onSuccess={(text) => {
              setSelection(null);
              setMessage(text);
              list.reload();
            }}
          />
        ) : null)}
    </section>
  );
}
