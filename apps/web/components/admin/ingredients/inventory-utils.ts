import { ApiError } from "@/lib/api";
import type { Ingredient } from "@/lib/ingredients";

export type InventoryAction =
  "create" | "edit" | "restock" | "adjust" | "delete";
export const actionTitles: Record<InventoryAction, string> = {
  create: "Thêm nguyên liệu",
  edit: "Sửa nguyên liệu",
  restock: "Nhập kho",
  adjust: "Kiểm kho",
  delete: "Xóa nguyên liệu",
};
export function isSystemTopping(name: string) {
  return ["trân châu", "kem sữa"].includes(name.trim().toLocaleLowerCase("vi"));
}
export function stockStatus(item: Ingredient) {
  return item.available <= 0
    ? "empty"
    : item.available < item.minStock
      ? "low"
      : "ok";
}
export function integerInput(value: string, label: string, min = 0) {
  const number = Number(value);
  if (
    !value.trim() ||
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(number) ||
    number < min ||
    number > 2147483647
  )
    throw new Error(`${label} phải là số nguyên từ ${min} đến 2147483647.`);
  return number;
}
export function inventoryError(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status === 401)
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (cause.status === 403)
      return "Bạn không có quyền quản lý nguyên liệu. Chỉ ADMIN được thao tác.";
    if (cause.status === 404)
      return "Không tìm thấy nguyên liệu hoặc chức năng kho. Hãy tải lại danh sách.";
    if (cause.status === 409)
      return `${cause.message} Hãy tải lại dữ liệu và kiểm tra trước khi gửi lại.`;
  }
  return cause instanceof Error
    ? cause.message
    : "Không xử lý được yêu cầu. Vui lòng thử lại.";
}
