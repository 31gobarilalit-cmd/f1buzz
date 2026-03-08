/* =============================================
   F1BUZZ — APP CONTROLLER
   ============================================= */

let currentSeason = new Date().getFullYear();
let countdownInterval = null;

// ── PAGE NAVIGATION ───────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  const link = document.querySelector(`.nav-link[data-page="${name}"]`);
  if (link) link.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Lazy-load page data
  if (name === 'season')    loadSeasonPage(currentSeason);
  if (name === 'standings') loadStandingsPage(currentSeason);
  if (name === 'history')   loadHistoryPage();
  if (name === 'analysis')  loadAnalysisPage(currentSeason);
}

// ── TABS ──────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab)?.classList.add('active');
  });
});

// ── NAV LINKS ─────────────────────────────────
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showPage(link.dataset.page);
  });
});

// ── GLOBAL SEASON SELECTOR ────────────────────
document.getElementById('globalSeasonSelect').addEventListener('change', function () {
  currentSeason = parseInt(this.value);
  // Reload active page with new season
  const activePage = document.querySelector('.page.active')?.id?.replace('page-', '');
  if (activePage === 'season')    loadSeasonPage(currentSeason);
  if (activePage === 'standings') loadStandingsPage(currentSeason);
  if (activePage === 'home')      loadHomePage(currentSeason);
  if (activePage === 'analysis')  loadAnalysisPage(currentSeason);
});

