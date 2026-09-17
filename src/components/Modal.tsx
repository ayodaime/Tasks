"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function close() {
    router.back();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={close} />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-slate-50 p-6 shadow-xl">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          ✕
        </button>
        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}
