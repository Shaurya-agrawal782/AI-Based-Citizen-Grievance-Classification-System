export default function FixedLandingVideo() {
  const layerStyle = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  };

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <video
        className="landing-bg-video"
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          ...layerStyle,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.88,
          filter: 'blur(1px)',
          transform: 'scale(1.03)',
        }}
      >
        <source src="/videos/civictrust-light-hero.mp4" type="video/mp4" />
      </video>

      <div
        aria-hidden="true"
        style={{
          ...layerStyle,
          background: 'rgba(255,255,255,0.32)',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          ...layerStyle,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.46) 0%, rgba(248,250,252,0.28) 52%, rgba(236,254,255,0.12) 100%)',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          ...layerStyle,
          background:
            'linear-gradient(to right, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.66) 38%, rgba(255,255,255,0.04) 72%, transparent 100%)',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          height: '8rem',
          width: '16rem',
          background:
            'linear-gradient(to top left, rgba(255,255,255,0.95) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
