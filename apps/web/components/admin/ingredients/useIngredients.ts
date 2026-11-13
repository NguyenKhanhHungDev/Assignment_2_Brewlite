"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import { parseIngredients, type Ingredient } from "@/lib/ingredients";
import { inventoryError } from "./inventory-utils";

export function useIngredients() {
  const { request } = useAuth();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let disposed = false;
    request("/ingredients")
      .then(parseIngredients)
      .then((value) => {
        if (!disposed) {
          setItems(value);
          setError("");
          setDenied(false);
        }
      })
      .catch((cause) => {
        if (!disposed) {
          setError(inventoryError(cause));
          // Never leave stale protected data/actions visible after access is revoked.
          setItems([]);
          setDenied(
            cause instanceof ApiError && [401, 403].includes(cause.status),
          );
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [request, version]);
  function reload() {
    setLoading(true);
    setError("");
    setVersion((n) => n + 1);
  }
  const deny = useCallback((cause: unknown) => {
    setItems([]);
    setDenied(true);
    setError(inventoryError(cause));
  }, []);
  return { items, loading, error, denied, reload, deny };
}
