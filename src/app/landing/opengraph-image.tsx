import { ImageResponse } from 'next/og';
import { SITE_HOST } from '@/lib/site';

export const runtime = 'edge';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

const statCards = [
  { value: 'SYNC', label: 'Cuenta opcional' },
  { value: 'IDB', label: 'Cache local' },
  { value: 'PREF', label: 'Preferencias' },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          color: '#ffffff',
          background:
            'radial-gradient(circle at 18% 22%, rgba(59,130,246,0.32) 0%, transparent 34%), radial-gradient(circle at 82% 18%, rgba(99,102,241,0.24) 0%, transparent 30%), linear-gradient(135deg, #050816 0%, #0a1022 46%, #050816 100%)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(120deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0.03) 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 60,
            top: 68,
            width: 360,
            height: 360,
            borderRadius: 48,
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 28%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 24px 120px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 24,
              left: 24,
              right: 24,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.62)',
            }}
          >
            <span>Push Day</span>
            <span>52 min</span>
          </div>

          <div
            style={{
              position: 'absolute',
              inset: '92px 24px 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
            }}
          >
            {[
              { label: 'Sets', value: '24', color: '#7dd3fc' },
              { label: 'Volume', value: '4.2t', color: '#a5b4fc' },
              { label: 'PRs', value: '3', color: '#fbbf24' },
              { label: 'Streak', value: '8d', color: '#34d399' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 24,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '18px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.36)',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 44,
                    lineHeight: 1,
                    fontWeight: 900,
                    color: item.color,
                    letterSpacing: '-0.05em',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '64px 72px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 100%)',
                boxShadow: '0 0 24px rgba(96,165,250,0.65)',
              }}
            />
            <span
              style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: '0.38em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.74)',
              }}
            >
              Routyne
            </span>
          </div>

          <div style={{ maxWidth: 590, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span
                style={{
                  display: 'inline-flex',
                  width: 'fit-content',
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#93c5fd',
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                Cuenta, sincronización y progreso
              </span>
              <h1
                style={{
                  margin: 0,
                  fontSize: 76,
                  lineHeight: 0.95,
                  fontWeight: 900,
                  letterSpacing: '-0.06em',
                }}
              >
                Entrena.
                <br />
                Progresa.
                <br />
                Domina.
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 520,
                  fontSize: 27,
                  lineHeight: 1.35,
                  color: 'rgba(255,255,255,0.70)',
                  fontWeight: 500,
                }}
              >
                Rutina, progresión, historial y preferencias en un flujo móvil con sincronización real cuando la activas.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {statCards.map((card) => (
                <div
                  key={card.label}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.09)',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    minWidth: 170,
                  }}
                >
                  <span
                    style={{
                      fontSize: 19,
                      fontWeight: 900,
                      color: '#ffffff',
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {card.value}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.42)',
                    }}
                  >
                    {card.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
            }}
          >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.32)',
                }}
              >
              Workout tracker con sincronización opcional
              </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              {SITE_HOST}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
