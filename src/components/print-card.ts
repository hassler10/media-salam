"use client";

import { A4_HEIGHT_MM, A4_WIDTH_MM, CARD_HEIGHT_MM, CARD_WIDTH_MM } from "@/lib/constants";

export async function downloadCardPdf(element: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(element, {
    scale: 4,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  const img = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, "F");
  const x = (A4_WIDTH_MM - CARD_WIDTH_MM) / 2;
  const y = (A4_HEIGHT_MM - CARD_HEIGHT_MM) / 2;
  pdf.addImage(img, "JPEG", x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, "FAST");
  const mark = 4;
  const gap = 1.2;
  pdf.setDrawColor(40);
  pdf.setLineWidth(0.15);
  const corners = [
    [x, y],
    [x + CARD_WIDTH_MM, y],
    [x, y + CARD_HEIGHT_MM],
    [x + CARD_WIDTH_MM, y + CARD_HEIGHT_MM],
  ] as const;
  corners.forEach(([cx, cy], i) => {
    const dirX = i % 2 === 0 ? -1 : 1;
    const dirY = i < 2 ? -1 : 1;
    pdf.line(cx + dirX * gap, cy, cx + dirX * (gap + mark), cy);
    pdf.line(cx, cy + dirY * gap, cx, cy + dirY * (gap + mark));
  });
  pdf.save(filename);
}

export function printCurrentPage() {
  window.print();
}
