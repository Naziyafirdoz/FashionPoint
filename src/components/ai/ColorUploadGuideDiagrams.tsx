import type { ComponentType } from "react";

const OUTLINE = "#7B0D2B";
const FABRIC = "#1D4ED8";
const FABRIC_RED = "#DC2626";
const ZARI = "#D4D4D8";
const GOLD = "#D4AF37";
const BLUSH = "#FDF2F8";

type DiagramProps = {
  className?: string;
};

function SareeBody({ x, color = FABRIC }: { x: number; color?: string }) {
  return (
    <>
      <path
        d={`M${x + 18} 18 L${x + 34} 88 L${x + 50} 18 Z`}
        fill={color}
        stroke={OUTLINE}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect x={x + 16} y={16} width={36} height={6} rx={2} fill={GOLD} />
      <rect x={x + 16} y={86} width={36} height={5} rx={2} fill={GOLD} />
    </>
  );
}

function FullSareeDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect width="200" height="140" rx="12" fill={BLUSH} />
      <SareeBody x={78} color={FABRIC} />
      <rect x="58" y="18" width="84" height="74" rx="6" fill="none" stroke={OUTLINE} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.55" />
      <path d="M78 24 Q68 50 62 88" stroke={OUTLINE} strokeWidth="1" fill="none" opacity="0.35" />
    </svg>
  );
}

function PalluDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect width="200" height="140" rx="12" fill={BLUSH} />
      <SareeBody x={78} color={FABRIC} />
      <rect x={54} y={30} width={30} height={52} rx={5} fill={GOLD} opacity="0.9" stroke={OUTLINE} strokeWidth="1.5" />
      <path d="M60 40 H78 M60 50 H78 M60 60 H78 M60 70 H78" stroke={OUTLINE} strokeWidth="1" opacity="0.45" />
    </svg>
  );
}

function BorderDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect width="200" height="140" rx="12" fill={BLUSH} />
      <rect x="68" y="36" width="64" height="68" rx="4" fill={FABRIC_RED} opacity="0.55" />
      <rect x="64" y="32" width="72" height="14" rx="3" fill={GOLD} stroke={OUTLINE} strokeWidth="1.5" />
      <rect x="64" y="94" width="72" height="14" rx="3" fill={GOLD} stroke={OUTLINE} strokeWidth="1.5" />
      <rect x="56" y="32" width="12" height="76" rx="2" fill={ZARI} stroke={OUTLINE} strokeWidth="1.2" />
      <rect x="56" y="32" width="12" height="76" rx="2" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
    </svg>
  );
}

function EmbroideryDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect width="200" height="140" rx="12" fill={BLUSH} />
      <rect x="64" y="36" width="72" height="68" rx="6" fill={FABRIC} opacity="0.35" />
      <circle cx="88" cy="58" r="8" fill={ZARI} stroke={OUTLINE} strokeWidth="0.8" />
      <circle cx="118" cy="72" r="8" fill={ZARI} stroke={OUTLINE} strokeWidth="0.8" />
      <circle cx="98" cy="88" r="8" fill={ZARI} stroke={OUTLINE} strokeWidth="0.8" />
      <path d="M88 58 L118 72 L98 88 Z" stroke={GOLD} strokeWidth="1.5" fill="none" />
      <rect x="64" y="36" width="72" height="68" rx="6" fill="none" stroke={OUTLINE} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
    </svg>
  );
}

function LightingDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect width="200" height="140" rx="12" fill={BLUSH} />
      <rect x="10" y="18" width="86" height="104" rx="10" fill="#F0FDF4" stroke="#15803D" strokeWidth="1.5" />
      <circle cx="34" cy="38" r="14" fill="#FDE68A" />
      <path d="M34 18 L34 10 M34 66 L34 74 M18 38 L10 38 M50 38 L58 38" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <SareeBody x={36} color={FABRIC} />

      <rect x="104" y="18" width="86" height="104" rx="10" fill="#1F2937" stroke="#B91C1C" strokeWidth="1.5" />
      <rect x="104" y="18" width="86" height="104" rx="10" fill="#000" opacity="0.35" />
      <circle cx="168" cy="34" r="8" fill="#FEF3C7" opacity="0.9" />
      <path d="M148 50 L172 70" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <SareeBody x={130} color="#374151" />
    </svg>
  );
}

const DIAGRAMS: Record<string, ComponentType<DiagramProps>> = {
  "full-saree": FullSareeDiagram,
  pallu: PalluDiagram,
  border: BorderDiagram,
  embroidery: EmbroideryDiagram,
  lighting: LightingDiagram
};

export function ColorUploadGuideDiagram({
  variant,
  className
}: {
  variant: keyof typeof DIAGRAMS;
  className?: string;
}) {
  const Diagram = DIAGRAMS[variant];
  return <Diagram className={className} />;
}
