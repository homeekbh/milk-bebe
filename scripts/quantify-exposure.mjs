const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const critical = ["newsletter_subscribers", "popups", "homepage_config", "shipping_methods", "products", "categories"];
console.log("=== Tables EXPOSÉES (anon peut lire) ===");
for (const t of critical) {
  const r = await fetch(`${URL}/rest/v1/${t}?select=*`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Prefer: "count=exact" },
  });
  const total = r.headers.get("content-range")?.split("/")[1] ?? "?";
  const data  = await r.json();
  const keys  = Object.keys(data[0] ?? {}).slice(0, 10).join(",");
  console.log(t.padEnd(28), "rows=" + String(total).padStart(5), "  columns:", keys);
}

console.log("");
console.log("=== Tables 'vides' en anon — comparaison anon vs service_role ===");
const empty = ["orders", "profiles", "customers", "admin_logs", "reviews", "abandoned_carts", "settings", "promo_codes", "waitlist", "add_to_cart_events", "page_views", "activity_log", "order_items", "product_images", "stock_alerts", "product_categories"];
for (const t of empty) {
  const [anon, svc] = await Promise.all([
    fetch(`${URL}/rest/v1/${t}?select=id&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Prefer: "count=exact" } }),
    fetch(`${URL}/rest/v1/${t}?select=id&limit=1`, { headers: { apikey: SVC,  Authorization: `Bearer ${SVC}`,  Prefer: "count=exact" } }),
  ]);
  const a = anon.headers.get("content-range")?.split("/")[1] ?? "?";
  const s = svc.headers.get("content-range")?.split("/")[1] ?? "?";
  let flag = "·";
  if (a === "0" && s !== "0" && s !== "?") flag = "✅ RLS_OK";
  else if (a === s && a !== "0" && a !== "?") flag = "🚨 EXPOSED";
  else if (a === "0" && s === "0") flag = "(table vide)";
  console.log(t.padEnd(28), "anon=" + String(a).padStart(6), " svc=" + String(s).padStart(6), " " + flag);
}
