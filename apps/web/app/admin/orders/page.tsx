import { Suspense } from "react";
import OrdersManager from "@/components/admin/orders/OrdersManager";
import { linkedOrderId } from "@/components/admin/orders/orders-config";
import "./orders.css";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p role="status">Đang tải đơn hàng…</p>}>
      <OrdersPage searchParams={searchParams} />
    </Suspense>
  );
}
async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  const initialOrderId = linkedOrderId(id);
  return (
    <OrdersManager
      key={initialOrderId ?? "list"}
      initialOrderId={initialOrderId}
      invalidLink={id !== undefined && initialOrderId === null}
    />
  );
}
