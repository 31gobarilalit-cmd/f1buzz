/* =============================================
   F1BUZZ — APP CONTROLLER
   ============================================= */

// ── CENTRALISED STATE ─────────────────────────
const AppState = {
  currentSeason: new Date().getFullYear(),
  countdownInterval: null,
  historyList: [],        // cached for search/pagination
  historyPage: 1,

  setCountdown(interval) {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = interval;
  },

  clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  },
};

// ── SAFE DOM HELPERS ──────────────────────────
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ── PAGE NAVIGATION ───────────────────────────
function showPage(name) {
  // Clear countdown when leaving home page
  const currentActive = document.querySelector('.page.active')?.id?.replace('page-', '');
  if (currentActive === 'home' && name !== 'home') {
    AppState.clearCountdown();
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  const link = document.querySelector(`.nav-link[data-page="${name}"]`);
  if (link) link.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'season')    loadSeasonPage(AppState.currentSeason);
  if (name === 'standings') loadStandingsPage(AppState.currentSeason);
  if (name === 'history')   loadHistoryPage();
  if (name === 'analysis')  loadAnalysisPage(AppState.currentSeason);
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
  AppState.currentSeason = parseInt(this.value);
  const activePage = document.querySelector('.page.active')?.id?.replace('page-', '');
  if (activePage === 'season')    loadSeasonPage(AppState.currentSeason);
  if (activePage === 'standings') loadStandingsPage(AppState.currentSeason);
  if (activePage === 'home')      loadHomePage(AppState.currentSeason);
  if (activePage === 'analysis')  loadAnalysisPage(AppState.currentSeason);
});

// ── COUNTDOWN TIMER ───────────────────────────
function startCountdown(raceDate, raceTime) {
  const target = new Date(raceDate + 'T' + (raceTime || '12:00:00Z'));

  function tick() {
    const diff = target - new Date();
    if (diff <= 0) {
      ['cdDays','cdHours','cdMins','cdSecs'].forEach(id => setText(id, '00'));
      AppState.clearCountdown();
      return;
    }
    const pad = n => String(Math.floor(n)).padStart(2, '0');
    setText('cdDays',  pad(diff / 86400000));
    setText('cdHours', pad((diff % 86400000) / 3600000));
    setText('cdMins',  pad((diff % 3600000) / 60000));
    setText('cdSecs',  pad((diff % 60000) / 1000));
  }

  tick();
  AppState.setCountdown(setInterval(tick, 1000));
}

// ── TICKER ────────────────────────────────────
function updateTicker(items) {
  const track = document.getElementById('tickerTrack');
  if (!track || !items.length) return;
  // Use textContent per span to avoid HTML injection
  track.innerHTML = '';
  items.forEach(t => {
    const span = document.createElement('span');
    span.style.marginRight = '60px';
    span.textContent = `🏎 ${t}`;
    track.appendChild(span);
  });
}

