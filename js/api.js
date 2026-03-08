/* =============================================
   F1BUZZ — API MODULE
   Primary: F1BUZZ Backend (scraper)
   Fallback: Jolpica + OpenF1
   ============================================= */

// !! Replace this with your Render.com URL after deploying !!
const BACKEND = 'https://f1buzz-backend.onrender.com';
const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
const OPENF1  = 'https://api.openf1.org/v1';

// ── CONSTANTS ─────────────────────────────────
const CACHE_EXPIRY_MS       = 5 * 60 * 1000; // 5 minutes
const API_THROTTLE_DELAY_MS = 300;
const API_RATE_LIMIT_BATCH  = 5; // throttle every N years in history loop

// ── CACHE WITH EXPIRY ─────────────────────────
const _cache = {};

async function apiFetch(url) {
  const cached = _cache[url];
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY_MS) {
    return cached.data;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status} for ${url}`);
  const data = await res.json();
  _cache[url] = { data, timestamp: Date.now() };
  return data;
}

const API = {

  async getSchedule(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/schedule/${season}`);
      if (data.success && data.races?.length) return data.races;
    } catch (e) {
      console.warn('Backend schedule fetch failed, falling back to Jolpica:', e.message);
    }
    const data = await apiFetch(`${JOLPICA}/${season}/races/?limit=30`);
    return data.MRData.RaceTable.Races;
  },

  async getResults(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/results/${season}`);
      if (data.success && data.races?.length) return data.races;
    } catch (e) {
      console.warn('Backend results fetch failed, falling back to Jolpica:', e.message);
    }
    const data = await apiFetch(`${JOLPICA}/${season}/results/1/?limit=30`);
    return data.MRData.RaceTable.Races;
  },

  async getRaceResult(season, round) {
    const data = await apiFetch(`${JOLPICA}/${season}/${round}/results/?limit=5`);
    return data.MRData.RaceTable.Races[0];
  },

  async getDriverStandings(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/standings/drivers/${season}`);
      if (data.success && data.standings?.length) return data.standings;
    } catch (e) {
      console.warn('Backend driver standings failed, falling back to Jolpica:', e.message);
    }
    const data = await apiFetch(`${JOLPICA}/${season}/driverStandings/?limit=30`);
    const sl = data.MRData.StandingsTable.StandingsLists;
    return sl.length ? sl[0].DriverStandings : [];
  },

  async getConstructorStandings(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/standings/constructors/${season}`);
      if (data.success && data.standings?.length) return data.standings;
    } catch (e) {
      console.warn('Backend constructor standings failed, falling back to Jolpica:', e.message);
    }
    const data = await apiFetch(`${JOLPICA}/${season}/constructorStandings/?limit=20`);
    const sl = data.MRData.StandingsTable.StandingsLists;
    return sl.length ? sl[0].ConstructorStandings : [];
  },

  async getRecentResultsOpenF1(year) {
    try {
      const sessions = await apiFetch(`${OPENF1}/sessions?session_type=Race&year=${year}`);
      if (!sessions.length) return [];
      const meetings = await apiFetch(`${OPENF1}/meetings?year=${year}`);
      const meetingMap = {};
      meetings.forEach(m => { meetingMap[m.meeting_key] = m; });
      const results = [];
      for (const session of sessions) {
        const sessionEnd = new Date(session.date_end);
        if (sessionEnd > new Date()) continue;
        try {
          const positions = await apiFetch(`${OPENF1}/position?session_key=${session.session_key}`);
          if (!positions.length) continue;
          const finalPos = {};
          positions.forEach(p => { finalPos[p.driver_number] = p; });
          const top3 = Object.values(finalPos).sort((a, b) => a.position - b.position).slice(0, 3);
          if (!top3.length) continue;
          const drivers = await apiFetch(`${OPENF1}/drivers?session_key=${session.session_key}`);
          const driverMap = {};
          drivers.forEach(d => { driverMap[d.driver_number] = d; });
          const meeting = meetingMap[session.meeting_key] || {};
          results.push({
            meeting_name: meeting.meeting_name || session.session_name,
            country: meeting.country_name || '',
            date: session.date_start,
            top3: top3.map(p => ({
              position: p.position,
              driver: driverMap[p.driver_number] || { full_name: `#${p.driver_number}`, team_name: '' },
            }))
          });
        } catch (e) {
          console.warn(`Skipping session ${session.session_key}:`, e.message);
        }
      }
      return results.reverse();
    } catch (e) {
      console.warn('OpenF1 fetch failed:', e.message);
      return [];
    }
  },

  async getChampionHistory() {
    const currentYear = new Date().getFullYear();
    const results = [];
    for (let y = currentYear; y >= 2000; y--) {
      try {
        const data = await apiFetch(`${JOLPICA}/${y}/driverStandings/1/?limit=1`);
        const lists = data.MRData.StandingsTable.StandingsLists;
        if (lists.length) results.push(lists[0]);
      } catch (e) {
        console.warn(`Failed to fetch champion history for ${y}:`, e.message);
      }
      if ((currentYear - y) % API_RATE_LIMIT_BATCH === (API_RATE_LIMIT_BATCH - 1)) {
        await new Promise(r => setTimeout(r, API_THROTTLE_DELAY_MS));
      }
    }
    return results;
  },

  async getNews() {
    // Use Anthropic API with web_search to get latest F1 news headlines
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system: 'You fetch F1 news. Always respond with ONLY a JSON array, no markdown, no extra text.',
          messages: [{
            role: 'user',
            content: `Search for the 6 most recent Formula 1 news headlines from today or this week.
Return ONLY a raw JSON array like this (no markdown, no backticks):
[
  {"title":"headline here","source":"Autosport","link":"https://...","pub":"2026-03-08"},
  ...
]
Keep titles concise, under 100 chars. Only real news, no duplicates.`
          }]
        })
      });

      const data = await response.json();

      // Extract text from response content blocks
      const text = data.content
        ?.filter(b => b.type === 'text')
        ?.map(b => b.text)
        ?.join('') || '';

      // Parse JSON from response
      const clean = text.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('[');
      const end   = clean.lastIndexOf(']');
      if (start === -1 || end === -1) throw new Error('No JSON array found');

      const items = JSON.parse(clean.slice(start, end + 1));
      if (Array.isArray(items) && items.length) {
        console.log(`News loaded via AI search: ${items.length} items`);
        return items;
      }
    } catch (e) {
      console.warn('AI news fetch failed:', e.message);
    }

    // Fallback: backend RSS scraper
    try {
      const data = await apiFetch(`${BACKEND}/api/news`);
      if (data.success && data.items?.length) return data.items;
    } catch (e) {
      console.warn('Backend news also failed:', e.message);
    }

    return [];
  },
};
