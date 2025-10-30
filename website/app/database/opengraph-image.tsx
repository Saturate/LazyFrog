import { ImageResponse } from "next/og";
import missions from "@/../../db/missions.json";

// Image metadata
export const alt = "LazyFrog Mission Database";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-static";

// Image generation
export default async function Image() {
  const missionCount = Object.keys(missions).length;
  const timestamps = Object.values(missions).map((m: any) => m.timestamp);
  const lastUpdated = new Date(Math.max(...timestamps)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: "linear-gradient(to bottom right, #064e3b, #065f46)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 30 }}>📊</div>
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: "#6ee7b7",
            marginBottom: 30,
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
          }}
        >
          Mission Database
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#d1fae5",
            marginTop: 30,
            display: "flex",
            gap: 80,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 56, fontWeight: "bold", color: "#6ee7b7" }}>{missionCount}</div>
            <div style={{ fontSize: 28, color: "#a7f3d0" }}>Missions</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 40, fontWeight: "bold", color: "#6ee7b7" }}>{lastUpdated}</div>
            <div style={{ fontSize: 28, color: "#a7f3d0" }}>Last Updated</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
