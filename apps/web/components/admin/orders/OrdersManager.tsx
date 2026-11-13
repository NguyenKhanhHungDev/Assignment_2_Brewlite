"use client";
import { paymentName } from "@/lib/admin-orders";
import { downloadCsv } from "@/lib/admin-tools";
import { statusNames } from "@/lib/orders";
import OrderFilters from "./OrderFilters";
import OrdersTable from "./OrdersTable";
import OrderDetailDialog from "./OrderDetailDialog";
import { vietnamTime } from "./orders-config";
import { useAdminOrders } from "./useAdminOrders";

export default function OrdersManager({
  initialOrderId,
  invalidLink = false,
}: {
  initialOrderId?: number | null;
  invalidLink?: boolean;
}) {
  const model = useAdminOrders(initialOrderId);
  const { list, loading, listError, page, limit } = model;
  return (
    <section className="bl-orders">
      <h1 tabIndex={-1}>Quản lý đơn hàng</h1>
      <p>
        Tra cứu đơn và cập nhật tiến độ pha chế. Thanh toán, tồn kho và điểm do
        máy chủ xử lý.
      </p>
      {invalidLink && (
        <p role="alert">
          Mã đơn trong đường dẫn không hợp lệ. Hãy tìm đơn trong danh sách.
        </p>
      )}
      <OrderFilters model={model} />
      <div className="bl-admin-toolbar">
        <label>
          Số đơn mỗi trang
          <select
            disabled={loading || model.busy}
            value={limit}
            onChange={(event) => model.resize(Number(event.target.value))}
          >
            {[10, 20, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={loading || model.denied || !list?.data.length}
          onClick={() =>
            downloadCsv(
              "don-hang-trang-dang-xem.csv",
              [
                "Mã đơn",
                "Email khách hàng",
                "Người nhận",
                "Ngày tạo VN",
                "Tổng tiền VND",
                "Trạng thái đơn",
                "Thanh toán gần nhất",
              ],
              (list?.data ?? []).map((order) => [
                order.id,
                order.userEmail,
                order.recipientName,
                vietnamTime(order.createdAt),
                order.total,
                statusNames[order.status],
                paymentName(order.paymentStatus),
              ]),
            )
          }
        >
          Xuất CSV trang đang xem
        </button>
      </div>
      {loading && <p role="status">Đang tải đơn hàng…</p>}
      {listError && (
        <div role="alert" className="bl-alert bl-alert-error">
          <p>{listError}</p>
          <button onClick={model.reloadList}>Thử lại</button>
        </div>
      )}
      {!loading && list && (
        <>
          <p>
            {list.total} đơn phù hợp · Trang {page}/
            {Math.max(1, list.totalPages)}
          </p>
          {list.data.length === 0 && <p>Không có đơn hàng phù hợp bộ lọc.</p>}
        </>
      )}
      <OrdersTable model={model} />
      <div className="bl-admin-pagination">
        <button
          disabled={loading || model.busy || model.denied || page <= 1}
          onClick={() => model.navigate(page - 1)}
        >
          Trang trước
        </button>
        <span>Trang {page}</span>
        <button
          disabled={loading || model.busy || !list || page >= list.totalPages}
          onClick={() => model.navigate(page + 1)}
        >
          Trang sau
        </button>
      </div>
      {model.detailId !== null && !model.denied && (
        <OrderDetailDialog key={model.detailId} model={model} />
      )}
    </section>
  );
}
