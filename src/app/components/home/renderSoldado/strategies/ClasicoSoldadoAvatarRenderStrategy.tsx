"use client";

import { useId } from "react";
import type { SoldadoAvatarRenderStrategy } from "../SoldadoAvatarRenderStrategy";

type MiniSoldadoAvatarProps = {
  size: number;
};

function MiniSoldadoAvatarClasico({ size }: MiniSoldadoAvatarProps) {
  const uid = useId().replace(/:/g, "");
  const height = Math.round(size * 1.04);
  const shadowWidth = Math.max(36, Math.round(size * 0.48));
  const shadowHeight = Math.max(8, Math.round(size * 0.1));

  const ids = {
    uniformMain: `soldier-uniform-main-${uid}`,
    uniformDark: `soldier-uniform-dark-${uid}`,
    uniformLight: `soldier-uniform-light-${uid}`,
    helmetMain: `soldier-helmet-main-${uid}`,
    skin: `soldier-skin-${uid}`,
    strap: `soldier-strap-${uid}`,
    metal: `soldier-metal-${uid}`,
    boot: `soldier-boot-${uid}`,
    shadow: `soldier-shadow-${uid}`,
  };

  return (
    <span
      className="soldier-avatar soldier-float relative inline-flex items-end justify-center"
      style={{ width: `${size}px`, height: `${height}px` }}
      aria-hidden="true"
    >
      <span
        className="soldier-shadow absolute rounded-full bg-black/20 blur-[3px]"
        style={{
          bottom: `${Math.max(2, Math.round(size * 0.04))}px`,
          height: `${shadowHeight}px`,
          width: `${shadowWidth}px`,
        }}
      />

      <svg viewBox="0 0 320 336" className="relative h-full w-full">
        <defs>
          <linearGradient id={ids.uniformMain} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#96a67b" />
            <stop offset="100%" stopColor="#6d7d54" />
          </linearGradient>
          <linearGradient id={ids.uniformDark} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b6848" />
            <stop offset="100%" stopColor="#3f4a34" />
          </linearGradient>
          <linearGradient id={ids.uniformLight} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#aebb93" />
            <stop offset="100%" stopColor="#88996a" />
          </linearGradient>
          <linearGradient id={ids.helmetMain} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d7957" />
            <stop offset="100%" stopColor="#48523c" />
          </linearGradient>
          <linearGradient id={ids.skin} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2d9c6" />
            <stop offset="100%" stopColor="#d7a280" />
          </linearGradient>
          <linearGradient id={ids.strap} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f4437" />
            <stop offset="100%" stopColor="#3b3128" />
          </linearGradient>
          <linearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e3cf8d" />
            <stop offset="100%" stopColor="#ab9150" />
          </linearGradient>
          <linearGradient id={ids.boot} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4d4944" />
            <stop offset="100%" stopColor="#262220" />
          </linearGradient>
          <filter id={ids.shadow} x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#182019" floodOpacity="0.14" />
          </filter>
        </defs>

        <g filter={`url(#${ids.shadow})`}>
          <ellipse cx="160" cy="315" rx="72" ry="16" fill="rgba(18,22,17,0.12)" />

          <g className="soldier-body-wrap">
          <g className="soldier-body">
            <path d="M108 124c11-14 30-22 52-22s41 8 52 22l12 17-14 9H122l-14-9 12-17Z" fill={`url(#${ids.uniformDark})`} />
            <path d="M100 153c4-10 10-18 18-23l14 14-7 84c-12-5-21-12-26-21-7-11-7-26 1-45Z" fill={`url(#${ids.uniformMain})`} />
            <path d="M220 153c-4-10-10-18-18-23l-14 14 7 84c12-5 21-12 26-21 7-11 7-26-1-45Z" fill={`url(#${ids.uniformMain})`} />

            <g className="soldier-arm-left">
              <rect x="82" y="214" width="24" height="36" rx="12" fill={`url(#${ids.skin})`} />
              <path d="M72 242c5 10 12 16 20 16 7 0 14-6 20-16v11c-4 9-12 15-20 15-9 0-16-6-20-15v-11Z" fill={`url(#${ids.uniformDark})`} />
            </g>
            <g className="soldier-arm-right">
              <rect x="214" y="214" width="24" height="36" rx="12" fill={`url(#${ids.skin})`} />
              <path d="M208 242c5 10 12 16 20 16 7 0 14-6 20-16v11c-4 9-12 15-20 15-9 0-16-6-20-15v-11Z" fill={`url(#${ids.uniformDark})`} />
            </g>

            <path d="M124 116h72l18 17-7 108c-12 11-28 17-47 17s-35-6-47-17l-7-108 18-17Z" fill={`url(#${ids.uniformMain})`} />
            <path d="M141 124c5 6 12 9 19 9s14-3 19-9" fill="none" stroke="#536046" strokeWidth="4" strokeLinecap="round" />
            <path d="M132 142h20c4 0 7 3 7 7v25c0 4-3 7-7 7h-20c-4 0-7-3-7-7v-25c0-4 3-7 7-7Z" fill={`url(#${ids.uniformLight})`} />
            <path d="M168 142h20c4 0 7 3 7 7v25c0 4-3 7-7 7h-20c-4 0-7-3-7-7v-25c0-4 3-7 7-7Z" fill={`url(#${ids.uniformLight})`} />
            <path d="M132 151h20" fill="none" stroke="#667452" strokeWidth="2" strokeLinecap="round" />
            <path d="M168 151h20" fill="none" stroke="#667452" strokeWidth="2" strokeLinecap="round" />

            <path d="M145 133h30c5 0 9 4 9 9v69c0 5-4 9-9 9h-30c-5 0-9-4-9-9v-69c0-5 4-9 9-9Z" fill={`url(#${ids.strap})`} />
            <circle cx="160" cy="153" r="5" fill={`url(#${ids.metal})`} />
            <circle cx="160" cy="177" r="5" fill={`url(#${ids.metal})`} />
            <circle cx="160" cy="201" r="5" fill={`url(#${ids.metal})`} />
            <path d="M124 124 147 234" fill="none" stroke="#435035" strokeWidth="7" strokeLinecap="round" />
            <path d="M196 124 173 234" fill="none" stroke="#435035" strokeWidth="7" strokeLinecap="round" />
            <path d="M140 210h40c8 0 13 5 13 12v7h-66v-7c0-7 5-12 13-12Z" fill={`url(#${ids.uniformDark})`} />
            <rect x="142" y="215" width="36" height="14" rx="7" fill="#5d4e3c" />
            <rect x="150" y="218" width="20" height="8" rx="4" fill={`url(#${ids.metal})`} />

            <g className="soldier-leg-left">
              <path d="M136 226h20v80h-20c-6 0-10-4-10-10v-60c0-6 4-10 10-10Z" fill={`url(#${ids.uniformMain})`} />
              <path d="M140 266h10" fill="none" stroke="#566247" strokeWidth="3" strokeLinecap="round" />
              <path d="M126 306h34v19h-42c1-7 4-13 8-19Z" fill={`url(#${ids.boot})`} />
            </g>
            <g className="soldier-leg-right">
              <path d="M164 226h20c6 0 10 4 10 10v60c0 6-4 10-10 10h-20v-80Z" fill={`url(#${ids.uniformMain})`} />
              <path d="M170 266h10" fill="none" stroke="#566247" strokeWidth="3" strokeLinecap="round" />
              <path d="M160 306h34c4 6 7 12 8 19h-42v-19Z" fill={`url(#${ids.boot})`} />
            </g>
            <rect x="156" y="230" width="8" height="76" rx="3" fill="#7f9065" />
          </g>
          </g>

          <g className="soldier-head-wrap">
          <g className="soldier-head">
            <path d="M145 96h30v18c0 6-7 10-15 10s-15-4-15-10V96Z" fill="#c98d6d" />
            <ellipse cx="160" cy="71" rx="33" ry="37" fill={`url(#${ids.skin})`} />
            <ellipse cx="128" cy="74" rx="5" ry="8" fill="#d09f80" />
            <ellipse cx="192" cy="74" rx="5" ry="8" fill="#d09f80" />
            <path d="M141 60c4-3 10-5 19-5 8 0 14 2 19 5" fill="none" stroke="#7a5442" strokeWidth="3" strokeLinecap="round" />
            <path d="M142 69c3-2 6-3 10-3" fill="none" stroke="#6a4736" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M168 66c4 0 7 1 10 3" fill="none" stroke="#6a4736" strokeWidth="2.4" strokeLinecap="round" />
            <ellipse className="soldier-eye" cx="149" cy="80" rx="3.5" ry="3.7" fill="#20241d" />
            <ellipse className="soldier-eye" cx="171" cy="80" rx="3.5" ry="3.7" fill="#20241d" />
            <circle cx="150" cy="79" r="0.9" fill="rgba(255,255,255,0.85)" />
            <circle cx="172" cy="79" r="0.9" fill="rgba(255,255,255,0.85)" />
            <path d="M160 81c-1 5-2 9-4 12 1 1 3 2 4 2s3-1 5-2c-3-3-4-7-4-12h-1Z" fill="#c48e70" />
            <path d="M147 101c4 4 8 5 13 5s9-1 13-5" fill="none" stroke="#875c48" strokeWidth="3" strokeLinecap="round" />

            <path d="M124 58c4-22 18-35 36-41 18 6 32 19 36 41v15h-72V58Z" fill={`url(#${ids.helmetMain})`} />
            <path d="M130 64c9 5 19 7 30 7s21-2 30-7v10h-60V64Z" fill="#5e6b49" />
            <rect x="144" y="47" width="32" height="12" rx="6" fill="#748160" />
            <rect x="151" y="50" width="18" height="6" rx="3" fill={`url(#${ids.metal})`} />
          </g>
          </g>
        </g>
      </svg>
    </span>
  );
}

export const clasicoSoldadoAvatarRenderStrategy: SoldadoAvatarRenderStrategy = {
  canHandle: (context) => context.variant === "CLASICO",
  render: (context) => <MiniSoldadoAvatarClasico size={context.size} />,
};
