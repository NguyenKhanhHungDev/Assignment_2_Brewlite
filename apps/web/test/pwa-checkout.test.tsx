import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CartProvider, { useCart } from '../components/CartProvider';
import AuthProvider, { useAuth } from '../components/AuthProvider';
import CheckoutProvider, { useCheckout } from '../components/CheckoutProvider';
import ConnectionStatus from '../components/ConnectionStatus';
import { getConnection, setConnection } from '../lib/connection';
import { addCartLine } from '../lib/cart';
import { registerWorker } from '../lib/register-worker';
import { products } from './fixtures';
import { useState } from 'react';

const fetchMock = vi.fn();
function Controls() {
  const cart = useCart();
  const auth = useAuth();
  const checkout = useCheckout();
  const [error, setError] = useState('');
  return <>
    <p data-testid="ready">{String(cart.ready && checkout.ready && !auth.loading && !!auth.session)}</p>
    <p data-testid="purchase">{checkout.purchase?.status ?? 'none'}</p>
    <p role="alert">{error}</p>
    <button onClick={() => void checkout.createOrder(cart.lines, 'Nguyen An').catch(e => setError(e.message))}>Tạo đơn</button>
    <button onClick={() => void checkout.startPayment().catch(e => setError(e.message))}>Thanh toán</button>
  </>;
}
function App() { return <CartProvider><AuthProvider><CheckoutProvider><ConnectionStatus /><Controls /></CheckoutProvider></AuthProvider></CartProvider>; }
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('brewlite-cart', JSON.stringify(addCartLine([], products[0], 'M', [], 1)));
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  setConnection('online');
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path: string) => {
    if (path === '/api/session/me') return Response.json({ userId: 7, expiresAt: Date.now() + 3600000 });
    if (path === '/products') return Response.json(products);
    throw new TypeError('unknown network result');
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('real checkout providers during network outages', () => {
  it('reports offline immediately while session bootstrap is still waiting', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/session/me', expect.anything()));
    expect(getConnection()).toBe('checking');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    act(() => window.dispatchEvent(new Event('offline')));
    await screen.findByText(/Bạn đang mất kết nối/);
    expect(getConnection()).toBe('offline');
    expect(localStorage.getItem('brewlite-cart')).toContain('Cà phê sữa');
  });

  it('blocks direct create/payment calls offline and keeps an unknown draft without replay on recovery', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    await waitFor(() => expect(getConnection()).toBe('online'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đơn' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Không nhận được kết quả/));
    const saved = sessionStorage.getItem('brewlite-checkout');
    expect(JSON.parse(saved!).draft.key).toBeTruthy();
    const posts = () => fetchMock.mock.calls.filter(([, init]) => init.method === 'POST');
    expect(posts()).toHaveLength(1);
    act(() => window.dispatchEvent(new Event('offline')));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đơn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Chưa xác minh được kết nối/));
    expect(posts()).toHaveLength(1);
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(getConnection()).toBe('online'));
    expect(posts()).toHaveLength(1);
    expect(sessionStorage.getItem('brewlite-checkout')).toBe(saved);
  });

  it('keeps writes blocked until owned order and payment state are freshly fetched', async () => {
    sessionStorage.setItem('brewlite-checkout', JSON.stringify({
      draft: null, ready: true, inputCode: '', appliedCode: '',
      purchase: { owner: 7, key: 'order-key', snapshot: addCartLine([], products[0], 'M', [], 1), recipientName: 'Nguyen An', orderId: 42, status: 'PENDING', total: 35000, cartCleared: false },
      attempt: { key: 'payment-key', orderId: 42, provider: 'ZALOPAY' },
    }));
    let resolvePayment!: (r: Response) => void;
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (path: string, init: RequestInit) => {
      if (path === '/api/session/proxy/orders/42') return Response.json({ id: 42, status: 'PENDING', total: 35000, createdAt: '2026-11-14T00:00:00Z', items: [{ productId: 1, recipeName: 'Cà phê sữa', size: 'M', toppings: [], quantity: 1, unitPrice: 35000, subtotal: 35000 }] });
      if (path === '/api/session/proxy/payments/42/status') return new Promise<Response>(resolve => { resolvePayment = resolve; });
      return base(path, init);
    });
    render(<App />);
    await waitFor(() => expect(resolvePayment).toBeTypeOf('function'));
    expect(getConnection()).toBe('checking');
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Chưa xác minh/));
    await act(async () => resolvePayment(Response.json({ orderId: 42, orderStatus: 'PENDING', latestPayment: null })));
    await waitFor(() => expect(getConnection()).toBe('online'));
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(0);
    expect(JSON.parse(sessionStorage.getItem('brewlite-checkout')!).attempt.key).toBe('payment-key');
  });
});

describe('service worker registration', () => {
  it('registers only for production in a secure supported browser', async () => {
    const register = vi.fn(async () => ({}));
    vi.stubEnv('NODE_ENV', 'production');
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
    await registerWorker();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    register.mockClear();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    await registerWorker();
    expect(register).not.toHaveBeenCalled();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    vi.stubEnv('NODE_ENV', 'development');
    await registerWorker();
    expect(register).not.toHaveBeenCalled();
  });
});