// ── LOAD HOME PAGE ─────────────────────────────
async function loadHomePage(season) {
  try {
    const [schedule, jolpikaResults, driverStandings, openF1Results] = await Promise.all([
      API.getSchedule(season),
      API.getResults(season).catch(() => []),
      API.getDriverStandings(season).catch(() => []),
      API.getRecentResultsOpenF1(season).catch(() => []),
    ]);

    const hasOpenF1 = openF1Results.length > 0;

    // Hero section
    if (hasOpenF1) {
      const last   = openF1Results[0];
      const winner = last.top3[0]?.driver;
      setText('heroEyebrow', `${season} FORMULA ONE WORLD CHAMPIONSHIP`);
      // heroTitle contains mixed text + flag emoji — safe to set via textContent per node
      const heroTitle = document.getElementById('heroTitle');
      if (heroTitle) {
        heroTitle.textContent = '';
        const flagSpan = document.createElement('span');
        flagSpan.className = 'country';
        flagSpan.textContent = countryFlag(last.country);
        heroTitle.appendChild(flagSpan);
        heroTitle.appendChild(document.createTextNode(
          ` ${last.meeting_name.replace(' Grand Prix','')} GRAND PRIX`
        ));
      }
      setText('heroSubtitle', `${last.country} · ${fmtDate(last.date.split('T')[0])}`);
      setHTML('podiumGrid', last.top3.map((r, i) => {
        const positions = ['p1','p2','p3'];
        const trophies  = ['🥇','🥈','🥉'];
        const color = r.driver.team_colour ? `#${r.driver.team_colour}` : '#888';
        return `
          <div class="podium-card ${positions[i]}">
            <div class="pod-pos ${positions[i]}">${trophies[i]}</div>
            <div class="pod-name">${escapeHtml(r.driver.full_name || '—')}</div>
            <div class="pod-team" style="color:${escapeHtml(color)}">${escapeHtml(r.driver.team_name || '—')}</div>
          </div>`;
      }).join(''));
    } else {
      const completedRaces = jolpikaResults.filter(r => raceStatus(r) === 'done');
      const lastRace = completedRaces[completedRaces.length - 1];
      if (lastRace) {
        const fullResult = await API.getRaceResult(season, lastRace.round);
        setText('heroEyebrow', `ROUND ${lastRace.round} · ${season} FORMULA ONE WORLD CHAMPIONSHIP`);
        const heroTitle = document.getElementById('heroTitle');
        if (heroTitle) {
          heroTitle.textContent = '';
          const flagSpan = document.createElement('span');
          flagSpan.className = 'country';
          flagSpan.textContent = countryFlag(lastRace.Circuit.Location.country);
          heroTitle.appendChild(flagSpan);
          heroTitle.appendChild(document.createTextNode(
            ` ${lastRace.raceName.replace(' Grand Prix','')} GRAND PRIX`
          ));
        }
        setText('heroSubtitle',
          `${lastRace.Circuit.circuitName}, ${lastRace.Circuit.Location.locality} · ${fmtDate(lastRace.date)}`
        );
        setHTML('podiumGrid', renderPodium(fullResult));
      } else {
        setText('heroEyebrow', `${season} SEASON`);
        setText('heroTitle', 'Season Upcoming');
        setText('heroSubtitle', 'No races completed yet');
        setHTML('podiumGrid', '<div class="podium-loading"><span>Season has not started yet</span></div>');
      }
    }

    // Mini standings
    setHTML('miniStandings', renderMiniStandings(driverStandings));
    setText('standingsBadge', `R${driverStandings[0]?.round || '—'}`);

    // Next race + countdown
    const nextRace = findNextRace(schedule);
    if (nextRace) {
      setText('nextRaceName', nextRace.raceName);
      setText('nextRaceMeta', `${nextRace.Circuit.circuitName} · ${fmtDate(nextRace.date)}`);
      startCountdown(nextRace.date, nextRace.time);
    } else {
      setText('nextRaceName', 'Season Complete');
      setText('nextRaceMeta', 'See you next year!');
    }

    // Season stats
    setText('statRaces', schedule.length);
    const completedCount = hasOpenF1
      ? openF1Results.length
      : jolpikaResults.filter(r => raceStatus(r) === 'done').length;
    setText('statDone', completedCount);
    const leader = driverStandings[0];
    if (leader) {
      setText('statLeader', leader.Driver.code || leader.Driver.familyName);
      setText('statLeaderPts', leader.points + ' pts');
    }

    // Recent results strip
    if (hasOpenF1) {
      setHTML('recentResults', openF1Results.slice(0, 6).map(race => {
        const w     = race.top3[0];
        const color = w?.driver?.team_colour ? `#${w.driver.team_colour}` : 'var(--red)';
        return `
          <div class="result-card" style="border-left-color:${escapeHtml(color)}">
            <div class="rc-round">${fmtDate(race.date.split('T')[0])}</div>
            <div class="rc-flag">${countryFlag(race.country)}</div>
            <div class="rc-name">${escapeHtml(race.meeting_name.replace(' Grand Prix',' GP'))}</div>
            <div class="rc-winner">🏆 <strong>${escapeHtml(w?.driver?.full_name || '—')}</strong></div>
            <div class="rc-team" style="color:${escapeHtml(color)}">${escapeHtml(w?.driver?.team_name || '—')}</div>
          </div>`;
      }).join(''));
    } else if (jolpikaResults.length) {
      setHTML('recentResults', renderResultCards(jolpikaResults));
    } else {
      setHTML('recentResults', '<div style="color:var(--gray);padding:32px">No results yet this season.</div>');
    }

    // Ticker
    const tickerItems = (hasOpenF1 ? openF1Results : jolpikaResults).slice(0, 5).map(r => {
      if (hasOpenF1) {
        const w = r.top3[0];
        return `${r.meeting_name}: ${w?.driver?.full_name || '—'} (${w?.driver?.team_name || '—'}) wins`;
      }
      const w = r.Results?.[0];
      return w ? `${r.raceName}: ${driverFullName(w.Driver)} (${w.Constructor.name}) wins` : r.raceName;
    });
    if (leader) tickerItems.unshift(`Championship leader: ${driverFullName(leader.Driver)} — ${leader.points} pts`);
    updateTicker(tickerItems);

  } catch (err) {
    console.error('Home load error:', err);
    setHTML('podiumGrid',
      '<div class="podium-loading"><span style="color:var(--red)">⚠ Could not load data. Try again shortly.</span></div>'
    );
  }
}

