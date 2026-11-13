"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { paymentName } from "@/lib/admin-orders";
import { statusNames } from "@/lib/orders";
import { preferenceText } from "@/lib/preferences";
import { money, optionText } from "@/lib/pricing";
import {
  cancellationBlock,
  nextPreparation,
  vietnamTime,
} from "./orders-config";
import type { OrdersModel } from "./useAdminOrders";

export default function OrderDetailDialog({ model }: { model: OrdersModel }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState("");
  const orderId = model.detailId;
  useEffect(() => {
    const dialog = ref.current,
      previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        previous !== document.body
      )
        previous.focus();
      else {
        const target =
          document.querySelector<HTMLButtonElement>(
            `button[aria-label="Chi tiết đơn #${orderId}"]`,
          ) ?? document.querySelector<HTMLElement>(".bl-orders h1");
        target?.focus();
      }
    };
  }, [orderId]);
  const {
    detail: order,
    detailId,
    busy,
    detailLoading,
    detailError,
    actionError,
    message,
  } = model;
  const next = order ? nextPreparation[order.status] : undefined;
  const blocked = order ? cancellationBlock(order) : null;
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="bl-admin-order-dialog bl-orders-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) model.close();
      }}
    >
      <header className="bl-admin-order-dialog-header">
        <h2 id={titleId}>Chi tiết đơn #{detailId}</h2>
        <button
          type="button"
          disabled={busy}
          aria-label="Đóng chi tiết đơn"
          onClick={model.close}
        >
          Đóng
        </button>
      </header>
      <div className="bl-admin-order-dialog-body">
        {detailLoading && <p role="status">Đang tải chi tiết đơn…</p>}
        {detailError && (
          <p role="alert" className="bl-alert bl-alert-error">
            {detailError}
          </p>
        )}
        {actionError && (
          <p role="alert" className="bl-alert bl-alert-error">
            {actionError}
          </p>
        )}
        {message && (
          <p role="status" className="bl-alert">
            {message}
          </p>
        )}
        {order && !detailLoading && (
          <>
            <dl className="bl-orders-summary">
              <div>
                <dt>Khách hàng</dt>
                <dd>{order.userEmail}</dd>
              </div>
              <div>
                <dt>Người nhận</dt>
                <dd>{order.recipientName ?? "Chưa ghi nhận"}</dd>
              </div>
              <div>
                <dt>Ngày tạo (Việt Nam)</dt>
                <dd>{vietnamTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt>Trạng thái hiện tại</dt>
                <dd>{statusNames[order.status]}</dd>
              </div>
              <div>
                <dt>Thanh toán gần nhất</dt>
                <dd>{paymentName(order.paymentStatus)}</dd>
              </div>
              {order.expiresAt && (
                <div>
                  <dt>Hạn đơn được ghi nhận</dt>
                  <dd>{vietnamTime(order.expiresAt)}</dd>
                </div>
              )}
            </dl>
            <p>
              Đang hiển thị trạng thái hiện tại và thông tin hủy đã ghi nhận.
              Hạn đơn không tự xác nhận thanh toán thất bại.
            </p>
            <h3>Món trong đơn</h3>
            <div
              className="bl-admin-table bl-orders-table"
              tabIndex={0}
              role="region"
              aria-label="Món trong đơn"
            >
              <table>
                <thead>
                  <tr>
                    {[
                      "Món và lựa chọn",
                      "Số lượng",
                      "Đơn giá",
                      "Thành tiền",
                    ].map((text) => (
                      <th key={text} scope="col">
                        {text}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{item.recipeName}</strong>
                        <p>{optionText(item.size, item.toppings)}</p>
                        <p>{preferenceText(item)}</p>
                        {item.note && <p>{item.note}</p>}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{money(item.unitPrice)}</td>
                      <td>{money(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="bl-orders-total">
              Tổng tiền đơn: <strong>{money(order.total)}</strong>
            </p>
            <p>Giá và tổng tiền theo dữ liệu đơn đã lưu trên máy chủ.</p>
            {(order.cancellationReason ||
              order.cancelledAt ||
              order.cancelledById) && (
              <section className="bl-admin-detail">
                <h3>Thông tin hủy đã ghi nhận</h3>
                {order.cancellationReason && <p>{order.cancellationReason}</p>}
                {order.cancelledAt && (
                  <p>Thời gian hủy: {vietnamTime(order.cancelledAt)}</p>
                )}
                {order.cancelledById && (
                  <p>Người hủy: Admin #{order.cancelledById}</p>
                )}
              </section>
            )}
            {next && (
              <section className="bl-admin-detail">
                <h3>Cập nhật pha chế</h3>
                <p>
                  Chỉ chuyển sang bước kế tiếp sau khi thanh toán đã được xác
                  minh. Admin không tự đánh dấu đã thanh toán.
                </p>
                <button
                  className="bl-button"
                  disabled={busy}
                  onClick={() => void model.mutate("status")}
                >
                  {busy ? "Đang cập nhật…" : `Chuyển sang ${statusNames[next]}`}
                </button>
              </section>
            )}
            {blocked ? (
              <p className="bl-alert">{blocked}</p>
            ) : (
              <form
                className="bl-admin-form bl-orders-cancel"
                onSubmit={(event) => {
                  event.preventDefault();
                  void model.mutate("cancel", reason);
                }}
              >
                <h3>Yêu cầu hủy đơn</h3>
                <p>
                  Máy chủ kiểm tra tất cả giao dịch và quyết định đơn có được
                  hủy hay không. Trạng thái thanh toán gần nhất chưa phản ánh
                  toàn bộ các lần thử.
                </p>
                <label>
                  Lý do hủy
                  <textarea
                    value={reason}
                    required
                    maxLength={300}
                    disabled={busy}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <small>{reason.length}/300 ký tự</small>
                <button className="bl-admin-danger" disabled={busy}>
                  {busy ? "Đang cập nhật…" : "Xác nhận yêu cầu hủy"}
                </button>
              </form>
            )}
            <p>
              <Link href="/admin/payments">
                Mở màn hình giao dịch và đối soát
              </Link>
            </p>
          </>
        )}
        <div className="bl-actions">
          <button
            type="button"
            disabled={busy || detailLoading}
            onClick={() => {
              if (detailId) void model.loadDetail(detailId);
            }}
          >
            Tải lại chi tiết
          </button>
          <button type="button" disabled={busy} onClick={model.close}>
            Đóng
          </button>
        </div>
      </div>
    </dialog>
  );
}
