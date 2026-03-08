const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 1800 }); // cache 30 minutes

// ── CORS — allow your GitHub Pages site ──────
app.use(cors({
  origin: '*', // allow all origins (lock down to your domain later if you want)
  methods: ['GET'],
}));
app.use(express.json());

const CURRENT_SEASON = new Date().getFullYear();
const NEWS_FEED_URL = 'https://news.google.com/rss/search?q=Formula+1&hl=en-IN&gl=IN&ceid=IN:en';

// ── HELPERS ───────────────────────────────────
async function fetchPage(url) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; F1BuzzBot/1.0)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 10000,
  });
  return cheerio.load(res.data);
}

function cleanText(str) {
  return (str || '').replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeNewsTitle(title) {
  return cleanText(title).replace(/\s+-\s+[^-]+$/, '');
}

function parseNewsSource(title) {
  const match = cleanText(title).match(/\s+-\s+([^-]+)$/);
  return match ? match[1].trim() : 'Google News';
}

// ── SCRAPE: SEASON RESULTS FROM WIKIPEDIA ─────
async function scrapeSeasonResults(year) {
  const cacheKey = `results_${year}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `https://en.wikipedia.org/wiki/${year}_Formula_One_World_Championship`;
  const $ = await fetchPage(url);

  const races = [];

  // Find the season results table — look for tables with race round data
  $('table.wikitable').each((i, table) => {
    const headers = [];
    $(table).find('tr').first().find('th').each((_, th) => {
      headers.push(cleanText($(th).text()).toLowerCase());
    });

    // Only process tables that look like race results (have "grand prix" column)
    const hasGP = headers.some(h => h.includes('grand prix') || h.includes('race'));
    const hasWinner = headers.some(h => h.includes('winning') || h.includes('driver') || h.includes('winner'));
    if (!hasGP || !hasWinner) return;

    $(table).find('tr').each((rowIdx, row) => {
      if (rowIdx === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length < 4) return;

      const round = cleanText($(cells[0]).text());
      if (!round || isNaN(parseInt(round))) return;

      const gpName = cleanText($(cells[1]).text());
      const circuit = cleanText($(cells[2]).text());
      const date = cleanText($(cells[3]).text());

      // Find winner and constructor columns
      let winner = '', team = '', laps = '', time = '';
      cells.each((ci, cell) => {
        const hdr = headers[ci] || '';
        const txt = cleanText($(cell).text());
        if (hdr.includes('winning driver') || hdr.includes('winner')) winner = txt;
        if (hdr.includes('winning constructor') || hdr.includes('constructor')) team = txt;
        if (hdr.includes('laps')) laps = txt;
        if (hdr.includes('time') || hdr.includes('distance')) time = txt;
      });

      // Fallback: columns 4,5,6 if named columns didn't work
      if (!winner && cells.length > 4) winner = cleanText($(cells[4]).text());
      if (!team && cells.length > 5) team = cleanText($(cells[5]).text());
      if (!laps && cells.length > 6) laps = cleanText($(cells[6]).text());

      if (gpName && winner) {
        races.push({
          round: parseInt(round),
          name: gpName,
          circuit,
          date,
          winner,
          team,
          laps,
          time,
          status: 'done'
        });
      }
    });
  });

  const result = { year, races, source: 'Wikipedia', updatedAt: new Date().toISOString() };
  if (races.length) cache.set(cacheKey, result);
  return result;
}

// ── SCRAPE: DRIVER STANDINGS ──────────────────
async function scrapeDriverStandings(year) {
  const cacheKey = `dstandings_${year}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `https://en.wikipedia.org/wiki/${year}_Formula_One_World_Championship`;
  const $ = await fetchPage(url);

  const standings = [];

  $('table.wikitable').each((i, table) => {
    const headers = [];
    $(table).find('tr').first().find('th').each((_, th) => {
      headers.push(cleanText($(th).text()).toLowerCase());
    });

    const hasDriver = headers.some(h => h.includes('driver'));
    const hasPts = headers.some(h => h === 'pts' || h === 'points');
    if (!hasDriver || !hasPts) return;
    if (standings.length > 0) return; // already found

    $(table).find('tr').each((rowIdx, row) => {
      if (rowIdx === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const pos = cleanText($(cells[0]).text());
      if (!pos || isNaN(parseInt(pos))) return;

      const driver = cleanText($(cells[1]).text());
      const nationality = cells.length > 2 ? cleanText($(cells[2]).text()) : '';

      // Find points column
      let points = '', wins = '', team = '';
      cells.each((ci, cell) => {
        const hdr = headers[ci] || '';
        const txt = cleanText($(cell).text());
        if (hdr === 'pts' || hdr === 'points') points = txt;
        if (hdr === 'wins' || hdr === 'w') wins = txt;
        if (hdr.includes('team') || hdr.includes('constructor')) team = txt;
      });

      if (!points && cells.length > 3) points = cleanText($(cells[cells.length - 1]).text());

      if (driver && points) {
        standings.push({
          position: parseInt(pos),
          driver,
          nationality,
          team,
          points,
          wins: wins || '0',
        });
      }
    });
  });

  const result = { year, standings, source: 'Wikipedia', updatedAt: new Date().toISOString() };
  if (standings.length) cache.set(cacheKey, result);
  return result;
}

// ── SCRAPE: CONSTRUCTOR STANDINGS ────────────
async function scrapeConstructorStandings(year) {
  const cacheKey = `cstandings_${year}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `https://en.wikipedia.org/wiki/${year}_Formula_One_World_Championship`;
  const $ = await fetchPage(url);

  const standings = [];
  let foundDriverTable = false;

  $('table.wikitable').each((i, table) => {
    const headers = [];
    $(table).find('tr').first().find('th').each((_, th) => {
      headers.push(cleanText($(th).text()).toLowerCase());
    });

    const hasConstructor = headers.some(h => h.includes('constructor') || h.includes('team'));
    const hasPts = headers.some(h => h === 'pts' || h === 'points');
    const hasDriver = headers.some(h => h === 'driver');

    if (!hasConstructor || !hasPts || hasDriver) return; // skip driver table
    if (standings.length > 0) return;

    $(table).find('tr').each((rowIdx, row) => {
      if (rowIdx === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const pos = cleanText($(cells[0]).text());
      if (!pos || isNaN(parseInt(pos))) return;

      const team = cleanText($(cells[1]).text());
      let points = '', wins = '';
      cells.each((ci, cell) => {
        const hdr = headers[ci] || '';
        const txt = cleanText($(cell).text());
        if (hdr === 'pts' || hdr === 'points') points = txt;
        if (hdr === 'wins' || hdr === 'w') wins = txt;
      });
      if (!points) points = cleanText($(cells[cells.length - 1]).text());

      if (team && points) {
        standings.push({ position: parseInt(pos), team, points, wins: wins || '0' });
      }
    });
  });

  const result = { year, standings, source: 'Wikipedia', updatedAt: new Date().toISOString() };
  if (standings.length) cache.set(cacheKey, result);
  return result;
}

// ── SCRAPE: SCHEDULE ──────────────────────────
async function scrapeSchedule(year) {
  const cacheKey = `schedule_${year}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Use Jolpica for schedule (Wikipedia layout varies too much)
  const res = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}/races/?limit=30`, { timeout: 8000 });
  const races = res.data.MRData.RaceTable.Races;

  const result = { year, races, updatedAt: new Date().toISOString() };
  cache.set(cacheKey, result);
  return result;
}

async function scrapeNews() {
  const cacheKey = 'news_latest';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const res = await axios.get(NEWS_FEED_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; F1BuzzBot/1.0)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 10000,
  });

  const $ = cheerio.load(res.data, { xmlMode: true });
  const seen = new Set();
  const items = [];

  $('item').each((_, item) => {
    if (items.length >= 6) return false;

    const rawTitle = $('title', item).text();
    const title = normalizeNewsTitle(rawTitle);
    const link = $('link', item).text().trim();
    const pub = $('pubDate', item).text().trim();
    const source = parseNewsSource(rawTitle);

    if (!title || !link) return;
    const dedupeKey = title.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    items.push({
      title,
      source,
      link,
      pub: pub ? new Date(pub).toISOString() : new Date().toISOString(),
    });
  });

  const result = { items, updatedAt: new Date().toISOString() };
  cache.set(cacheKey, result);
  return result;
}

