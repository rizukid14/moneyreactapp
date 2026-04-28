import React from 'react';

// Read theme synchronously from localStorage cache (mirrored from IndexedDB)
const getCachedTheme = (): 'light' | 'dark' => {
  try {
    const cached = localStorage.getItem('moneyapp-theme');
    if (cached === 'dark') return 'dark';
  } catch {}
  return 'light';
};

const THEME_COLORS = {
  light: {
    bg: '#f8f9fb',
    logoGlow: 'rgba(245, 158, 11, 0.18)',
    logoGlowLarge: 'rgba(245, 158, 11, 0.08)',
  },
  dark: {
    bg: '#0f172a',
    logoGlow: 'rgba(245, 158, 11, 0.3)',
    logoGlowLarge: 'rgba(245, 158, 11, 0.15)',
  },
};

const SplashScreen: React.FC = () => {
  const theme = getCachedTheme();
  const colors = THEME_COLORS[theme];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      zIndex: 99999,
    }}>
      <style>{`
        @keyframes splash-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes splash-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes splash-dots {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      `}</style>

      {/* Logo container with pulse animation */}
      <div style={{
        animation: 'splash-pulse 2s ease-in-out infinite',
        marginBottom: '24px',
      }}>
        <div style={{
          width: 88,
          height: 88,
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 32px ${colors.logoGlow}, 0 0 64px ${colors.logoGlowLarge}`,
        }}>
          {/* Piggy bank icon inline SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="56" height="56">
            <ellipse cx="24" cy="26" rx="16" ry="14" fill="rgba(255,255,255,0.95)"/>
            <ellipse cx="36" cy="27" rx="5" ry="4" fill="rgba(255,255,255,0.7)"/>
            <circle cx="35" cy="26" r="1" fill="#D97706"/>
            <circle cx="38" cy="26" r="1" fill="#D97706"/>
            <circle cx="30" cy="21" r="2.5" fill="white"/>
            <circle cx="30.5" cy="20.5" r="1.2" fill="#1E293B"/>
            <circle cx="31" cy="20" r="0.4" fill="white"/>
            <ellipse cx="17" cy="14" rx="4" ry="5" fill="rgba(255,255,255,0.95)" transform="rotate(-20 17 14)"/>
            <ellipse cx="17" cy="14" rx="2.5" ry="3.5" fill="rgba(255,255,255,0.7)" transform="rotate(-20 17 14)"/>
            <ellipse cx="27" cy="13" rx="4" ry="5" fill="rgba(255,255,255,0.95)" transform="rotate(10 27 13)"/>
            <ellipse cx="27" cy="13" rx="2.5" ry="3.5" fill="rgba(255,255,255,0.7)" transform="rotate(10 27 13)"/>
            <rect x="20" y="12" width="6" height="2" rx="1" fill="#D97706"/>
            <rect x="13" y="36" width="4" height="5" rx="2" fill="rgba(255,255,255,0.95)"/>
            <rect x="29" y="36" width="4" height="5" rx="2" fill="rgba(255,255,255,0.95)"/>
            <path d="M8 24 Q4 22 5 18 Q6 15 8 17" stroke="rgba(255,255,255,0.95)" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <ellipse cx="28" cy="29" rx="3" ry="2" fill="rgba(255,255,255,0.5)" opacity="0.5"/>
          </svg>
        </div>
      </div>

      {/* App name */}
      <div style={{
        animation: 'splash-fade-in 0.6s ease-out 0.2s both',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, #FBBF24, #F59E0B, #D97706)',
          backgroundSize: '200% auto',
          animation: 'splash-shimmer 3s linear infinite',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          MoneyApp
        </h1>
      </div>

      {/* Loading dots */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginTop: '32px',
        animation: 'splash-fade-in 0.6s ease-out 0.5s both',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#F59E0B',
            opacity: 0,
            animation: `splash-dots 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