// ── LOAD SEASON PAGE ──────────────────────────
async function loadSeasonPage(season) {
  setText('calendarTitle', `${season} SEASON`);
  setHTML('calendarBody',
    '<tr><td colspan="8" class="loading-cell"><div class="spinner"></div> Loading…</td></tr>'
  );

  try {
    const [schedule, results] = await Promise.all([
      API.getSchedule(season),
      API.getResults(season).catch(() => []),
    ]);

    setHTML('calendarBody', renderCalendarRows(schedule, results));

    const champBar = document.getElementById('seasonChampBar');
    if (season < new Date().getFullYear() && results.length === schedule.length) {
      const ds = await API.getDriverStandings(season).catch(() => []);
      const cs = await API.getConstructorStandings(season).catch(() => []);
      if (ds.length && cs.length) {
        const dChamp = ds[0];
        const cChamp = cs[0];
        champBar.style.display = 'flex';
        setHTML('seasonChampBar', `
          <div class="champ-item">
            <div class="champ-item-label">Drivers' Champion</div>
            <div class="champ-item-val" style="color:var(--gold)">${flag(dChamp.Driver.nationality)} ${driverFullName(dChamp.Driver)}</div>
          </div>
          <div class="champ-divider"></div>
          <div class="champ-item">
            <div class="champ-item-label">Team</div>
            <div class="champ-item-val" style="color:${teamColor(dChamp.Constructors?.[0]?.constructorId)}">${escapeHtml(dChamp.Constructors?.[0]?.name || '—')}</div>
          </div>
          <div class="champ-divider"></div>
          <div class="champ-item">
            <div class="champ-item-label">Constructors' Champion</div>
            <div class="champ-item-val" style="color:${teamColor(cChamp.Constructor.constructorId)}">${escapeHtml(cChamp.Constructor.name)}</div>
          </div>
          <div class="champ-divider"></div>
          <div class="champ-item">
            <div class="champ-item-label">Total Races</div>
            <div class="champ-item-val">${schedule.length}</div>
          </div>
        `);
      }
    } else if (champBar) {
      champBar.style.display = 'none';
    }
  } catch (err) {
    console.error('Season page error:', err);
    setHTML('calendarBody',
      '<tr><td colspan="8" class="loading-cell" style="color:var(--red)">⚠ Failed to load — API may be rate-limited. Refresh in a moment.</td></tr>'
    );
  }
}

// ── LOAD STANDINGS PAGE ────────────────────────
async function loadStandingsPage(season) {
  setText('standingsPageTitle', `${season} CHAMPIONSHIP`);
  setHTML('driverStandingsWrap',      '<div class="spinner-center"><div class="spinner"></div></div>');
  setHTML('constructorStandingsWrap', '<div class="spinner-center"><div class="spinner"></div></div>');

  try {
    const [ds, cs] = await Promise.all([
      API.getDriverStandings(season),
      API.getConstructorStandings(season),
    ]);
    setHTML('driverStandingsWrap',      renderDriverStandings(ds));
    setHTML('constructorStandingsWrap', renderConstructorStandings(cs));
  } catch (err) {
    console.error('Standings page error:', err);
    const msg = '<div style="padding:32px;color:var(--red)">⚠ Failed to load standings</div>';
    setHTML('driverStandingsWrap', msg);
    setHTML('constructorStandingsWrap', msg);
  }
}

