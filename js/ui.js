/* =============================================
   F1BUZZ — UI MODULE
   Helper rendering functions
   ============================================= */

// ── CONSTANTS ─────────────────────────────────
const TWO_HOURS_MS    = 2 * 60 * 60 * 1000;
const HISTORY_PER_PAGE = 20;

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

// ── SAFE TEXT HELPER ──────────────────────────
// Use this instead of setting arbitrary strings via innerHTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── DEBOUNCE ──────────────────────────────────
function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
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
  return `${escapeHtml(d.givenName.charAt(0))}. ${escapeHtml(d.familyName)}`;
}
function driverFullName(d) {
  if (!d) return '???';
  return escapeHtml(`${d.givenName} ${d.familyName}`);
}

function driverInitials(d) {
  if (!d) return '??';
  const first = (d.givenName || '').charAt(0);
  const last = (d.familyName || '').charAt(0);
  return escapeHtml((first + last).toUpperCase() || '??');
}

function driverAvatarMarkup(d) {
  const headshot = d?.headshotUrl || d?.headshot_url || '';
  if (headshot) {
    return `<img class="pod-avatar-img" src="${escapeHtml(headshot)}" alt="${driverFullName(d)}" loading="lazy" referrerpolicy="no-referrer" />`;
  }
  return `<div class="pod-avatar-fallback">${driverInitials(d)}</div>`;
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
  if (diff < -TWO_HOURS_MS) return 'done';
  if (diff < TWO_HOURS_MS)  return 'live';
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
        <div class="pod-avatar">${driverAvatarMarkup(r.Driver)}</div>
        <div class="pod-pos ${positions[i]}">${trophies[i]}</div>
        <div class="pod-name">${driverFullName(r.Driver)}</div>
        <div class="pod-team" style="color:${escapeHtml(color)}">${escapeHtml(r.Constructor.name)}</div>
        <div class="pod-time">${r.Time ? '+' + escapeHtml(r.Time.time) : escapeHtml(r.status || '')}</div>
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
        <div class="mini-pos ${posClass}">${escapeHtml(s.position)}</div>
        <div class="team-bar" style="background:${escapeHtml(color)}"></div>
        <div class="mini-name">${driverName(s.Driver)}</div>
        <div class="mini-pts">${escapeHtml(s.points)}</div>
      </div>
    `;
  }).join('');
}

// ── CALENDAR TABLE ROWS ───────────────────────
function renderCalendarRows(schedule, results) {
  const resMap = {};
  (results || []).forEach(r => { resMap[r.round] = r; });

  return schedule.map(race => {
    const st = raceStatus(race);
    const res = resMap[race.round];
    const winner = res?.Results?.[0];
    const cf = countryFlag(race.Circuit.Location.country);

    const winnerCell = winner
      ? `<td><div class="td-driver">${driverName(winner.Driver)}</div></td>
         <td><div class="td-team" style="color:${teamColor(winner.Constructor.constructorId)}">${escapeHtml(winner.Constructor.name)}</div></td>
         <td class="td-date">${escapeHtml(winner.laps || '—')}</td>`
      : `<td>—</td><td>—</td><td>—</td>`;

    return `
      <tr>
        <td class="td-round">${String(race.round).padStart(2,'0')}</td>
        <td>
          <div style="font-size:20px;margin-bottom:4px">${cf}</div>
          <div class="td-race">${escapeHtml(race.raceName.replace(' Grand Prix',''))}</div>
          <div class="td-circuit">${escapeHtml(race.Circuit.circuitName)}</div>
        </td>
        <td class="td-date">${escapeHtml(race.Circuit.Location.locality)}</td>
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
        <div class="srow-pos ${pc}">${escapeHtml(s.position)}</div>
        <div class="srow-team-bar" style="background:${escapeHtml(color)}"></div>
        <div class="srow-info">
          <div class="srow-name">${flag(s.Driver.nationality)} ${driverFullName(s.Driver)}</div>
          <div class="srow-sub">${escapeHtml(s.Constructors?.[0]?.name || '')} · #${escapeHtml(s.Driver.permanentNumber || '—')}</div>
        </div>
        <div>
          <div class="pts-bar-wrap"><div class="pts-bar" style="width:${pct}%;background:${escapeHtml(color)}"></div></div>
        </div>
        <div class="srow-wins"><span>${escapeHtml(s.wins)}</span> WIN${s.wins !== '1' ? 'S' : ''}</div>
        <div class="srow-pts">${escapeHtml(s.points)}</div>
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
        <div class="srow-pos ${pc}">${escapeHtml(s.position)}</div>
        <div class="srow-team-bar" style="background:${escapeHtml(color)}"></div>
        <div class="srow-info">
          <div class="srow-name">${escapeHtml(s.Constructor.name)}</div>
          <div class="srow-sub">${escapeHtml(s.Constructor.nationality)}</div>
        </div>
        <div>
          <div class="pts-bar-wrap"><div class="pts-bar" style="width:${pct}%;background:${escapeHtml(color)}"></div></div>
        </div>
        <div class="srow-wins"><span>${escapeHtml(s.wins)}</span> WIN${s.wins !== '1' ? 'S' : ''}</div>
        <div class="srow-pts">${escapeHtml(s.points)}</div>
      </div>
    `;
  }).join('');
}

// ── HISTORY TABLE (paginated) ─────────────────
function renderHistoryRows(list, filter, page = 1) {
  // Escape the filter string before using it as a search term
  const q = escapeHtml((filter || '')).toLowerCase();

  const filtered = list.filter(sl => {
    if (!q) return true;
    const d = sl.DriverStandings?.[0]?.Driver;
    const c = sl.DriverStandings?.[0]?.Constructors?.[0];
    const txt = `${sl.season} ${d?.givenName || ''} ${d?.familyName || ''} ${c?.name || ''}`.toLowerCase();
    return txt.includes(q);
  });

  const start = (page - 1) * HISTORY_PER_PAGE;
  const paginated = filtered.slice(start, start + HISTORY_PER_PAGE);

  const rows = paginated.map(sl => {
    const s = sl.DriverStandings?.[0];
    if (!s) return '';
    const d = s.Driver;
    const c = s.Constructors?.[0];
    const color = teamColor(c?.constructorId);
    return `
      <tr>
        <td><span class="year-champ-badge">${escapeHtml(sl.season)}</span></td>
        <td>
          <div style="font-weight:700">${flag(d.nationality)} ${driverFullName(d)}</div>
          <div style="font-size:11px;color:var(--gray)">${escapeHtml(d.nationality)}</div>
        </td>
        <td>${flag(d.nationality)} ${escapeHtml(d.nationality)}</td>
        <td style="color:${escapeHtml(color)};font-weight:700">${escapeHtml(c?.name || '—')}</td>
        <td style="font-family:'Orbitron',monospace;font-weight:700;color:var(--red)">${escapeHtml(s.wins)}</td>
        <td style="font-family:'Orbitron',monospace;font-weight:700;color:var(--gold)">${escapeHtml(s.points)}</td>
      </tr>
    `;
  }).join('');

  // Render pagination controls if needed
  const totalPages = Math.ceil(filtered.length / HISTORY_PER_PAGE);
  let pagination = '';
  if (totalPages > 1) {
    const btns = [];
    for (let p = 1; p <= totalPages; p++) {
      btns.push(
        `<button class="page-btn ${p === page ? 'active' : ''}" onclick="handleHistoryPage(${p})">${p}</button>`
      );
    }
    pagination = `<div class="pagination-row">${btns.join('')}</div>`;
  }

  return rows + pagination;
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
      <div class="result-card" style="border-left-color:${escapeHtml(color)}">
        <div class="rc-round">RD ${escapeHtml(race.round)} · ${fmtDate(race.date)}</div>
        <div class="rc-flag">${cf}</div>
        <div class="rc-name">${escapeHtml(race.raceName.replace(' Grand Prix', ' GP'))}</div>
        <div class="rc-winner">🏆 <strong>${driverFullName(w.Driver)}</strong></div>
        <div class="rc-team" style="color:${escapeHtml(color)}">${escapeHtml(w.Constructor.name)}</div>
      </div>
    `;
  }).join('');
}

// ── MINI NEWS ─────────────────────────────────
function renderMiniNews(items) {
  if (!items.length) return '<div style="padding:14px;color:var(--gray);font-size:12px;text-align:center">No news available</div>';
  return items.map(item => {
    const ago = timeAgo(item.pub);
    return `
      <a class="news-row" href="${escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer">
        <div class="news-title">${escapeHtml(item.title)}</div>
        <div class="news-meta">
          <span class="news-source">${escapeHtml(item.source)}</span>
          <span class="news-ago">${ago}</span>
        </div>
      </a>
    `;
  }).join('');
}

function timeAgo(pubDateStr) {
  if (!pubDateStr) return '';
  const diff = Date.now() - new Date(pubDateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
