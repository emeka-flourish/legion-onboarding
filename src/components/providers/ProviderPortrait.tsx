import { useId, type ReactNode } from "react";
import { BG, HAIR, SCARF, SKIN, TOP, type Portrait } from "@/data/portraits";
import { cx } from "@/lib/cx";

/** Front hair, drawn over the head. */
function frontHair(style: Portrait["hair"], color: string): ReactNode {
  switch (style) {
    case "short":
      return <path d="M20.3 28 C19.8 18.5 25 14.6 32.2 14.6 C39.5 14.6 44.6 18.8 43.8 28 C42.6 23.8 40.2 21.2 36.4 20.6 C32.4 22.4 26.4 23 22.4 21.8 C21.2 23.6 20.6 25.6 20.3 28 Z" fill={color} />;
    case "side":
      return <path d="M20.2 29 C19 19 24.8 14.2 32.4 14.4 C40.4 14.6 45.2 19.4 43.9 28.6 C43 24.4 41.4 22.2 38.6 20.6 C34 22.8 27 21.8 23.4 19.8 C21.6 22.6 20.6 25.6 20.2 29 Z" fill={color} />;
    case "buzz":
      return <path d="M20.6 26.5 C20.6 19 25.6 15.4 32 15.4 C38.4 15.4 43.4 19 43.4 26.5 C41 20.8 37 18.8 32 18.8 C27 18.8 23 20.8 20.6 26.5 Z" fill={color} opacity={0.85} />;
    case "waves":
      return <path d="M20.2 28.5 C19.4 18.6 25 14.2 32 14.2 C39 14.2 44.6 18.6 43.8 28.5 C43 24.8 41.6 22.6 39.4 21.4 C37.6 22.6 35.6 21.2 33.6 22.2 C31.6 23.2 29.6 21.8 27.6 22.8 C25.6 23.8 23.6 22.4 22 23.4 C21 24.8 20.5 26.6 20.2 28.5 Z" fill={color} />;
    case "curly":
      return (
        <g fill={color}>
          {[
            [21.6, 22.6, 4.1],
            [25.6, 18.2, 4.5],
            [31.2, 15.8, 4.8],
            [36.9, 16.8, 4.6],
            [41.6, 21, 4.3],
            [20.4, 27.4, 3.2],
            [43.4, 26.6, 3.2],
            [28.4, 19.8, 3.6],
            [34.6, 19.4, 3.6],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      );
    case "coily":
      return <path d="M19.8 27 C18.4 22 20.4 15.6 26 13.4 C29.6 11.8 34.4 11.8 38 13.4 C43.6 15.6 45.6 22 44.2 27 C42.6 22.6 39.6 20.2 35.6 20 C33 21 31 21 28.4 20 C24.4 20.2 21.4 22.6 19.8 27 Z" fill={color} />;
    case "long":
    case "bob":
      return <path d="M20.4 29.5 C19.8 19.4 25 15 32 15 C39 15 44.2 19.4 43.6 29.5 C42.2 23.6 39.6 21 36 20.4 C34.4 22.6 30 23.6 25.6 22.6 C23 24.2 21.2 26.6 20.4 29.5 Z" fill={color} />;
    case "bun":
      return (
        <g fill={color}>
          <circle cx={32} cy={11.4} r={5.2} />
          <path d="M20.6 28.6 C20 19.2 25.2 15.2 32 15.2 C38.8 15.2 44 19.2 43.4 28.6 C42 23 38.6 20.4 32 20.4 C25.4 20.4 22 23 20.6 28.6 Z" />
        </g>
      );
    case "locs":
      return <path d="M20.2 29 C19.6 19 25 14.6 32 14.6 C39 14.6 44.4 19 43.8 29 C42.4 23.4 39.6 20.8 36.2 20.2 C33.6 21.8 30.4 21.8 27.8 20.2 C24.4 20.8 21.6 23.4 20.2 29 Z" fill={color} />;
    default:
      return null;
  }
}

/** Hair or a scarf behind the head and shoulders. */
function backHair(p: Portrait, color: string): ReactNode {
  switch (p.hair) {
    case "long":
      return <path d="M18.6 30 C17.2 16 25 12 32 12 C39 12 46.8 16 45.4 30 C45 40 47.2 46 45 52 L19 52 C16.8 46 19 40 18.6 30 Z" fill={color} />;
    case "bob":
      return <path d="M19 31 C18 17 25 13 32 13 C39 13 46 17 45 31 C45 35.6 45.6 38.8 44 41.2 L20 41.2 C18.4 38.8 19 35.6 19 31 Z" fill={color} />;
    case "coily":
      return <ellipse cx={32} cy={24.6} rx={16.2} ry={14.2} fill={color} />;
    case "locs":
      return (
        <g fill={color}>
          {[18.8, 21.4, 24, 40, 42.6, 45.2].map((x) => (
            <rect key={x} x={x - 1.3} y={22} width={2.6} height={x < 30 ? 28 : 28} rx={1.3} />
          ))}
          <path d="M19 30 C17.6 16.4 25 12.4 32 12.4 C39 12.4 46.4 16.4 45 30 Z" />
        </g>
      );
    case "headscarf":
      return <path d="M18.6 30.5 C17.8 16 25 12.2 32 12.2 C39 12.2 46.2 16 45.4 30.5 C45.8 37.6 44.2 43.6 40.4 48.4 L23.6 48.4 C19.8 43.6 18.2 37.6 18.6 30.5 Z" fill={SCARF[p.scarf ?? "teal"]} />;
    default:
      return null;
  }
}

/**
 * An illustrated placeholder portrait for an invented provider (Emeka's request, 2026-10-11). Drawn from a few
 * attributes, so every provider looks different without using a photo of a real person. Decorative: the name sits
 * next to it.
 */
export function ProviderPortrait({ portrait: p, size = 56, className }: { portrait: Portrait; size?: number; className?: string }) {
  const clip = useId();
  const skin = SKIN[p.skin];
  const hair = HAIR[p.hairColor];
  const scarf = p.hair === "headscarf";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={cx("shrink-0 rounded-full", className)}>
      <defs>
        <clipPath id={clip}>
          <circle cx={32} cy={32} r={32} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width={64} height={64} fill={BG[p.bg]} />
        {/* Everything below is drawn 10% larger about the chin, so the face reads at card size. */}
        <g transform="matrix(1.1 0 0 1.1 -3.2 -3.6)">
        {backHair(p, hair)}
        {/* Neck and shoulders, with a white coat's lapels over the shirt. */}
        <path d="M27 37.5 h10 v9 c0 2.8 -2.2 5 -5 5 s-5 -2.2 -5 -5 z" fill={skin} />
        <path d="M27 41.5 c3 2.2 7 2.2 10 0 v-4 h-10 z" fill="#000" opacity={0.08} />
        <path d="M7 64 C8 52.5 18.5 46.2 32 46.2 C45.5 46.2 56 52.5 57 64 Z" fill={TOP[p.top]} />
        <path d="M18.4 64 L26.6 47.2 L32 55.6 Z M45.6 64 L37.4 47.2 L32 55.6 Z" fill="#FFFFFF" opacity={0.92} />
        {scarf && <path d="M23.6 44 C26 48.6 29 50.6 32 50.6 C35 50.6 38 48.6 40.4 44 L40.4 48.6 C38 52 35 53.6 32 53.6 C29 53.6 26 52 23.6 48.6 Z" fill={SCARF[p.scarf ?? "teal"]} />}
        {!scarf && (
          <>
            <circle cx={20.6} cy={30.4} r={2.6} fill={skin} />
            <circle cx={43.4} cy={30.4} r={2.6} fill={skin} />
          </>
        )}
        <ellipse cx={32} cy={29} rx={11.5} ry={13} fill={skin} />
        {p.beard && (
          <path d="M20.8 29.6 C21.2 39.6 25.6 43.6 32 43.6 C38.4 43.6 42.8 39.6 43.2 29.6 C41.6 35.8 37.8 38.4 32 38.5 C26.2 38.4 22.4 35.8 20.8 29.6 Z" fill={hair} opacity={0.9} />
        )}
        {scarf ? (
          <path d="M20.4 25.4 C21.6 18.4 26.6 15.4 32 15.4 C37.4 15.4 42.4 18.4 43.6 25.4 C40.2 21.4 36.4 20.2 32 20.2 C27.6 20.2 23.8 21.4 20.4 25.4 Z" fill={SCARF[p.scarf ?? "teal"]} />
        ) : (
          frontHair(p.hair, hair)
        )}
        {/* Face */}
        <path d="M25.6 25.8 q2.2 -1.2 4.4 0 M34 25.8 q2.2 -1.2 4.4 0" stroke={scarf ? HAIR.black : hair} strokeWidth={1.3} strokeLinecap="round" fill="none" />
        <circle cx={27.8} cy={29.4} r={1.3} fill="#2A211C" />
        <circle cx={36.2} cy={29.4} r={1.3} fill="#2A211C" />
        <path d="M32 31 q-1.2 3 0.4 3.6" stroke="#000" strokeOpacity={0.25} strokeWidth={1} strokeLinecap="round" fill="none" />
        <path d="M28.8 36 q3.2 2.6 6.4 0" stroke={p.beard ? "#F3D2C1" : "#8A3F2E"} strokeWidth={1.4} strokeLinecap="round" fill="none" />
        <circle cx={25.2} cy={33.4} r={2} fill="#F28B82" opacity={0.18} />
        <circle cx={38.8} cy={33.4} r={2} fill="#F28B82" opacity={0.18} />
        {p.glasses && (
          <g stroke="#1F2937" strokeWidth={1} fill="#FFFFFF" fillOpacity={0.12}>
            <rect x={24.2} y={26.9} width={7} height={5.2} rx={2.2} />
            <rect x={32.8} y={26.9} width={7} height={5.2} rx={2.2} />
            <path d="M31.2 29 h1.6" fill="none" />
          </g>
        )}
        </g>
      </g>
    </svg>
  );
}
