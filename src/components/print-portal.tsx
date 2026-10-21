"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function PrintPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<div className="print-root">{children}</div>, document.body);
}
