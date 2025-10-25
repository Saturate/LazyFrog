import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'LazyFrog - Automation Bot for Sword & Supper';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(to bottom right, #d1fae5, #a7f3d0)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        <div style={{ fontSize: 180, marginBottom: 20 }}>🐸</div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 'bold',
            color: '#047857',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          LazyFrog
        </div>
        <div
          style={{
            fontSize: 40,
            color: '#059669',
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          Automation Bot for Sword & Supper
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#10b981',
            marginTop: 40,
            display: 'flex',
            gap: 40,
          }}
        >
          <span>✅ Auto Mission Finder</span>
          <span>✅ Customizable Choices</span>
          <span>✅ Smart Decisions</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
