import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fbf8f3',
          borderRadius: 36,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <path fill="#2f5d50" d="M16 4 9 15h4.5L11 22h10l-2.5-7H23L16 4Z" />
          <rect x="14" y="22" width="4" height="6" rx="0.5" fill="#4a3f35" />
          <circle cx="12" cy="14" r="1.6" fill="#b85c38" />
          <circle cx="20" cy="14" r="1.6" fill="#3d6b8e" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