// ── COUNTDOWN TIMER ───────────────────────────
function startCountdown(raceDate, raceTime) {
  const target = new Date(raceDate + 'T' + (raceTime || '12:00:00Z'));
  if (countdownInterval) clearInterval(countdownInterval);
  function tick() {
    const diff = target - new Date();
    if (diff <= 0) {
      ['cdDays','cdHours','cdMins','cdSecs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      clearInterval(countdownInterval);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = pad(val); };
    set('cdDays', d); set('cdHours', h); set('cdMins', m); set('cdSecs', s);
  }
  tick();
  countdownInterval = setInterval(tick, 1000);
}

// ── TICKER ────────────────────────────────────
function updateTicker(items) {
  const track = document.getElementById('tickerTrack');
  if (!track || !items.length) return;
  track.innerHTML = items.map(t => `<span style="margin-right:60px">🏎 ${t}</span>`).join('');
}

// ── LOAD HOME PAGE ─────────────────────────────
async function loadHomePage(season) {
  try {
    // Fetch schedule + results in parallel
    const [schedule, results, driverStandings] = await Promise.all([
      API.getSchedule(season),
      API.getResults(season).catch(() => []),
      API.getDriverStandings(season).catch(() => []),
    ]);

    // Hero: last completed race
    const completedRaces = results.filter(r => raceStatus(r) === 'done');
    const lastRace = completedRaces[completedRaces.length - 1];

    if (lastRace) {
      const fullResult = await API.getRaceResult(season, lastRace.round);
      document.getElementById('heroEyebrow').textContent =
        `ROUND ${lastRace.round} · ${season} FORMULA ONE WORLD CHAMPIONSHIP`;
      document.getElementById('heroTitle').innerHTML =
        `<span class="country">${countryFlag(lastRace.Circuit.Location.country)}</span> ${lastRace.raceName.replace(' Grand Prix','')}<br>GRAND PRIX`;
      document.getElementById('heroSubtitle').textContent =
        `${lastRace.Circuit.circuitName}, ${lastRace.Circuit.Location.locality} · ${fmtDate(lastRace.date)}`;
      document.getElementById('podiumGrid').innerHTML = renderPodium(fullResult);
    } else {
      document.getElementById('heroEyebrow').textContent = `${season} SEASON`;
      document.getElementById('heroTitle').textContent = 'Season Upcoming';
      document.getElementById('heroSubtitle').textContent = 'No races completed yet';
      document.getElementById('podiumGrid').innerHTML = '<div class="podium-loading"><span>Season has not started yet</span></div>';
    }

    // Mini standings
    document.getElementById('miniStandings').innerHTML = renderMiniStandings(driverStandings);
    document.getElementById('standingsBadge').textContent = `R${driverStandings[0]?.round || '—'}`;

    // Next race + countdown
    const nextRace = findNextRace(schedule);
    if (nextRace) {
      document.getElementById('nextRaceName').textContent = nextRace.raceName;
      document.getElementById('nextRaceMeta').textContent =
        `${nextRace.Circuit.circuitName} · ${fmtDate(nextRace.date)}`;
      startCountdown(nextRace.date, nextRace.time);
    } else {
      document.getElementById('nextRaceName').textContent = 'Season Complete';
      document.getElementById('nextRaceMeta').textContent = 'See you next year!';
    }

    // Season stats
    document.getElementById('statRaces').textContent = schedule.length;
    document.getElementById('statDone').textContent = completedRaces.length;
    const leader = driverStandings[0];
    if (leader) {
      document.getElementById('statLeader').textContent =
        `${leader.Driver.code || leader.Driver.familyName}`;
      document.getElementById('statLeaderPts').textContent = leader.points + ' pts';
    }

    // Recent results strip
    if (results.length) {
      document.getElementById('recentResults').innerHTML = renderResultCards(results);
    } else {
      document.getElementById('recentResults').innerHTML =
        '<div style="color:var(--gray);padding:32px">No results yet this season.</div>';
    }

    // Ticker
    const tickerItems = results.slice(-5).reverse().map(r => {
      const w = r.Results?.[0];
      return w
        ? `${r.raceName}: ${driverFullName(w.Driver)} (${w.Constructor.name}) wins`
        : r.raceName;
    });
    if (leader) tickerItems.unshift(`Championship leader: ${driverFullName(leader.Driver)} — ${leader.points} pts`);
    updateTicker(tickerItems);

  } catch (err) {
    console.error('Home load error:', err);
    document.getElementById('podiumGrid').innerHTML =
      `<div class="podium-loading"><span style="color:var(--red)">⚠ Could not load data. API may be rate-limited. Try again shortly.</span></div>`;
  }
}

// ── LOAD SEASON PAGE ──────────────────────────
async function loadSeasonPage(season) {
  document.getElementById('calendarTitle').textContent = `${season} SEASON`;
  document.getElementById('calendarBody').innerHTML =
    '<tr><td colspan="8" class="loading-cell"><div class="spinner"></div> Loading…</td></tr>';

  try {
    const [schedule, results] = await Promise.all([
      API.getSchedule(season),
      API.getResults(season).catch(() => []),
    ]);

    document.getElementById('calendarBody').innerHTML = renderCalendarRows(schedule, results);

    // Champion bar for past seasons
    const champBar = document.getElementById('seasonChampBar');
    if (season < new Date().getFullYear() && results.length === schedule.length) {
      const ds = await API.getDriverStandings(season).catch(() => []);
      const cs = await API.getConstructorStandings(season).catch(() => []);
      if (ds.length && cs.length) {
        const dChamp = ds[0];
        const cChamp = cs[0];
        champBar.style.display = 'flex';
        champBar.innerHTML = `
          <div class="champ-item">
            <div class="champ-item-label">Drivers' Champion</div>
            <div class="champ-item-val" style="color:var(--gold)">${flag(dChamp.Driver.nationality)} ${driverFullName(dChamp.Driver)}</div>
          </div>
          <div class="champ-divider"></div>
          <div class="champ-item">
            <div class="champ-item-label">Team</div>
            <div class="champ-item-val" style="color:${teamColor(dChamp.Constructors?.[0]?.constructorId)}">${dChamp.Constructors?.[0]?.name || '—'}</div>
          </div>
          <div class="champ-divider"></div>
          <div class="champ-item">
            <div class="champ-item-label">Constructors' Champion</div>
            <div class="champ-item-val" style="color:${teamColor(cChamp.Constructor.constructorId)}">${cChamp.Constructor.name}</div>
          </div>
          <div class="champ-divider"></div>
          <div class="champ-item">
            <div class="champ-item-label">Total Races</div>
            <div class="champ-item-val">${schedule.length}</div>
          </div>
        `;
      }
    } else {
      champBar.style.display = 'none';
    }
  } catch (err) {
    document.getElementById('calendarBody').innerHTML =
      `<tr><td colspan="8" class="loading-cell" style="color:var(--red)">⚠ Failed to load — API may be rate-limited. Refresh in a moment.</td></tr>`;
  }
}

// ── LOAD STANDINGS PAGE ────────────────────────
async function loadStandingsPage(season) {
  document.getElementById('standingsPageTitle').textContent = `${season} CHAMPIONSHIP`;
  document.getElementById('driverStandingsWrap').innerHTML = '<div class="spinner-center"><div class="spinner"></div></div>';
  document.getElementById('constructorStandingsWrap').innerHTML = '<div class="spinner-center"><div class="spinner"></div></div>';

  try {
    const [ds, cs] = await Promise.all([
      API.getDriverStandings(season),
      API.getConstructorStandings(season),
    ]);
    document.getElementById('driverStandingsWrap').innerHTML = renderDriverStandings(ds);
    document.getElementById('constructorStandingsWrap').innerHTML = renderConstructorStandings(cs);
  } catch (err) {
    const msg = '<div style="padding:32px;color:var(--red)">⚠ Failed to load standings</div>';
    document.getElementById('driverStandingsWrap').innerHTML = msg;
    document.getElementById('constructorStandingsWrap').innerHTML = msg;
  }
}

// ── LOAD HISTORY PAGE ─────────────────────────
async function loadHistoryPage() {
  // Only load once
  if (document.getElementById('historyBody').children.length > 1 &&
      !document.getElementById('historyBody').querySelector('.loading-cell')) return;

  document.getElementById('historyBody').innerHTML =
    '<tr><td colspan="6" class="loading-cell"><div class="spinner"></div> Loading champion history…</td></tr>';

  try {
    const list = await API.getChampionHistory();
    const renderRows = (filter) => {
      document.getElementById('historyBody').innerHTML = renderHistoryRows(list, filter);
    };
    renderRows('');
    document.getElementById('historySearch').addEventListener('input', function() {
      renderRows(this.value);
    });
  } catch (err) {
    document.getElementById('historyBody').innerHTML =
      '<tr><td colspan="6" class="loading-cell" style="color:var(--red)">⚠ Failed to load history</td></tr>';
  }
}

// ── LOAD ANALYSIS PAGE ────────────────────────
async function loadAnalysisPage(season) {
  const wrap = document.getElementById('analysisContent');
  wrap.innerHTML = '<div class="spinner-center"><div class="spinner"></div></div>';

  try {
    const [schedule, results, ds, cs] = await Promise.all([
      API.getSchedule(season),
      API.getResults(season).catch(() => []),
      API.getDriverStandings(season).catch(() => []),
      API.getConstructorStandings(season).catch(() => []),
    ]);

    const completed = results.filter(r => raceStatus(r) === 'done');
    const leader = ds[0];
    const cLeader = cs[0];
    const last = completed[completed.length - 1];
    const lastW = last?.Results?.[0];

    // Win counts
    const winMap = {};
    completed.forEach(r => {
      const w = r.Results?.[0];
      if (w) {
        const name = driverFullName(w.Driver);
        winMap[name] = (winMap[name] || 0) + 1;
      }
    });
    const topWinner = Object.entries(winMap).sort((a,b) => b[1]-a[1])[0];

    // Team wins
    const teamWinMap = {};
    completed.forEach(r => {
      const w = r.Results?.[0];
      if (w) {
        const t = w.Constructor.name;
        teamWinMap[t] = (teamWinMap[t] || 0) + 1;
      }
    });
    const topTeam = Object.entries(teamWinMap).sort((a,b) => b[1]-a[1])[0];

    wrap.innerHTML = `
      <div class="analysis-grid">
        ${last ? `
        <div class="analysis-card featured">
          <div class="an-tag gold">🏁 LATEST RACE · ${season} ROUND ${last.round}</div>
          <div class="an-title">${last.raceName} — Race Report</div>
          <div class="an-body">
            ${lastW ? `<strong>${driverFullName(lastW.Driver)}</strong> (${lastW.Constructor.name}) claimed victory at <strong>${last.Circuit.circuitName}</strong>.
            ${lastW.laps ? `The race ran for ${lastW.laps} laps.` : ''}
            ${lastW.Time ? `Race time: ${lastW.Time.time}.` : ''}` : 'Result data not available.'}
          </div>
          <div class="an-meta">
            <span>📍 ${last.Circuit.Location.locality}, ${last.Circuit.Location.country}</span>
            <span>📅 ${fmtDate(last.date)}</span>
            <span>🔢 Rd ${last.round} of ${schedule.length}</span>
          </div>
        </div>` : ''}

        ${leader ? `
        <div class="analysis-card">
          <div class="an-tag">📊 CHAMPIONSHIP LEADER</div>
          <div class="an-title">${driverFullName(leader.Driver)} Leads the Title Fight</div>
          <div class="an-body">
            ${flag(leader.Driver.nationality)} <strong>${driverFullName(leader.Driver)}</strong> leads the ${season} Drivers' Championship
            with <strong>${leader.points} points</strong> and <strong>${leader.wins} win${leader.wins !== '1' ? 's' : ''}</strong>.
            ${ds[1] ? `The gap over ${driverFullName(ds[1].Driver)} in P2 is <strong>${(parseFloat(leader.points) - parseFloat(ds[1].points)).toFixed(0)} points</strong>.` : ''}
          </div>
          <div class="an-meta">
            <span>🏆 ${leader.wins} wins</span>
            <span>🔢 ${leader.points} pts</span>
          </div>
        </div>` : ''}

        ${cLeader ? `
        <div class="analysis-card">
          <div class="an-tag">🏎 CONSTRUCTORS</div>
          <div class="an-title">${cLeader.Constructor.name} Lead the Constructors' Title</div>
          <div class="an-body">
            <strong>${cLeader.Constructor.name}</strong> top the ${season} Constructors' Championship with
            <strong>${cLeader.points} points</strong> and <strong>${cLeader.wins} wins</strong>.
            ${cs[1] ? `They lead <strong>${cs[1].Constructor.name}</strong> by ${(parseFloat(cLeader.points) - parseFloat(cs[1].points)).toFixed(0)} points.` : ''}
          </div>
          <div class="an-meta">
            <span>🏆 ${cLeader.wins} wins</span>
            <span>🔢 ${cLeader.points} pts</span>
          </div>
        </div>` : ''}

        ${topWinner ? `
        <div class="analysis-card">
          <div class="an-tag">📈 SEASON STATS · ${season}</div>
          <div class="an-title">${season} By the Numbers</div>
          <div class="an-body">
            <strong>${completed.length}</strong> races completed of ${schedule.length} total.<br><br>
            🏆 Most wins: <strong>${topWinner[0]}</strong> (${topWinner[1]} wins)<br>
            🏎 Dominant team: <strong>${topTeam ? topTeam[0] : '—'}</strong> (${topTeam ? topTeam[1] : 0} wins)<br>
            🏁 Remaining: <strong>${schedule.length - completed.length}</strong> races to go
          </div>
          <div class="an-meta">
            <span>📊 ${season} Championship</span>
          </div>
        </div>` : ''}

        ${schedule.length && !completed.length ? `
        <div class="analysis-card featured">
          <div class="an-tag gold">📅 SEASON PREVIEW · ${season}</div>
          <div class="an-title">${season} — What to Watch</div>
          <div class="an-body">
            The ${season} Formula 1 season features <strong>${schedule.length} races</strong> across the globe.
            The season kicks off at <strong>${schedule[0]?.Circuit?.Location?.country}</strong> on <strong>${fmtDate(schedule[0]?.date)}</strong>
            and concludes at <strong>${schedule[schedule.length-1]?.Circuit?.Location?.country}</strong> on <strong>${fmtDate(schedule[schedule.length-1]?.date)}</strong>.
            Stay tuned for race-by-race analysis as the season unfolds.
          </div>
          <div class="an-meta">
            <span>🏁 ${schedule.length} races</span>
            <span>📅 ${fmtDate(schedule[0]?.date)} – ${fmtDate(schedule[schedule.length-1]?.date)}</span>
          </div>
        </div>` : ''}
      </div>
    `;
  } catch (err) {
    wrap.innerHTML = '<div style="color:var(--red);padding:32px">⚠ Failed to load analysis. Try again in a moment.</div>';
  }
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Set default season to current year
  const sel = document.getElementById('globalSeasonSelect');
  currentSeason = parseInt(sel.value);

  // Load home
  loadHomePage(currentSeason);
});
