"use client";

import { useEffect, useState } from "react";

interface Subscriber {
  id: string;
  email: string;
  source: string | null;
  promo_code: string | null;
  created_at: string;
  active: boolean;
  unsubscribe_token: string | null;
}

function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    const raw = localStorage.getItem("sb-ntkqmnenczltlwplswka-auth-token");
    if (raw) token = JSON.parse(raw)?.access_token ?? "";
  } catch {}
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

export default function NewsletterAdminPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function loadSubscribers() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/newsletter");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const total = subscribers.length;
  const actifs = subscribers.filter((s) => s.active).length;
  const desabonnes = subscribers.filter((s) => !s.active).length;
  const promoUsed = subscribers.filter((s) => s.promo_code).length;

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-[#1a1410] mb-1">Newsletter</h1>
      <p className="text-sm text-[#6b5a4e] mb-8">
        Base d'abonnés — séparée de la base clients
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="TOTAL ABONNÉS" value={total} color="text-[#1a1410]" />
        <StatCard label="ACTIFS" value={actifs} color="text-green-600" />
        <StatCard label="DÉSABONNÉS" value={desabonnes} color="text-red-600" />
        <StatCard label="PROMO UTILISÉE" value={promoUsed} color="text-[#c49a4a]" />
      </div>

      {/* RGPD notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-900">
        <span className="font-bold">⚖️ RGPD :</span> Ces emails proviennent uniquement du pop-up de
        bienvenue avec consentement explicite. Ils sont distincts de la base clients. Le
        désabonnement supprime uniquement l'entrée dans cette table.
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-800 text-sm">
          ❌ {error}
          <button
            onClick={loadSubscribers}
            className="ml-4 underline text-red-700 hover:text-red-900"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Chargement */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-[#6b5a4e]">
          <div className="w-6 h-6 border-2 border-[#c49a4a] border-t-transparent rounded-full animate-spin mr-3" />
          Chargement...
        </div>
      )}

      {/* Liste */}
      {!loading && !error && (
        <>
          {total === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e8e0d6] p-12 text-center text-[#9b8880]">
              Aucun abonné pour l'instant — le pop-up de bienvenue collectera les emails.
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Rechercher un email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-80 px-4 py-2 rounded-xl border border-[#e8e0d6] bg-white text-sm text-[#1a1410] focus:outline-none focus:ring-2 focus:ring-[#c49a4a]"
                />
              </div>

              <div className="bg-white rounded-2xl border border-[#e8e0d6] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#f7f2ec] border-b border-[#e8e0d6]">
                    <tr>
                      <th className="text-left px-4 py-3 text-[#6b5a4e] font-semibold">Email</th>
                      <th className="text-left px-4 py-3 text-[#6b5a4e] font-semibold">Source</th>
                      <th className="text-left px-4 py-3 text-[#6b5a4e] font-semibold">Promo</th>
                      <th className="text-left px-4 py-3 text-[#6b5a4e] font-semibold">Statut</th>
                      <th className="text-left px-4 py-3 text-[#6b5a4e] font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr
                        key={s.id}
                        className={`border-b border-[#f0e9e0] ${
                          i % 2 === 0 ? "bg-white" : "bg-[#faf7f4]"
                        } hover:bg-[#f7f2ec] transition-colors`}
                      >
                        <td className="px-4 py-3 text-[#1a1410] font-medium">{s.email}</td>
                        <td className="px-4 py-3 text-[#6b5a4e]">{s.source ?? "—"}</td>
                        <td className="px-4 py-3">
                          {s.promo_code ? (
                            <span className="bg-[#c49a4a]/10 text-[#c49a4a] px-2 py-0.5 rounded-full text-xs font-semibold">
                              {s.promo_code}
                            </span>
                          ) : (
                            <span className="text-[#9b8880]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.active ? (
                            <span className="text-green-600 font-semibold text-xs">● Actif</span>
                          ) : (
                            <span className="text-red-500 text-xs">● Désabonné</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#6b5a4e] text-xs">
                          {new Date(s.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filtered.length === 0 && search && (
                  <div className="text-center py-8 text-[#9b8880] text-sm">
                    Aucun résultat pour « {search} »
                  </div>
                )}

                <div className="px-4 py-3 bg-[#f7f2ec] border-t border-[#e8e0d6] text-xs text-[#6b5a4e]">
                  {filtered.length} abonné{filtered.length > 1 ? "s" : ""} affiché
                  {filtered.length > 1 ? "s" : ""}
                  {search && ` sur ${total} au total`}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e0d6] p-5">
      <p className={`text-xs font-bold tracking-widest mb-2 ${color}`}>{label}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </div>
  );
}