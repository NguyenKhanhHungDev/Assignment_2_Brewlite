"use client";
import { statusNames, type OrderStatus } from "@/lib/orders";
import { paymentOptions } from "./orders-config";
import type { OrdersModel } from "./useAdminOrders";

export default function OrderFilters({ model }: { model: OrdersModel }) {
  const { filters, setFilters, apply, resetFilters, busy, filterError } = model;
  return (
    <form className="bl-panel bl-admin-form" onSubmit={apply}>
      <fieldset disabled={busy}>
        <legend>Lọc đơn hàng</legend>
        <div className="bl-admin-toolbar">
          <label>
            Tìm đơn hàng
            <input
              value={filters.search}
              maxLength={200}
              placeholder="Mã đơn, email, tên khách hoặc người nhận"
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </label>
          <label>
            Trạng thái đơn
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">Tất cả</option>
              {(Object.keys(statusNames) as OrderStatus[]).map((status) => (
                <option key={status} value={status}>
                  {statusNames[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái thanh toán
            <select
              value={filters.paymentStatus}
              onChange={(e) =>
                setFilters({ ...filters, paymentStatus: e.target.value })
              }
            >
              {paymentOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Từ ngày (Việt Nam)
            <input
              type="date"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(e) =>
                setFilters({ ...filters, dateFrom: e.target.value })
              }
            />
          </label>
          <label>
            Đến ngày (Việt Nam)
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) =>
                setFilters({ ...filters, dateTo: e.target.value })
              }
            />
          </label>
        </div>
        <p>
          Ngày lọc theo giờ Việt Nam (UTC+07:00), bao gồm cả ngày kết thúc. Từ
          khóa được tìm tại máy chủ trước khi phân trang.
        </p>
        {filterError && (
          <p role="alert" className="bl-alert bl-alert-error">
            {filterError}
          </p>
        )}
        <div className="bl-actions">
          <button className="bl-button">Áp dụng bộ lọc</button>
          <button type="button" onClick={resetFilters}>
            Xóa bộ lọc
          </button>
          <button
            type="button"
            disabled={model.loading}
            onClick={model.reloadList}
          >
            Tải lại danh sách
          </button>
        </div>
      </fieldset>
    </form>
  );
}
