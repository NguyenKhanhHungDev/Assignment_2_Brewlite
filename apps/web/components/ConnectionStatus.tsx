'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { requestJson } from '@/lib/api';
import { parseProducts } from '@/lib/products';
import { parseHistory } from '@/lib/orders';
import { parsePaymentStatus } from '@/lib/payments';
import { setConnection } from '@/lib/connection';
import { registerWorker } from '@/lib/register-worker';
import { useCart } from './CartProvider';
import { useAuth } from './AuthProvider';
import { useCheckout } from './CheckoutProvider';
import useConnection from './useConnection';

export default function ConnectionStatus() {
  const cart = useCart();
  const auth = useAuth();
  const checkout = useCheckout();
  const status = useConnection();
  const latest = useRef({ cart, auth, checkout });
  const retry = useRef<() => void>(() => {});
  const [hadOutage, setHadOutage] = useState(false);
  useEffect(() => { latest.current = { cart, auth, checkout }; });
  const orderId = checkout.purchase?.orderId;
  const owner = checkout.purchase?.owner;

  useEffect(() => {
    let generation = 0;
    let controller: AbortController | undefined;
    const offline = () => {
      generation++;
      controller?.abort();
      setHadOutage(true);
      setConnection('offline');
    };
    async function verify() {
      if (navigator.onLine === false) { offline(); return; }
      const version = ++generation;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setConnection('checking');
      if (!cart.ready || auth.loading) return;
      try {
        const catalog = parseProducts(await requestJson('/products', { signal }));
        if (version !== generation) return;
        latest.current.cart.reconcile(catalog);
        const { auth, checkout } = latest.current;
        const purchase = checkout.purchase;
        if (auth.session && purchase?.owner === auth.session.userId) {
          const id = purchase.orderId;
          const order = parseHistory([await auth.request(`/orders/${id}`, { signal })])[0];
          if (order.id !== id) throw new Error('Mã đơn không khớp');
          const payment = parsePaymentStatus(await auth.request(`/payments/${id}/status`, { signal }), id);
          if (version !== generation) return;
          checkout.syncOrder(order);
          checkout.syncPayment(payment);
        }
        if (version === generation) setConnection('online');
      } catch {
        if (version === generation) {
          setHadOutage(true);
          setConnection(!navigator.onLine ? 'offline' : 'unavailable');
        }
      }
    }
    const online = () => { setHadOutage(true); void verify(); };
    retry.current = () => { void verify(); };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    void verify();
    return () => {
      generation++;
      controller?.abort();
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [cart.ready, auth.loading, auth.session?.userId, orderId, owner]);

  useEffect(() => {
    void registerWorker().catch(() => {
      // Online ordering stays available if this browser cannot install the worker.
    });
  }, []);

  const reconnect = useCallback(() => retry.current(), []);
  if (status === 'online' && !hadOutage) return null;
  const text = status === 'offline'
    ? 'Bạn đang mất kết nối. Giỏ hàng đã lưu được giữ nguyên. Không thể đặt đơn hoặc thanh toán khi offline.'
    : status === 'checking'
      ? 'Đang kiểm tra máy chủ, giá, tồn kho và trạng thái giao dịch. Vui lòng chờ trước khi tiếp tục.'
      : status === 'unavailable'
        ? 'Chưa kết nối được máy chủ. Giỏ hàng được giữ nguyên. Chưa thể tiếp tục đặt đơn hoặc thanh toán.'
        : 'Đã kết nối lại máy chủ và tải dữ liệu mới. Hãy kiểm tra giỏ và trạng thái đơn trước khi tiếp tục.';
  return <aside className="bl-connection" role="status" aria-live="polite">
    <p>{text}</p>
    {(status === 'offline' || status === 'unavailable') && <button type="button" className="bl-button bl-button-secondary" onClick={reconnect}>Thử kết nối lại</button>}
  </aside>;
}
