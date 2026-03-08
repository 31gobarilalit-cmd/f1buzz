/* =============================================
   F1BUZZ — UI MODULE
   Helper rendering functions
   ============================================= */

// ── TEAM COLOUR MAP ───────────────────────────
const TEAM_COLORS = {
  mclaren:       '#ff8000',
  mercedes:      '#00d2be',
  red_bull:      '#3671c6',
  ferrari:       '#e8002d',
  williams:      '#64c4ff',
  aston_martin:  '#358c75',
  alpine:        '#0090ff',
  haas:          '#b6babd',
  rb:            '#6692ff',
  kick_sauber:   '#f596c8',
  sauber:        '#f596c8',
};

function teamColor(constructorId) {
  return TEAM_COLORS[constructorId] || '#888';
}

function teamClass(constructorId) {
  return `c-${constructorId || 'default'}`;
}

// ── NATIONALITY → FLAG EMOJI ──────────────────
const FLAGS = {
  British:'🇬🇧', German:'🇩🇪', Dutch:'🇳🇱', Spanish:'🇪🇸', Finnish:'🇫🇮',
  Australian:'🇦🇺', French:'🇫🇷', Brazilian:'🇧🇷', Italian:'🇮🇹', Mexican:'🇲🇽',
  Canadian:'🇨🇦', Austrian:'🇦🇹', Danish:'🇩🇰', Monegasque:'🇲🇨', Japanese:'🇯🇵',
  American:'🇺🇸', Thai:'🇹🇭', Chinese:'🇨🇳', Swiss:'🇨🇭', Argentine:'🇦🇷',
  Belgian:'🇧🇪', New_Zealander:'🇳🇿', Polish:'🇵🇱', Swedish:'🇸🇪',
  Venezuelan:'🇻🇪', South_African:'🇿🇦', Scottish:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
};
function flag(nationality) {
  if (!nationality) return '🏁';
  const key = nationality.replace(/\s/g, '_');
  return FLAGS[key] || '🏁';
}

// ── COUNTRY → FLAG ────────────────────────────
const COUNTRY_FLAGS = {
  Australia:'🇦🇺', China:'🇨🇳', Japan:'🇯🇵', Bahrain:'🇧🇭', 'Saudi Arabia':'🇸🇦',
  USA:'🇺🇸', Italy:'🇮🇹', Monaco:'🇲🇨', Spain:'🇪🇸', Canada:'🇨🇦',
  Austria:'🇦🇹', UK:'🇬🇧', Hungary:'🇭🇺', Belgium:'🇧🇪', Netherlands:'🇳🇱',
  Singapore:'🇸🇬', Azerbaijan:'🇦🇿', Mexico:'🇲🇽', Brazil:'🇧🇷', UAE:'🇦🇪',
  France:'🇫🇷', Germany:'🇩🇪', Portugal:'🇵🇹', Qatar:'🇶🇦', 'Las Vegas':'🇺🇸',
  Miami:'🇺🇸',
};
function countryFlag(country) { return COUNTRY_FLAGS[country] || '🏁'; }

// ── DRIVER DISPLAY NAME ───────────────────────
function driverName(d) {
  if (!d) return '—';
  return `${d.givenName.charAt(0)}. ${d.familyName}`;
}
function driverFullName(d) {
  if (!d) return '—';
  return `${d.givenName} ${d.familyName}`;
}

// ── FORMAT DATE ───────────────────────────────
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ── RACE STATUS ───────────────────────────────
function raceStatus(race) {
  const now = new Date();
  const raceDate = new Date(race.date + 'T' + (race.time || '12:00:00Z'));
  const diff = raceDate - now;
  if (diff < -7200000) return 'done';       // >2hrs past
  if (diff < 7200000)  return 'live';       // within 2hrs either side
  return 'upcoming';
}

function statusBadge(status) {
  if (status === 'done')     return '<span class="badge badge-done">DONE</span>';
  if (status === 'live')     return '<span class="badge badge-next">LIVE 🔴</span>';
  return '<span class="badge badge-upcoming">TBD</span>';
}

