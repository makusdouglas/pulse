import type { Tier, MemberStatus, Channel } from "@/types/dashboard";

export const TIER_LABELS: Record<Tier, string> = {
  critical: "Critico",
  medium: "Medio",
  low: "Baixo",
  safe: "Seguro",
};

export const TIER_COLORS: Record<Tier, string> = {
  critical: "destructive",
  medium: "default",
  low: "outline",
  safe: "secondary",
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  cancelled: "Cancelado",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  phone: "Ligacao",
  email: "E-mail",
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_FILE_SIZE_MB = 10;