// ── ROUTES ────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'F1BUZZ Backend running 🏎', version: '1.0.0', time: new Date().toISOString() });
});

// Season race results
app.get('/api/results/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year) || CURRENT_SEASON;
    const data = await scrapeSeasonResults(year);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Results error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Driver standings
app.get('/api/standings/drivers/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year) || CURRENT_SEASON;
    const data = await scrapeDriverStandings(year);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Driver standings error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Constructor standings
app.get('/api/standings/constructors/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year) || CURRENT_SEASON;
    const data = await scrapeConstructorStandings(year);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Constructor standings error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Schedule (race calendar)
app.get('/api/schedule/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year) || CURRENT_SEASON;
    const data = await scrapeSchedule(year);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Schedule error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Latest F1 news
app.get('/api/news', async (req, res) => {
  try {
    const data = await scrapeNews();
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('News error:', err.message);
    res.status(500).json({ success: false, error: err.message, items: [] });
  }
});

// Combined: everything for a season in one call
app.get('/api/season/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year) || CURRENT_SEASON;
    const [results, driverStandings, constructorStandings, schedule] = await Promise.allSettled([
      scrapeSeasonResults(year),
      scrapeDriverStandings(year),
      scrapeConstructorStandings(year),
      scrapeSchedule(year),
    ]);

    res.json({
      success: true,
      year,
      results: results.status === 'fulfilled' ? results.value : null,
      driverStandings: driverStandings.status === 'fulfilled' ? driverStandings.value : null,
      constructorStandings: constructorStandings.status === 'fulfilled' ? constructorStandings.value : null,
      schedule: schedule.status === 'fulfilled' ? schedule.value : null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear cache (useful after race day)
app.get('/api/refresh', (req, res) => {
  cache.flushAll();
  res.json({ success: true, message: 'Cache cleared' });
});

// ── START ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏎 F1BUZZ Backend running on port ${PORT}`);
});