// Find next upcoming race from a list
function findNextRace(races) {
  const now = new Date();
  return races.find(r => {
    const rd = new Date(r.date + 'T' + (r.time || '12:00:00Z'));
    return rd > now;
  });
}

// ── PODIUM CARDS ─────────────────────────────
function renderPodium(raceResult) {
  if (!raceResult || !raceResult.Results) return '<div class="podium-loading"><span>No data available</span></div>';
  const top3 = raceResult.Results.slice(0, 3);
  const positions = ['p1','p2','p3'];
  const trophies = ['🥇','🥈','🥉'];
  return top3.map((r, i) => {
    const cid = r.Constructor.constructorId;
    const color = teamColor(cid);
    return `
      <div class="podium-card ${positions[i]}">
        <div class="pod-pos ${positions[i]}">${trophies[i]}</div>
        <div class="pod-name">${driverFullName(r.Driver)}</div>
        <div class="pod-team" style="color:${color}">${r.Constructor.name}</div>
        <div class="pod-time">${r.Time ? '+' + r.Time.time : r.status || ''}</div>
      </div>
    `;
  }).join('');
}

// ── MINI STANDINGS ────────────────────────────
function renderMiniStandings(standings) {
  if (!standings.length) return '<div style="padding:16px;color:var(--gray);text-align:center">No standings data</div>';
  const top10 = standings.slice(0, 10);
  const posClasses = ['gold', 'top2', 'top3'];
  return top10.map((s, i) => {
    const cid = s.Constructors?.[0]?.constructorId || '';
    const color = teamColor(cid);
    const posClass = posClasses[i] || '';
    return `
      <div class="mini-row">
        <div class="mini-pos ${posClass}">${s.position}</div>
        <div class="team-bar" style="background:${color}"></div>
        <div class="mini-name">${driverName(s.Driver)}</div>
        <div class="mini-pts">${s.points}</div>
      </div>
    `;
  }).join('');
}

// ── CALENDAR TABLE ROWS ───────────────────────
function renderCalendarRows(schedule, results) {
  // Build a results map keyed by round
  const resMap = {};
  (results || []).forEach(r => { resMap[r.round] = r; });

  return schedule.map(race => {
    const st = raceStatus(race);
    const res = resMap[race.round];
    const winner = res?.Results?.[0];
    const cf = countryFlag(race.Circuit.Location.country);

    const winnerCell = winner
      ? `<td><div class="td-driver">${driverName(winner.Driver)}</div></td>
         <td><div class="td-team" style="color:${teamColor(winner.Constructor.constructorId)}">${winner.Constructor.name}</div></td>
         <td class="td-date">${winner.laps || '—'}</td>`
      : `<td>—</td><td>—</td><td>—</td>`;

    return `
      <tr>
        <td class="td-round">${String(race.round).padStart(2,'0')}</td>
        <td>
          <div style="font-size:20px;margin-bottom:4px">${cf}</div>
          <div class="td-race">${race.raceName.replace(' Grand Prix','')}</div>
          <div class="td-circuit">${race.Circuit.circuitName}</div>
        </td>
        <td class="td-date">${race.Circuit.Location.locality}</td>
        <td class="td-date">${fmtDate(race.date)}</td>
        ${winnerCell}
        <td>${statusBadge(st)}</td>
      </tr>
    `;
  }).join('');
}

// ── DRIVER STANDINGS FULL ─────────────────────
function renderDriverStandings(standings) {
  if (!standings.length) return '<div style="padding:32px;text-align:center;color:var(--gray)">No data</div>';
  const maxPts = parseFloat(standings[0].points) || 1;
  const posClasses = { '1':'top1', '2':'top2', '3':'top3' };

  return standings.map(s => {
    const cid = s.Constructors?.[0]?.constructorId || '';
    const color = teamColor(cid);
    const pct = ((parseFloat(s.points) / maxPts) * 100).toFixed(1);
    const pc = posClasses[s.position] || '';
    return `
      <div class="standings-row">
        <div class="srow-pos ${pc}">${s.position}</div>
        <div class="srow-team-bar" style="background:${color}"></div>
        <div class="srow-info">
          <div class="srow-name">${flag(s.Driver.nationality)} ${driverFullName(s.Driver)}</div>
          <div class="srow-sub">${s.Constructors?.[0]?.name || ''} · #${s.Driver.permanentNumber || '—'}</div>
        </div>
        <div>
          <div class="pts-bar-wrap"><div class="pts-bar" style="width:${pct}%;background:${color}"></div></div>
        </div>
        <div class="srow-wins"><span>${s.wins}</span> WIN${s.wins !== '1' ? 'S' : ''}</div>
        <div class="srow-pts">${s.points}</div>
      </div>
    `;
  }).join('');
}

