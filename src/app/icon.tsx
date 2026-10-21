import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          background: "#0C5A35",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C9A227",
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        BS
      </div>
    ),
    size,
  );
}
