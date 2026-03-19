import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PRODUCTS } from "@/config/stripe";
import type { OrgHealth, SubTier } from "@/types/admin";

export function tierPrice(tier: SubTier | null): number {
  if (!tier) return 0;
  return (STRIPE_PRODUCTS as Record<string, { price?: number }>)[tier]?.price ?? 0;
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function calcHealthScore(h: Omit<OrgHealth, "score">): number {
  let score = 0;
  if (h.liveProjects > 0) score += 30;
  else if (h.totalProjects > 0) score += 10;
  if (h.docsLast30 >= 5) score += 20;
  else if (h.docsLast30 > 0) score += 10;
  if (h.ramsCreated > 0) score += 20;
  if (h.lastActivityAt) {
    const d = differenceInDays(new Date(), new Date(h.lastActivityAt));
    if (d <= 7) score += 30;
    else if (d <= 30) score += 20;
    else if (d <= 90) score += 10;
  }
  return Math.min(100, score);
}

export async function logAdminAction(
  adminId: string, action: string, entityType: string,
  entityId: string | null, orgId: string | null, metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from("audit_events").insert([{
      action: `ADMIN_${action}`,
      actor_id: adminId,
      entity_type: entityType,
      entity_id: entityId,
      organisation_id: orgId,
      metadata: { ...metadata, _admin_action: true },
    }]);
  } catch { /* silent */ }
}
