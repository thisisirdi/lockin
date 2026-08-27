import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #17181a 0%, #08090a 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: "31px 31px 0 0",
              border: "13px solid #d9a86c",
              borderBottom: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              width: 78,
              height: 62,
              marginTop: -13,
              borderRadius: 17,
              background: "linear-gradient(160deg, #e8c393 0%, #c68d4e 100%)",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
