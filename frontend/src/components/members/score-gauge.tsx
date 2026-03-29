"use client";

import { cn } from "@/lib/utils";
import type { Tier } from "@/types/score";

interface ScoreGaugeProps {
  score: number;
  tier: Tier;
  size?: "sm" | "lg";
}

const tierGaugeColors: Record<Tier, string> = {
  critical: "text-destructive",
  medium: "text-orange-500",
  low: "text-yellow-500",
  safe: "text-green-500",
};

export function ScoreGauge({ score, tier, size = "lg" }: ScoreGaugeProps) {
  const dimensions = size === "lg" ? 120 : 64;
  const strokeWidth = size === "lg" ? 8 : 4;
  const radius = (dimensions - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={dimensions}
        height={dimensions}
        className="-rotate-90"
      >
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={cn("transition-all duration-500", tierGaugeColors[tier])}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className={cn(
            "font-bold",
            size === "lg" ? "text-2xl" : "text-sm",
          )}
        >
          {score}
        </span>
        {size === "lg" && (
          <span className="text-xs text-muted-foreground">de 100</span>
        )}
      </div>
    </div>
  );
}
