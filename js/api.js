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

function normalizeBackendSchedule(races) {
  return (races || []).map(race => ({
    round: String(race.round ?? ''),
    raceName: race.raceName || race.name || 'Grand Prix',
    date: race.date || '',
    time: race.time || '12:00:00Z',
    Circuit: {
      circuitName: race.Circuit?.circuitName || race.circuit || race.raceName || race.name || '-',
      Location: {
        locality: race.Circuit?.Location?.locality || race.locality || race.country || '-',
        country: race.Circuit?.Location?.country || race.country || race.locality || '-',
      },
    },
  }));
}

function normalizeBackendResults(races) {
  return (races || []).map(race => ({
    round: String(race.round ?? ''),
    raceName: race.raceName || race.name || 'Grand Prix',
    date: race.date || '',
    time: race.time || '12:00:00Z',
    Circuit: {
      circuitName: race.Circuit?.circuitName || race.circuit || '-',
      Location: {
        locality: race.Circuit?.Location?.locality || race.locality || race.country || '-',
        country: race.Circuit?.Location?.country || race.country || race.locality || '-',
      },
    },
    Results: race.winner ? [{
      Driver: {
        givenName: String(race.winner).split(' ').slice(0, -1).join(' ') || String(race.winner),
        familyName: String(race.winner).split(' ').slice(-1).join('') || '',
      },
      Constructor: {
        name: race.team || '-',
        constructorId: String(race.team || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      },
      laps: race.laps || '',
      Time: race.time ? { time: race.time } : undefined,
      status: race.status || 'Finished',
    }] : [],
  }));
}

function normalizeBackendDriverStandings(standings) {
  return (standings || []).map(item => ({
    position: String(item.position ?? ''),
    points: String(item.points ?? '0'),
    wins: String(item.wins ?? '0'),
    Driver: {
      givenName: String(item.driver || '').split(' ').slice(0, -1).join(' ') || String(item.driver || ''),
      familyName: String(item.driver || '').split(' ').slice(-1).join('') || '',
      nationality: item.nationality || '',
      code: String(item.driver || '').split(' ').map(part => part[0] || '').join('').slice(0, 3).toUpperCase(),
    },
    Constructors: [{
      name: item.team || '-',
      constructorId: String(item.team || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    }],
  }));
}

function normalizeBackendConstructorStandings(standings) {
  return (standings || []).map(item => ({
    position: String(item.position ?? ''),
    points: String(item.points ?? '0'),
    wins: String(item.wins ?? '0'),
    Constructor: {
      name: item.team || '-',
      nationality: item.nationality || '',
      constructorId: String(item.team || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    },
  }));
}

function normalizeDriverKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function driverDisplayName(driver) {
  if (!driver) return '';
  return `${driver.givenName || ''} ${driver.familyName || ''}`.trim();
}

const API = {

  async getSchedule(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/schedule/${season}`);
      if (data.success && data.races?.length) return normalizeBackendSchedule(data.races);
    } catch (e) {
      console.warn('Backend schedule fetch failed, falling back to Jolpica:', e.message);
    }
    const data = await apiFetch(`${JOLPICA}/${season}/races/?limit=30`);
    return data.MRData.RaceTable.Races;
  },

  async getResults(season) {
    try {
      const data = await apiFetch(`${BACKEND}/api/results/${season}`);
      if (data.success && data.races?.length) return normalizeBackendResults(data.races);
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
      if (data.success && data.standings?.length) return normalizeBackendDriverStandings(data.standings);
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
      if (data.success && data.standings?.length) return normalizeBackendConstructorStandings(data.standings);
    } catch (e) {
      console.warn('Backend constructor standings failed, falling back to Jolpica:', e.message);
    }
    const data = await apiFetch(`${JOLPICA}/${season}/constructorStandings/?limit=20`);
    const sl = data.MRData.StandingsTable.StandingsLists;
    return sl.length ? sl[0].ConstructorStandings : [];
  },

  async getDriverHeadshots(year) {
    try {
      const sessions = await apiFetch(`${OPENF1}/sessions?session_type=Race&year=${year}`);
      const completed = sessions.filter(session => new Date(session.date_end) <= new Date());
      const latest = completed[completed.length - 1];
      if (!latest?.session_key) return {};

      const drivers = await apiFetch(`${OPENF1}/drivers?session_key=${latest.session_key}`);
      const map = {};
      drivers.forEach(driver => {
        const key = normalizeDriverKey(driver.full_name);
        if (key && driver.headshot_url) map[key] = driver.headshot_url;
      });
      return map;
    } catch (e) {
      console.warn('OpenF1 driver headshots fetch failed:', e.message);
      return {};
    }
  },

  async attachDriverHeadshots(raceResult, year) {
    if (!raceResult?.Results?.length) return raceResult;
    const headshots = await this.getDriverHeadshots(year);
    raceResult.Results = raceResult.Results.map(result => {
      const key = normalizeDriverKey(driverDisplayName(result.Driver));
      if (key && headshots[key]) {
        result.Driver = { ...result.Driver, headshotUrl: headshots[key] };
      }
      return result;
    });
    return raceResult;
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
    try {
      const data = await apiFetch(`${BACKEND}/api/news`);
      if (data.success && Array.isArray(data.items)) return data.items;
    } catch (e) {
      console.warn('Backend news fetch failed:', e.message);
    }

    return [];
  },
};
