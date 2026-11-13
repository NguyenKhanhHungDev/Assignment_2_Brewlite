import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CartProvider, { useCart } from '../components/CartProvider';
import ConnectionStatus from '../components/ConnectionStatus';
import { getConnection, setConnection } from '../lib/connection';
import { requestJson } from '../lib/api';
import { addCartLine } from '../lib/cart';
import { products } from './fixtures';

vi.mock('../components/AuthProvider', () => ({ useAuth: () => ({ session: null, loading: false, request: vi.fn() }) }));
vi.mock('../components/CheckoutProvider', () => ({ useCheckout: () => ({ purchase: null, syncOrder: vi.fn(), syncPayment: vi.fn() }) }));
function Cart() { const cart = useCart(); return <p data-testid="cart">{cart.lines.length}:{cart.lines[0]?.product.price}</p>; }
const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  setConnection('online');
});
afterEach(() => vi.unstubAllGlobals());

describe('NFR-10 connection recovery', () => {
  it('blocks mutations while offline/checking/unavailable without calling fetch', async () => {
    for (const state of ['offline', 'checking', 'unavailable'] as const) {
      setConnection(state);
      for (const path of ['/api/session/proxy/orders', '/api/session/proxy/payments/zalopay/create']) {
        await expect(requestJson(path, { method: 'POST' })).rejects.toThrow();
      }
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('preserves saved cart offline/reload and reconciles official prices on reconnect without POST replay', async () => {
    const saved = JSON.stringify(addCartLine([], products[0], 'M', [], 1));
    localStorage.setItem('brewlite-cart', saved);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const view = render(<CartProvider><ConnectionStatus /><Cart /></CartProvider>);
    await screen.findByText(/Bạn đang mất kết nối/);
    expect(await screen.findByTestId('cart')).toHaveTextContent('1:35000');
    expect(localStorage.getItem('brewlite-cart')).toBe(saved);
    view.unmount();
    render(<CartProvider><ConnectionStatus /><Cart /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId('cart')).toHaveTextContent('1:35000'));
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ ...products[0], price: 40000 }])));
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    act(() => window.dispatchEvent(new Event('online')));
    await screen.findByText(/Đã kết nối.*máy chủ/);
    expect(screen.getByTestId('cart')).toHaveTextContent('1:40000');
    expect(fetchMock.mock.calls.every(([, init]) => !init.method || init.method === 'GET')).toBe(true);
    expect(getConnection()).toBe('online');
  });
  it('does not trust browser online when API is unavailable and retries only GETs', async () => {
    fetchMock.mockRejectedValue(new TypeError('backend down'));
    render(<CartProvider><ConnectionStatus /></CartProvider>);
    await screen.findByText(/Chưa kết nối được máy chủ/);
    expect(getConnection()).toBe('unavailable');
    fetchMock.mockResolvedValue(new Response(JSON.stringify(products)));
    fireEvent.click(screen.getByRole('button', { name: 'Thử kết nối lại' }));
    await screen.findByText(/Đã kết nối.*máy chủ/);
    expect(getConnection()).toBe('online');
  });
  it('ignores a successful old probe after a newer offline event', async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>(r => { resolve = r; }));
    render(<CartProvider><ConnectionStatus /></CartProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    act(() => window.dispatchEvent(new Event('offline')));
    await act(async () => { resolve(new Response(JSON.stringify(products))); });
    expect(getConnection()).toBe('offline');
  });
});
