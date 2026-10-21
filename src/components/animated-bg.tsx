"use client";

const PARTICLES = Array.from({ length: 28 }, (_, i) => i);

export function AnimatedBg({
  variant = "immersive",
}: {
  variant?: "immersive" | "app";
}) {
  return (
    <div className={`animated-bg animated-bg-${variant}`} aria-hidden="true">
      <div className="abg-base" />
      <div className="abg-aurora a" />
      <div className="abg-aurora b" />
      <div className="abg-aurora c" />
      <div className="abg-geometry" />
      <div className="abg-rays" />
      <div className="abg-crescent" />
      <div className="abg-minaret" />
      <div className="abg-orbs">
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
        <span className="orb o4" />
      </div>
      <div className="abg-particles">
        {PARTICLES.map((i) => (
          <span key={i} style={{ ["--i" as string]: i }} />
        ))}
      </div>
      <div className="abg-shimmer" />
      <div className="abg-vignette" />
    </div>
  );
}
