"use client";
import { paymentName } from "@/lib/admin-orders";
import { statusNames } from "@/lib/orders";
import { money } from "@/lib/pricing";
import { vietnamTime } from "./orders-config";
import type { OrdersModel } from "./useAdminOrders";

export default function OrdersTable({ model }: { model: OrdersModel }) {
  if (!model.list?.data.length || model.loading || model.denied) return null;
  return (
    <div
      className="bl-admin-table bl-orders-table"
      tabIndex={0}
      role="region"
      aria-label="Danh sách đơn hàng"
    >
      <table>
        <thead>
          <tr>
            {[
              "Mã đơn",
              "Khách hàng",
              "Người nhận",
              "Tạo lúc (VN)",
              "Tổng tiền",
              "Trạng thái đơn",
              "Thanh toán gần nhất",
              "Thao tác",
            ].map((text) => (
              <th key={text} scope="col">
                {text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.list.data.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.userEmail}</td>
              <td>{order.recipientName ?? "Chưa ghi nhận"}</td>
              <td>
                <time dateTime={order.createdAt}>
                  {vietnamTime(order.createdAt)}
                </time>
              </td>
              <td>{money(order.total)}</td>
              <td>{statusNames[order.status]}</td>
              <td>{paymentName(order.paymentStatus)}</td>
              <td>
                <button
                  disabled={model.busy}
                  aria-label={`Chi tiết đơn #${order.id}`}
                  onClick={() => model.open(order.id)}
                >
                  Chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
