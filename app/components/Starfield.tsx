"use client";

import { useMemo } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
  cool: boolean;
};

function seededValue(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export default function Starfield({ zoom = 1.4 }: { zoom?: number }) {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 120 }, (_, index) => ({
        x: seededValue(index, 1) * 100,
        y: seededValue(index, 2) * 100,
        size: 1 + seededValue(index, 3) * 2.5,
        opacity: 0.2 + seededValue(index, 4) * 0.65,
        delay: seededValue(index, 5) * -18,
        duration: 12 + seededValue(index, 6) * 20,
        cool: seededValue(index, 7) > 0.82,
      })),
    [],
  );

  return (
    <div
      className="pulse-starfield"
      aria-hidden="true"
      style={
        {
          "--star-mask-start": `${Math.max(34, Math.min(100, 34 * 2 ** (zoom - 1.4)))}%`,
          "--star-mask-fade": `${Math.max(48, Math.min(100, 48 * 2 ** (zoom - 1.4)))}%`,
        } as React.CSSProperties
      }
    >
      {stars.map((star, index) => (
        <span
          key={index}
          className={`pulse-star${star.cool ? " pulse-star-cool" : ""}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
