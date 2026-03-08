/* =============================================
   F1BUZZ — API MODULE
   Jolpica F1 API: https://api.jolpi.ca/ergast/f1/
   ============================================= */

const BASE = 'https://api.jolpi.ca/ergast/f1';

// Simple in-memory cache to avoid hitting rate limits (200 req/hr)
const _cache = {};
async function apiFetch(url) {
  if (_cache[url]) return _cache[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  const data = await res.json();
  _cache[url] = data;
  return data;
}

const API = {
  // ── SCHEDULE ──────────────────────────────
  async getSchedule(season) {
    const data = await apiFetch(`${BASE}/${season}/races/?limit=30`);
    return data.MRData.RaceTable.Races;
  },

  // ── RESULTS for a season ──────────────────
  async getResults(season) {
    const data = await apiFetch(`${BASE}/${season}/results/1/?limit=30`);
    return data.MRData.RaceTable.Races; // P1 finisher per race
  },

  // ── SPECIFIC RACE RESULT ──────────────────
  async getRaceResult(season, round) {
    const data = await apiFetch(`${BASE}/${season}/${round}/results/?limit=5`);
    return data.MRData.RaceTable.Races[0];
  },

  // ── DRIVER STANDINGS ─────────────────────
  async getDriverStandings(season) {
    const data = await apiFetch(`${BASE}/${season}/driverStandings/?limit=30`);
    const sl = data.MRData.StandingsTable.StandingsLists;
    return sl.length ? sl[0].DriverStandings : [];
  },

  // ── CONSTRUCTOR STANDINGS ─────────────────
  async getConstructorStandings(season) {
    const data = await apiFetch(`${BASE}/${season}/constructorStandings/?limit=20`);
    const sl = data.MRData.StandingsTable.StandingsLists;
    return sl.length ? sl[0].ConstructorStandings : [];
  },

  // ── CHAMPION HISTORY ─────────────────────
  async getChampionHistory() {
    // Get driver champions from 1950 to current in one go (high limit)
    const data = await apiFetch(`${BASE}/driverStandings/1/?limit=80&offset=0`);
    return data.MRData.StandingsTable.StandingsLists.reverse(); // newest first
  },

  // ── SEASON LIST ───────────────────────────
  async getSeasons() {
    const data = await apiFetch(`${BASE}/seasons/?limit=80`);
    return data.MRData.SeasonTable.Seasons.reverse();
  },
};
