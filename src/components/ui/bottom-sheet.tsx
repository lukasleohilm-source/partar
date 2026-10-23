"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

// Neðsta-skjás gluggi byggður á <dialog> (aðgengilegur, lokast með Esc og bakgrunnssmelli)
export function BottomSheet({ open, onClose, title, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="mx-auto mb-0 mt-auto max-h-[88dvh] w-full max-w-md rounded-t-2xl bg-stone-50 p-0 backdrop:bg-black/40"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Loka" className="-mr-2 px-2 text-xl text-stone-500">
            <X size={22} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <footer className="border-t border-stone-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</footer>}
      </div>
    </dialog>
  );
}
