import { ApiError, isObject } from "@/lib/api";
import {
  parseAdminOrder,
  parseAdminOrders,
  type AdminOrder,
} from "@/lib/admin-orders";
import { statusNames, type OrderStatus } from "@/lib/orders";

export const emptyFilters = {
  search: "",
  status: "",
  paymentStatus: "",
  dateFrom: "",
  dateTo: "",
};
export type OrderFilters = typeof emptyFilters;
export const paymentOptions = [
  ["", "Tất cả"],
  ["NONE", "Chưa có giao dịch"],
  ["PENDING", "Chờ xác nhận"],
  ["SUCCESS", "Đã thanh toán"],
  ["FAILED", "Thất bại"],
  ["CANCELLED", "Đã hủy"],
  ["RECONCILIATION_REQUIRED", "Cần đối soát"],
] as const;
export const nextPreparation: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};
export const vietnamTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export function linkedOrderId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}
export function cancellationBlock(order: AdminOrder): string | null {
  if (!["PENDING", "PAYMENT_FAILED"].includes(order.status))
    return "Chỉ được yêu cầu hủy đơn chờ thanh toán hoặc thanh toán thất bại.";
  if (order.paymentStatus === "RECONCILIATION_REQUIRED")
    return "Giao dịch cần đối soát. Không hủy trước khi xác minh kết quả thanh toán.";
  if (order.paymentStatus === "PENDING")
    return "Đơn đang có thanh toán chờ xác nhận/chưa rõ kết quả. Cần kiểm tra trước khi hủy.";
  if (order.paymentStatus === "SUCCESS")
    return "Giao dịch đã thành công. Không được hủy đơn tại màn hình này.";
  if (
    order.paymentStatus !== null &&
    !["FAILED", "CANCELLED"].includes(order.paymentStatus)
  )
    return "Trạng thái thanh toán chưa rõ; cần kiểm tra trước khi hủy.";
  return null;
}
export function orderError(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status === 401)
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (cause.status === 403)
      return "Bạn không có quyền xem hoặc quản lý đơn hàng. Chỉ ADMIN được thao tác.";
    if (cause.status === 404)
      return "Không tìm thấy đơn hàng. Hãy tải lại danh sách.";
    if (cause.status === 409)
      return `${cause.message} Đang tải lại dữ liệu mới; hãy kiểm tra trước khi thao tác tiếp.`;
  }
  return cause instanceof Error
    ? cause.message
    : "Không xử lý được đơn hàng. Vui lòng thử lại.";
}
export function parseOrder(value: unknown, id?: number) {
  const order = parseAdminOrder(value);
  if (id !== undefined && order.id !== id)
    throw new Error("Máy chủ trả sai mã đơn hàng.");
  return order;
}
export function parseOrderPage(value: unknown, page: number, limit: number) {
  const result = parseAdminOrders(value);
  if (
    result.page !== page ||
    result.limit !== limit ||
    new Set(result.data.map((row) => row.id)).size !== result.data.length
  )
    throw new Error("Máy chủ trả sai trang hoặc đơn hàng trùng.");
  return result;
}
export function validateAcknowledgement(
  value: unknown,
  id: number,
  status: OrderStatus,
  cancel: boolean,
) {
  if (
    !isObject(value) ||
    (cancel ? value.id : value.orderId) !== id ||
    value.status !== status
  )
    throw new Error(
      "Chưa xác nhận được kết quả cập nhật. Hãy kiểm tra lại chi tiết đơn trước khi thao tác tiếp.",
    );
}
export function confirmation(
  order: AdminOrder,
  next: OrderStatus,
  reason?: string,
) {
  return next === "CANCELLED"
    ? `Yêu cầu hủy đơn #${order.id} với lý do “${reason}”? Máy chủ sẽ kiểm tra giao dịch và điều kiện hủy.`
    : `Chuyển đơn #${order.id} từ “${statusNames[order.status]}” sang “${statusNames[next]}”?`;
}
