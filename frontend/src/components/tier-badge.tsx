import { Badge } from "@/components/ui/badge";
import { TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import type { Tier } from "@/types/score";

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const variant = TIER_COLORS[tier] as
    | "destructive"
    | "default"
    | "outline"
    | "secondary";

  return (
    <Badge variant={variant} className={className}>
      {TIER_LABELS[tier]}
    </Badge>
  );
}
