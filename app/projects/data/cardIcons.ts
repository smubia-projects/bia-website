import {
  CircleCheck,
  Lightbulb,
  Target,
  Rocket,
  TrendingUp,
  Award,
  Star,
  Zap,
  Heart,
  Users,
  Brain,
  Sparkles,
  Wrench,
  Trophy,
  Flag,
  ThumbsUp,
  Gauge,
  Shield,
  Puzzle,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated icon set for customizable project highlight cards. The stored value
 * is the string `key`; the detail page and admin picker both resolve it through
 * here, so adding an icon means adding one entry.
 */
export const CARD_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "circle-check", label: "Check", Icon: CircleCheck },
  { key: "lightbulb", label: "Lightbulb", Icon: Lightbulb },
  { key: "target", label: "Target", Icon: Target },
  { key: "rocket", label: "Rocket", Icon: Rocket },
  { key: "trending-up", label: "Trending up", Icon: TrendingUp },
  { key: "award", label: "Award", Icon: Award },
  { key: "trophy", label: "Trophy", Icon: Trophy },
  { key: "star", label: "Star", Icon: Star },
  { key: "zap", label: "Zap", Icon: Zap },
  { key: "heart", label: "Heart", Icon: Heart },
  { key: "users", label: "Users", Icon: Users },
  { key: "brain", label: "Brain", Icon: Brain },
  { key: "sparkles", label: "Sparkles", Icon: Sparkles },
  { key: "wrench", label: "Wrench", Icon: Wrench },
  { key: "flag", label: "Flag", Icon: Flag },
  { key: "thumbs-up", label: "Thumbs up", Icon: ThumbsUp },
  { key: "gauge", label: "Gauge", Icon: Gauge },
  { key: "shield", label: "Shield", Icon: Shield },
  { key: "puzzle", label: "Puzzle", Icon: Puzzle },
];

export const DEFAULT_CARD_ICON = "circle-check";

const CARD_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CARD_ICONS.map((i) => [i.key, i.Icon])
);

/** Resolve a stored icon key to a component, falling back to the default. */
export function getCardIcon(key: string | undefined): LucideIcon {
  return (key && CARD_ICON_MAP[key]) || CircleCheck;
}