// ── HISTORY PAGE ──────────────────────────────
// Exposed globally so pagination buttons can call it
function handleHistoryPage(page) {
  AppState.historyPage = page;
  const filter = document.getElementById('historySearch')?.value || '';
  setHTML('historyBody', renderHistoryRows(AppState.historyList, filter, page));
}

async function loadHistoryPage() {
  if (
    document.getElementById('historyBody').children.length > 1 &&
    !document.getElementById('historyBody').querySelector('.loading-cell')
  ) return;

  setHTML('historyBody',
    '<tr><td colspan="6" class="loading-cell"><div class="spinner"></div> Loading champion history…</td></tr>'
  );

  try {
    AppState.historyList = await API.getChampionHistory();
    AppState.historyPage = 1;
    setHTML('historyBody', renderHistoryRows(AppState.historyList, '', 1));

    // Debounced search — re-attach only once
    const searchEl = document.getElementById('historySearch');
    if (searchEl && !searchEl.dataset.bound) {
      searchEl.dataset.bound = 'true';
      searchEl.addEventListener('input', debounce(function () {
        AppState.historyPage = 1;
        setHTML('historyBody', renderHistoryRows(AppState.historyList, this.value, 1));
      }, 300));
    }
  } catch (err) {
    console.error('History page error:', err);
    setHTML('historyBody',
      '<tr><td colspan="6" class="loading-cell" style="color:var(--red)">⚠ Failed to load history</td></tr>'
    );
  }
}

