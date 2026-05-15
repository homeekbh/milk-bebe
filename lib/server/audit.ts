// lib/server/audit.ts
import { supabaseServer } from "./supabase";

export async function logActivity(
  type: string,
  message: string,
  opts?: { entity_name?: string; entity_id?: string; meta?: Record<string, unknown> }
) {
  try {
    await supabaseServer.from("activity_log").insert([{
      type,
      message,
      entity_name: opts?.entity_name ?? null,
      entity_id:   opts?.entity_id   ?? null,
      meta:        opts?.meta        ?? null,
    }]);
  } catch {}
}