// ── CONSTRUCTOR STANDINGS FULL ────────────────
function renderConstructorStandings(standings) {
  if (!standings.length) return '<div style="padding:32px;text-align:center;color:var(--gray)">No data</div>';
  const maxPts = parseFloat(standings[0].points) || 1;
  const posClasses = { '1':'top1', '2':'top2', '3':'top3' };

  return standings.map(s => {
    const cid = s.Constructor.constructorId;
    const color = teamColor(cid);
    const pct = ((parseFloat(s.points) / maxPts) * 100).toFixed(1);
    const pc = posClasses[s.position] || '';
    return `
      <div class="standings-row">
        <div class="srow-pos ${pc}">${s.position}</div>
        <div class="srow-team-bar" style="background:${color}"></div>
        <div class="srow-info">
          <div class="srow-name">${s.Constructor.name}</div>
          <div class="srow-sub">${s.Constructor.nationality}</div>
        </div>
        <div>
          <div class="pts-bar-wrap"><div class="pts-bar" style="width:${pct}%;background:${color}"></div></div>
        </div>
        <div class="srow-wins"><span>${s.wins}</span> WIN${s.wins !== '1' ? 'S' : ''}</div>
        <div class="srow-pts">${s.points}</div>
      </div>
    `;
  }).join('');
}

// ── HISTORY TABLE ─────────────────────────────
function renderHistoryRows(list, filter) {
  const q = (filter || '').toLowerCase();
  return list
    .filter(sl => {
      if (!q) return true;
      const d = sl.DriverStandings?.[0]?.Driver;
      const c = sl.DriverStandings?.[0]?.Constructors?.[0];
      const txt = `${sl.season} ${d?.givenName} ${d?.familyName} ${c?.name}`.toLowerCase();
      return txt.includes(q);
    })
    .map(sl => {
      const s = sl.DriverStandings?.[0];
      if (!s) return '';
      const d = s.Driver;
      const c = s.Constructors?.[0];
      const color = teamColor(c?.constructorId);
      return `
        <tr>
          <td><span class="year-champ-badge">${sl.season}</span></td>
          <td>
            <div style="font-weight:700">${flag(d.nationality)} ${driverFullName(d)}</div>
            <div style="font-size:11px;color:var(--gray)">${d.nationality}</div>
          </td>
          <td>${flag(d.nationality)} ${d.nationality}</td>
          <td style="color:${color};font-weight:700">${c?.name || '—'}</td>
          <td style="font-family:'Orbitron',monospace;font-weight:700;color:var(--red)">${s.wins}</td>
          <td style="font-family:'Orbitron',monospace;font-weight:700;color:var(--gold)">${s.points}</td>
        </tr>
      `;
    }).join('');
}

// ── RECENT RESULTS STRIP ──────────────────────
function renderResultCards(raceResults) {
  return raceResults.slice(-6).reverse().map(race => {
    const w = race.Results?.[0];
    if (!w) return '';
    const cid = w.Constructor.constructorId;
    const color = teamColor(cid);
    const cf = countryFlag(race.Circuit.Location.country);
    return `
      <div class="result-card" style="border-left-color:${color}">
        <div class="rc-round">RD ${race.round} · ${fmtDate(race.date)}</div>
        <div class="rc-flag">${cf}</div>
        <div class="rc-name">${race.raceName.replace(' Grand Prix', ' GP')}</div>
        <div class="rc-winner">🏆 <strong>${driverFullName(w.Driver)}</strong></div>
        <div class="rc-team" style="color:${color}">${w.Constructor.name}</div>
      </div>
    `;
  }).join('');
}
