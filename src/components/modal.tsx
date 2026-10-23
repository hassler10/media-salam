"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Boîte de dialogue rendue sur le corps du document : dans un tableau,
 * l'ancêtre animé servirait de cadre au « position: fixed » et la couperait.
 */
export function Modal({
  title,
  children,
  footer,
  className,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="modal-backdrop">
      <div className={className ? `modal ${className}` : "modal"}>
        <h3>{title}</h3>
        {children}
        <div className="modal-actions">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}
