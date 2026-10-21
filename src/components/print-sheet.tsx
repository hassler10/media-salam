"use client";

import { MembershipCard, type CardData } from "@/components/membership-card";

export function PrintSheet({ data }: { data: CardData }) {
  return (
    <div className="print-sheet">
      <div className="print-card-frame">
        <span className="crop-mark tl" />
        <span className="crop-mark tr" />
        <span className="crop-mark bl" />
        <span className="crop-mark br" />
        <MembershipCard data={data} />
      </div>
    </div>
  );
}
