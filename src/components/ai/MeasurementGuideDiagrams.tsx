import type { ComponentType } from "react";
import type { MeasurementField } from "@/config/size-chart";

const SKIN = "#F5E6DC";
const OUTLINE = "#7B0D2B";
const TAPE = "#B8860B";
const TAPE_FILL = "rgba(184, 134, 11, 0.25)";

type DiagramProps = {
  className?: string;
};

function TorsoBase() {
  return (
    <>
      <ellipse cx="60" cy="22" rx="14" ry="16" fill={SKIN} stroke={OUTLINE} strokeWidth="1.5" />
      <path
        d="M46 36 Q60 42 74 36 L78 118 Q60 126 42 118 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M42 48 L28 90 M78 48 L92 90"
        fill="none"
        stroke={OUTLINE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  );
}

function TapeBand({ y, label }: { y: number; label?: string }) {
  return (
    <>
      <rect x="38" y={y - 5} width="44" height="10" rx="2" fill={TAPE_FILL} stroke={TAPE} strokeWidth="1.5" />
      <path
        d={`M34 ${y} L38 ${y - 3} L38 ${y + 3} Z M86 ${y} L82 ${y - 3} L82 ${y + 3} Z`}
        fill={TAPE}
      />
      {label ? (
        <text x="60" y={y + 22} textAnchor="middle" fill={OUTLINE} fontSize="8" fontWeight="600">
          {label}
        </text>
      ) : null}
    </>
  );
}

function BustDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      <TorsoBase />
      <TapeBand y={52} label="Fullest part" />
      <path
        d="M18 52 Q60 46 102 52"
        fill="none"
        stroke={TAPE}
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.7"
      />
    </svg>
  );
}

function UnderbustDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      <TorsoBase />
      <TapeBand y={62} label="Under bust" />
      <ellipse cx="60" cy="54" rx="18" ry="6" fill="none" stroke={OUTLINE} strokeWidth="0.75" opacity="0.35" />
    </svg>
  );
}

function WaistDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      <TorsoBase />
      <path
        d="M48 78 Q60 74 72 78 L74 118 Q60 126 42 118 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.5"
        opacity="0.5"
      />
      <TapeBand y={78} label="Natural waist" />
    </svg>
  );
}

function ShoulderDiagram({ className }: DiagramProps) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      <ellipse cx="60" cy="24" rx="14" ry="16" fill={SKIN} stroke={OUTLINE} strokeWidth="1.5" />
      <path
        d="M30 42 L90 42"
        fill="none"
        stroke={TAPE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="30" cy="42" r="3" fill={TAPE} />
      <circle cx="90" cy="42" r="3" fill={TAPE} />
      <path
        d="M46 36 Q60 42 74 36 L78 118 Q60 126 42 118 Z"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M42 48 L28 90 M78 48 L92 90"
        fill="none"
        stroke={OUTLINE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <text x="60" y="58" textAnchor="middle" fill={OUTLINE} fontSize="8" fontWeight="600">
        Shoulder tip to tip
      </text>
      <path d="M30 42 L30 50 M90 42 L90 50" stroke={OUTLINE} strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  );
}

const DIAGRAMS: Record<MeasurementField, ComponentType<DiagramProps>> = {
  bust: BustDiagram,
  underbust: UnderbustDiagram,
  waist: WaistDiagram,
  shoulder: ShoulderDiagram
};

export function MeasurementGuideDiagram({
  field,
  className = "h-28 w-full max-w-[140px]"
}: {
  field: MeasurementField;
  className?: string;
}) {
  const Diagram = DIAGRAMS[field];
  return <Diagram className={className} />;
}
