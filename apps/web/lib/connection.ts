export type Connection = 'online' | 'checking' | 'offline' | 'unavailable';
let connection: Connection = 'checking';
const listeners = new Set<() => void>();

export const getConnection = () => connection;
export const getServerConnection = (): Connection => 'checking';
export function subscribeConnection(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setConnection(value: Connection) {
  connection = value;
  listeners.forEach(listener => listener());
}
export function assertConnected() {
  if ((typeof navigator !== 'undefined' && navigator.onLine === false) || connection !== 'online') {
    throw new Error('Chưa xác minh được kết nối máy chủ. Giỏ hàng được giữ nguyên; vui lòng kết nối lại trước khi tiếp tục.');
  }
}
