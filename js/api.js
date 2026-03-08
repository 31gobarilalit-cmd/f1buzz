/* =============================================
   F1BUZZ — API MODULE
   Primary: F1BUZZ Backend (scraper)
   Fallback: Jolpica + OpenF1
   ============================================= */

// !! Replace this with your Render.com URL after deploying !!
const BACKEND = 'https://f1buzz-backend.onrender.com';
const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
const OPENF1  = 'https://api.openf1.org/v1';

const _cache = {};
async function apiFetch(url) {
  if (_cache[url]) return _cache[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  _cache[url] = data;
  return data;
}

const API = {

  async getSchedule(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/schedule/${season}`);
      if (data.success && data.races?.length) return data.races;
    } catch(e) {}
    const data = await apiFetch(`${JOLPICA}/${season}/races/?limit=30`);
    return data.MRData.RaceTable.Races;
  },

  async getResults(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/results/${season}`);
      if (data.success && data.races?.length) return data.races;
    } catch(e) {}
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
    } catch(e) {}
    const data = await apiFetch(`${JOLPICA}/${season}/driverStandings/?limit=30`);
    const sl = data.MRData.StandingsTable.StandingsLists;
    return sl.length ? sl[0].DriverStandings : [];
  },

  async getConstructorStandings(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/standings/constructors/${season}`);
      if (data.success && data.standings?.length) return data.standings;
    } catch(e) {}
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
          const top3 = Object.values(finalPos).sort((a,b) => a.position - b.position).slice(0,3);
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
        } catch(e) {}
      }
      return results.reverse();
    } catch(e) { return []; }
  },

  async getChampionHistory() {
    const currentYear = new Date().getFullYear();
    const results = [];
    for (let y = currentYear; y >= 2000; y--) {
      try {
        const data = await apiFetch(`${JOLPICA}/${y}/driverStandings/1/?limit=1`);
        const lists = data.MRData.StandingsTable.StandingsLists;
        if (lists.length) results.push(lists[0]);
      } catch(e) {}
      if ((currentYear - y) % 5 === 4) await new Promise(r => setTimeout(r, 300));
    }
    return results;
  },
};