// ── LOAD ANALYSIS PAGE ────────────────────────
async function loadAnalysisPage(season) {
  const wrap = document.getElementById('analysisContent');
  setHTML('analysisContent', '<div class="spinner-center"><div class="spinner"></div></div>');

  try {
    const [schedule, results, ds, cs] = await Promise.all([
      API.getSchedule(season),
      API.getResults(season).catch(() => []),
      API.getDriverStandings(season).catch(() => []),
      API.getConstructorStandings(season).catch(() => []),
    ]);

    const completed = results.filter(r => raceStatus(r) === 'done');
    const leader  = ds[0];
    const cLeader = cs[0];
    const last    = completed[completed.length - 1];
    const lastW   = last?.Results?.[0];

    // Win counts
    const winMap = {};
    completed.forEach(r => {
      const w = r.Results?.[0];
      if (w) {
        const name = driverFullName(w.Driver);
        winMap[name] = (winMap[name] || 0) + 1;
      }
    });
    const topWinner = Object.entries(winMap).sort((a, b) => b[1] - a[1])[0];

    const teamWinMap = {};
    completed.forEach(r => {
      const w = r.Results?.[0];
      if (w) {
        const t = w.Constructor.name;
        teamWinMap[t] = (teamWinMap[t] || 0) + 1;
      }
    });
    const topTeam = Object.entries(teamWinMap).sort((a, b) => b[1] - a[1])[0];

    setHTML('analysisContent', `
      <div class="analysis-grid">
        ${last ? `
        <div class="analysis-card featured">
          <div class="an-tag gold">🏁 LATEST RACE · ${escapeHtml(String(season))} ROUND ${escapeHtml(String(last.round))}</div>
          <div class="an-title">${escapeHtml(last.raceName)} — Race Report</div>
          <div class="an-body">
            ${lastW
              ? `<strong>${driverFullName(lastW.Driver)}</strong> (${escapeHtml(lastW.Constructor.name)}) claimed victory at <strong>${escapeHtml(last.Circuit.circuitName)}</strong>.
                 ${lastW.laps ? `The race ran for ${escapeHtml(String(lastW.laps))} laps.` : ''}
                 ${lastW.Time ? `Race time: ${escapeHtml(lastW.Time.time)}.` : ''}`
              : 'Result data not available.'}
          </div>
          <div class="an-meta">
            <span>📍 ${escapeHtml(last.Circuit.Location.locality)}, ${escapeHtml(last.Circuit.Location.country)}</span>
            <span>📅 ${fmtDate(last.date)}</span>
            <span>🔢 Rd ${escapeHtml(String(last.round))} of ${schedule.length}</span>
          </div>
        </div>` : ''}

        ${leader ? `
        <div class="analysis-card">
          <div class="an-tag">📊 CHAMPIONSHIP LEADER</div>
          <div class="an-title">${driverFullName(leader.Driver)} Leads the Title Fight</div>
          <div class="an-body">
            ${flag(leader.Driver.nationality)} <strong>${driverFullName(leader.Driver)}</strong> leads the ${season} Drivers' Championship
            with <strong>${escapeHtml(leader.points)} points</strong> and <strong>${escapeHtml(leader.wins)} win${leader.wins !== '1' ? 's' : ''}</strong>.
            ${ds[1] ? `The gap over ${driverFullName(ds[1].Driver)} in P2 is <strong>${(parseFloat(leader.points) - parseFloat(ds[1].points)).toFixed(0)} points</strong>.` : ''}
          </div>
          <div class="an-meta">
            <span>🏆 ${escapeHtml(leader.wins)} wins</span>
            <span>🔢 ${escapeHtml(leader.points)} pts</span>
          </div>
        </div>` : ''}

        ${cLeader ? `
        <div class="analysis-card">
          <div class="an-tag">🏎 CONSTRUCTORS</div>
          <div class="an-title">${escapeHtml(cLeader.Constructor.name)} Lead the Constructors' Title</div>
          <div class="an-body">
            <strong>${escapeHtml(cLeader.Constructor.name)}</strong> top the ${season} Constructors' Championship with
            <strong>${escapeHtml(cLeader.points)} points</strong> and <strong>${escapeHtml(cLeader.wins)} wins</strong>.
            ${cs[1] ? `They lead <strong>${escapeHtml(cs[1].Constructor.name)}</strong> by ${(parseFloat(cLeader.points) - parseFloat(cs[1].points)).toFixed(0)} points.` : ''}
          </div>
          <div class="an-meta">
            <span>🏆 ${escapeHtml(cLeader.wins)} wins</span>
            <span>🔢 ${escapeHtml(cLeader.points)} pts</span>
          </div>
        </div>` : ''}

        ${topWinner ? `
        <div class="analysis-card">
          <div class="an-tag">📈 SEASON STATS · ${season}</div>
          <div class="an-title">${season} By the Numbers</div>
          <div class="an-body">
            <strong>${completed.length}</strong> races completed of ${schedule.length} total.<br><br>
            🏆 Most wins: <strong>${escapeHtml(topWinner[0])}</strong> (${topWinner[1]} wins)<br>
            🏎 Dominant team: <strong>${topTeam ? escapeHtml(topTeam[0]) : '—'}</strong> (${topTeam ? topTeam[1] : 0} wins)<br>
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
            The season kicks off at <strong>${escapeHtml(schedule[0]?.Circuit?.Location?.country)}</strong> on <strong>${fmtDate(schedule[0]?.date)}</strong>
            and concludes at <strong>${escapeHtml(schedule[schedule.length - 1]?.Circuit?.Location?.country)}</strong> on <strong>${fmtDate(schedule[schedule.length - 1]?.date)}</strong>.
            Stay tuned for race-by-race analysis as the season unfolds.
          </div>
          <div class="an-meta">
            <span>🏁 ${schedule.length} races</span>
            <span>📅 ${fmtDate(schedule[0]?.date)} – ${fmtDate(schedule[schedule.length - 1]?.date)}</span>
          </div>
        </div>` : ''}
      </div>
    `);
  } catch (err) {
    console.error('Analysis page error:', err);
    setHTML('analysisContent',
      '<div style="color:var(--red);padding:32px">⚠ Failed to load analysis. Try again in a moment.</div>'
    );
  }
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const sel = document.getElementById('globalSeasonSelect');
  AppState.currentSeason = parseInt(sel.value);
  loadHomePage(AppState.currentSeason);
});
