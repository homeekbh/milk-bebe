// Audit RLS — pour chaque table, tente une SELECT avec la clé ANON
// Si ça retourne 200 + data → RLS désactivée OU policy permissive
// Si 401/403/empty → RLS bloque (bon)

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SVC) {
  console.error("Manque env vars");
  process.exit(1);
}

// 1) Récupère le swagger via la clé service (qui voit tout)
const swag = await fetch(`${URL}/rest/v1/`, {
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
}).then(r => r.json());

const tables = Object.keys(swag.paths)
  .filter(p => p.startsWith("/") && p.length > 1 && !p.startsWith("/rpc/"))
  .map(p => p.slice(1))
  .filter(t => !t.includes("/"));

console.log(`Tables exposées via PostgREST : ${tables.length}`);
console.log("");

const results = [];

for (const t of tables) {
  // Probe avec la clé ANON
  const url = `${URL}/rest/v1/${t}?select=*&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
    const ct  = res.headers.get("content-type") ?? "";
    let body  = "";
    let count = 0;
    if (ct.includes("json")) {
      const json = await res.json();
      if (Array.isArray(json)) {
        count = json.length;
        body  = json.length > 0 ? JSON.stringify(json[0]).slice(0, 80) : "[]";
      } else {
        body = JSON.stringify(json).slice(0, 120);
      }
    } else {
      body = (await res.text()).slice(0, 120);
    }

    results.push({
      table:  t,
      status: res.status,
      count,
      body,
    });
  } catch (e) {
    results.push({ table: t, status: 0, count: 0, body: `(err: ${e.message})` });
  }
}

// Affiche
const exposed = results.filter(r => r.status === 200 && r.count > 0);
const empty   = results.filter(r => r.status === 200 && r.count === 0);
const blocked = results.filter(r => r.status !== 200);

console.log("═══════════════════════════════════════════════════════════════");
console.log(`🚨 TABLES EXPOSÉES sans auth (${exposed.length}) — données lues avec clé anon`);
console.log("═══════════════════════════════════════════════════════════════");
for (const r of exposed) {
  console.log(`  ❌ ${r.table.padEnd(40)} HTTP ${r.status}  sample: ${r.body}`);
}

console.log("");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`✅ Tables accessibles mais vides ou filtrées (${empty.length})`);
console.log("   (peut être RLS qui filtre selon auth.uid() — ou table juste vide)");
console.log("═══════════════════════════════════════════════════════════════");
for (const r of empty) {
  console.log(`  · ${r.table}`);
}

console.log("");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`🔒 Tables bloquées (${blocked.length}) — RLS ou permission refuse`);
console.log("═══════════════════════════════════════════════════════════════");
for (const r of blocked) {
  console.log(`  · ${r.table.padEnd(40)} HTTP ${r.status}  msg: ${r.body.slice(0, 80)}`);
}
