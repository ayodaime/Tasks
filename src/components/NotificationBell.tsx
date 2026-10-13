"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { enablePushNotifications, getExistingSubscription, isPushSupported } from "@/lib/pushClient";
import type { NotificationItem } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<"unknown" | "none" | "subscribed" | "denied" | "unsupported">("unknown");
  const [enabling, setEnabling] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: notifications, mutate } = useSWR<NotificationItem[]>("/api/notifications", fetcher, {
    refreshInterval: 30000,
  });
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    getExistingSubscription().then((sub) => setPushState(sub ? "subscribed" : "none"));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleEnable() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) {
      setPushState("unsupported");
      return;
    }
    setEnabling(true);
    try {
      await enablePushNotifications(key);
      setPushState("subscribed");
    } catch {
      setPushState(Notification.permission === "denied" ? "denied" : "none");
    } finally {
      setEnabling(false);
    }
  }

  async function openNotification(n: NotificationItem) {
    setOpen(false);
    if (!n.read) {
      mutate((current) => current?.map((x) => (x.id === n.id ? { ...x, read: true } : x)), { revalidate: false });
      fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      }).then(() => mutate());
    }
  }

  async function markAllRead() {
    mutate((current) => current?.map((n) => ({ ...n, read: true })), { revalidate: false });
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    mutate();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-80 max-w-[90vw] animate-slide-up rounded-xl border border-slate-200/80 bg-white shadow-popover ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.taskId ? `/tasks/${n.taskId}` : "/tasks"}
                      onClick={() => openNotification(n)}
                      className={`flex items-start gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 ${!n.read ? "bg-brand-50/60" : ""}`}
                    >
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                      <span className={`min-w-0 flex-1 ${n.read ? "text-slate-500" : "text-slate-800"}`}>
                        <span className="block">{n.message}</span>
                        <span className="text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pushState === "none" && (
            <div className="border-t border-slate-100 p-3">
              <button onClick={handleEnable} disabled={enabling} className="btn-secondary w-full text-xs">
                {enabling ? "Enabling…" : "Get notified even when you're away from this tab"}
              </button>
            </div>
          )}
          {pushState === "denied" && (
            <p className="border-t border-slate-100 p-3 text-center text-xs text-slate-400">
              Notifications are blocked in your browser. Enable them in site settings to get pushed alerts.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
