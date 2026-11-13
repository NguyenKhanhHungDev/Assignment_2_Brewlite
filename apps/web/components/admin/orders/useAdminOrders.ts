"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";
import type { AdminOrder, AdminOrderPage } from "@/lib/admin-orders";
import {
  cancellationBlock,
  confirmation,
  emptyFilters,
  nextPreparation,
  orderError,
  parseOrder,
  parseOrderPage,
  validateAcknowledgement,
} from "./orders-config";

export function useAdminOrders(initialOrderId?: number | null) {
  const { request } = useAuth();
  const [filters, setFilters] = useState(emptyFilters),
    [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1),
    [limit, setLimit] = useState(20),
    [revision, setRevision] = useState(0);
  const [list, setList] = useState<AdminOrderPage | null>(null),
    [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(""),
    [filterError, setFilterError] = useState("");
  const [detail, setDetail] = useState<AdminOrder | null>(null),
    [detailId, setDetailId] = useState<number | null>(initialOrderId ?? null);
  const [detailLoading, setDetailLoading] = useState(!!initialOrderId),
    [detailError, setDetailError] = useState("");
  const [actionError, setActionError] = useState(""),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [denied, setDenied] = useState(false);
  const listVersion = useRef(0),
    detailVersion = useRef(0),
    sending = useRef(false);
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  for (const [key, value] of Object.entries(applied))
    if (value) query.set(key, value);
  const path = `/admin/orders?${query}`;
  const deny = useCallback((cause: unknown) => {
    ++listVersion.current;
    ++detailVersion.current;
    setDenied(true);
    setList(null);
    setDetail(null);
    setDetailId(null);
    setListError(orderError(cause));
    setLoading(false);
  }, []);
  const isDenied = (cause: unknown) =>
    cause instanceof ApiError && [401, 403].includes(cause.status);
  useEffect(() => {
    const version = ++listVersion.current;
    let disposed = false;
    request(path)
      .then((value) => parseOrderPage(value, page, limit))
      .then((value) => {
        if (!disposed && version === listVersion.current) {
          setList(value);
          setListError("");
          setDenied(false);
        }
      })
      .catch((cause) => {
        if (disposed || version !== listVersion.current) return;
        if (isDenied(cause)) deny(cause);
        else {
          setList(null);
          setListError(orderError(cause));
        }
      })
      .finally(() => {
        if (!disposed && version === listVersion.current) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [path, page, limit, revision, request, deny]);
  const readDetail = useCallback(
    async (id: number, version: number) => {
      try {
        const value = parseOrder(await request(`/admin/orders/${id}`), id);
        if (version === detailVersion.current) {
          setDetail(value);
          return value;
        }
      } catch (cause) {
        if (version === detailVersion.current) {
          if (cause instanceof ApiError && [401, 403].includes(cause.status))
            deny(cause);
          else setDetailError(orderError(cause));
        }
      } finally {
        if (version === detailVersion.current) setDetailLoading(false);
      }
      return null;
    },
    [request, deny],
  );
  const loadDetail = useCallback(
    async (id: number) => {
      const version = ++detailVersion.current;
      setDetailId(id);
      setDetail(null);
      setDetailError("");
      setDetailLoading(true);
      return readDetail(id, version);
    },
    [readDetail],
  );
  useEffect(() => {
    const sequence = detailVersion;
    const version = ++sequence.current;
    if (initialOrderId) void readDetail(initialOrderId, version);
    return () => {
      ++sequence.current;
    };
  }, [initialOrderId, readDetail]);
  function reloadList() {
    setLoading(true);
    setList(null);
    setListError("");
    setRevision((n) => n + 1);
  }
  function navigate(value: number) {
    setLoading(true);
    setList(null);
    setPage(value);
  }
  function resize(value: number) {
    setLoading(true);
    setList(null);
    setLimit(value);
    setPage(1);
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    setFilterError("");
    if (
      filters.dateFrom &&
      filters.dateTo &&
      filters.dateFrom > filters.dateTo
    ) {
      setFilterError("Ngày bắt đầu không được sau ngày kết thúc.");
      return;
    }
    setLoading(true);
    setList(null);
    setPage(1);
    setApplied({ ...filters, search: filters.search.trim() });
    setRevision((n) => n + 1);
  }
  function resetFilters() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
    setFilterError("");
    reloadList();
  }
  function open(id: number) {
    if (sending.current) return;
    setMessage("");
    setActionError("");
    void loadDetail(id);
  }
  function close() {
    if (sending.current) return;
    ++detailVersion.current;
    setDetailId(null);
    setDetail(null);
    setMessage("");
    setActionError("");
  }
  async function mutate(kind: "status" | "cancel", rawReason = "") {
    if (sending.current || !detail || detailLoading || denied) return;
    setMessage("");
    setActionError("");
    const reason = rawReason.trim();
    const next =
      kind === "cancel" ? "CANCELLED" : nextPreparation[detail.status];
    if (kind === "cancel") {
      const blocked = cancellationBlock(detail);
      if (blocked) {
        setActionError(blocked);
        return;
      }
      if (!reason || reason.length > 300) {
        setActionError("Nhập lý do hủy từ 1 đến 300 ký tự.");
        return;
      }
    }
    if (!next || !window.confirm(confirmation(detail, next, reason))) return;
    sending.current = true;
    setBusy(true);
    const id = detail.id;
    const version = detailVersion.current;
    try {
      const value = await request(`/admin/orders/${id}/${kind}`, {
        method: kind === "cancel" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "cancel" ? { reason } : { status: next }),
      });
      if (version !== detailVersion.current) return;
      validateAcknowledgement(value, id, next, kind === "cancel");
      const fresh = await loadDetail(id);
      const milestones = ["PAID", "PREPARING", "READY", "COMPLETED"];
      if (
        fresh &&
        (fresh.status === next ||
          (kind === "status" &&
            milestones.indexOf(fresh.status) >= milestones.indexOf(next)))
      ) {
        setMessage(
          kind === "cancel"
            ? "Đã hủy đơn theo xác nhận của máy chủ."
            : "Đã cập nhật trạng thái đơn từ máy chủ.",
        );
      } else if (fresh)
        setActionError(
          "Trạng thái mới khác kết quả cập nhật. Hãy kiểm tra lại dữ liệu máy chủ trước khi thao tác tiếp.",
        );
      else
        setActionError(
          "Máy chủ đã xác nhận cập nhật nhưng chưa tải lại được chi tiết. Hãy tải lại, không gửi lại thao tác cũ.",
        );
      reloadList();
    } catch (cause) {
      if (version !== detailVersion.current) return;
      if (isDenied(cause)) {
        deny(cause);
        return;
      }
      setActionError(orderError(cause));
      // Never replay an uncertain write; re-read authoritative state, including on 409.
      await loadDetail(id);
      reloadList();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return {
    filters,
    setFilters,
    page,
    limit,
    list,
    loading,
    listError,
    filterError,
    denied,
    detail,
    detailId,
    detailLoading,
    detailError,
    actionError,
    message,
    busy,
    apply,
    resetFilters,
    reloadList,
    navigate,
    resize,
    open,
    close,
    loadDetail,
    mutate,
  };
}
export type OrdersModel = ReturnType<typeof useAdminOrders>;
