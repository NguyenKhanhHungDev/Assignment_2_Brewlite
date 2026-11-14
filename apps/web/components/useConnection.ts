'use client';
import { useSyncExternalStore } from 'react';
import { getConnection, getServerConnection, subscribeConnection } from '@/lib/connection';

export default function useConnection() {
  return useSyncExternalStore(subscribeConnection, getConnection, getServerConnection);
}
