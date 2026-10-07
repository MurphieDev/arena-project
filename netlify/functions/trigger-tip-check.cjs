'use strict';
const https = require('https');

const WEB_API_KEY = process.env.FIREBASE_TOKEN || 'AIzaSyDaegUsnDK9H1D0_r5Hnf-IAaCUqBT-BU4';
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'sport-x-af95c';
const VERIFY_EMAIL = process.env.VERIFY_EMAIL || 'tipverify@arena.app';
const VERIFY_PASSWORD = process.env.VERIFY_PASSWORD || 'ArenaVerify2026!';

// ── HTTP helper ────────────────────────────────────────────────
function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    r.on('error', reject);
    r.setTimeout(10000, () => { r.destroy(); resolve({}); });
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

// ── Firebase Auth ──────────────────────────────────────────────
async function getToken() {
  const body = JSON.stringify({ email: VERIFY_EMAIL, password: VERIFY_PASSWORD, returnSecureToken: true });
  const res = await req({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  if (!res.idToken) throw new Error('Auth failed: ' + JSON.stringify(res));
  return res.idToken;
}

// ── Firestore helpers ──────────────────────────────────────────
const FS = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fsList(path, token) {
  const res = await req({
    hostname: 'firestore.googleapis.com',
    path: `${FS}/${path}?pageSize=300`,
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.documents || [];
}

async function fsPatch(path, fields, token) {
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const body = JSON.stringify({ fields });
  return req({
    hostname: 'firestore.googleapis.com',
    path: `${FS}/${path}?${mask}`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);
}

async function fsAdd(path, fields, token) {
  const body = JSON.stringify({ fields });
  return req({
    hostname: 'firestore.googleapis.com',
    path: `${FS}/${path}`,
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);
}

// ── Firestore value helpers ────────────────────────────────────
function tv(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(tv) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, tv(val)])) } };
  return { stringValue: String(v) };
}

function fv(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fv);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, fv(val)]));
  return null;
}

function fromDoc(doc) {
  if (!doc || !doc.fields) return {};
  return Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, fv(v)]));
}

// ── API Football ───────────────────────────────────────────────
function apiFootball(path) {
  return new Promise(resolve => {
    const r = https.request({
      hostname: 'v3.football.api-sports.io',
      path,
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d).response || []); } catch { resolve([]); } });
    });
    r.on('error', () => resolve([]));
    r.setTimeout(9000, () => { r.destroy(); resolve([]); });
    r.end();
  });
}

// ── Team matching ──────────────────────────────────────────────
const ABBR = {
  'bha': 'brighton', 'mci': 'manchester city', 'bur': 'burnley', 'liv': 'liverpool',
  'mun': 'manchester united', 'bou': 'bournemouth', 'bre': 'brentford', 'che': 'chelsea',
  'ars': 'arsenal', 'for': 'nottingham forest', 'tot': 'tottenham', 'new': 'newcastle',
  'eve': 'everton', 'whu': 'west ham', 'avl': 'aston villa', 'wol': 'wolves',
  'cry': 'crystal palace', 'sou': 'southampton', 'lei': 'leicester', 'ful': 'fulham',
  'nfo': 'nottingham forest', 'mcy': 'manchester city', 'forrest': 'nottingham forest',
};

function norm(s) {
  if (!s) return '';
  const lower = s.toLowerCase().trim();
  if (ABBR[lower]) return ABBR[lower];
  return lower.replace(/\bfc\b|\bac\b|\bsc\b|\bcf\b/g, '').replace(/\s+/g, ' ').trim();
}

function teamMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(' ').filter(w => w.length > 2);
  const wb = nb.split(' ').filter(w => w.length > 2);
  return wa.length > 0 && wb.length > 0 && wb.some(w => wa.includes(w));
}

// ── Check a single match ───────────────────────────────────────
async function checkMatch(home, away, fixtureId) {
  // Method 1: Direct fixture lookup by ID (most reliable)
  if (fixtureId) {
    const res = await apiFootball(`/fixtures?id=${fixtureId}`);
    if (res.length > 0) {
      const f = res[0];
      const s = f.fixture?.status?.short;
      const h = f.goals?.home ?? 0, a = f.goals?.away ?? 0;
      const elapsed = f.fixture?.status?.elapsed || 0;
      if (['FT','AET','PEN'].includes(s)) return { status: 'finished', homeScore: h, awayScore: a };
      if (['1H','HT','2H','ET','P','BT'].includes(s)) return { status: 'live', homeScore: h, awayScore: a, elapsed };
      if (['CANC','PST','ABD'].includes(s)) return { status: 'void' };
      return { status: 'scheduled', date: f.fixture?.date };
    }
  }

  // Method 2: Search by team name
  const today = new Date().toISOString().split('T')[0];
  const sixtyAgo = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];

  // Try searching for the home team
  const homeQuery = encodeURIComponent(home.slice(0, 20));
  console.log(`  [API] Searching team: "${home}" → /teams?search=${homeQuery}`);
  const teamRes = await apiFootball(`/teams?search=${homeQuery}`);
  console.log(`  [API] Found ${teamRes.length} teams for "${home}":`, teamRes.slice(0,3).map(t => t?.team?.name).join(', '));
  
  // Prefer exact match, avoid women's/U23/U21/reserve teams unless explicitly in query
  const isWomens = /\bw\b|women|female/i.test(home);
  const isYouth = /u\d{2}|youth|junior|reserve/i.test(home);
  
  let team = teamRes.find(t => {
    const n = t?.team?.name || '';
    // Exact match first
    return norm(n) === norm(home);
  });
  
  if (!team) {
    team = teamRes.find(t => {
      const n = t?.team?.name || '';
      // Skip women's unless searching for women's team
      if (!isWomens && /\bw\b|women|female/i.test(n)) return false;
      // Skip youth unless searching for youth
      if (!isYouth && /u\d{2}|youth|junior|reserve/i.test(n)) return false;
      return teamMatch(n, home);
    });
  }
  
  if (!team) team = teamRes.find(t => teamMatch(t?.team?.name, home));
  console.log(`  [API] Best match: ${team?.team?.name} (id:${team?.team?.id})`);
  
  if (!team?.team?.id) {
    // Try away team
    const awayRes = await apiFootball(`/teams?search=${encodeURIComponent(away.slice(0, 20))}`);
    const isAwayWomens = /\bw\b|women/i.test(away);
    let awayTeam = awayRes.find(t => norm(t?.team?.name) === norm(away));
    if (!awayTeam) awayTeam = awayRes.find(t => {
      const n = t?.team?.name || '';
      if (!isAwayWomens && /\bw\b|women/i.test(n)) return false;
      return teamMatch(n, away);
    });
    if (!awayTeam) awayTeam = awayRes.find(t => teamMatch(t?.team?.name, away));
    console.log(`  [API] Away team: ${awayTeam?.team?.name} (id:${awayTeam?.team?.id})`);
    if (!awayTeam?.team?.id) return { status: 'not_found' };
    
    for (const season of ['', 2026, 2025]) {
      const thirtyAhead2 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const seasonParam = season ? `&season=${season}` : '';
      const fixtures = await apiFootball(`/fixtures?team=${awayTeam.team.id}${seasonParam}&from=${sixtyAgo}&to=${thirtyAhead2}`);
      console.log(`  [API] Away team season ${season||'none'}: ${fixtures.length} fixtures`);
      for (const f of fixtures) {
        if (teamMatch(f.teams?.home?.name, home) && teamMatch(f.teams?.away?.name, away)) {
          const s = f.fixture?.status?.short;
          if (['FT','AET','PEN'].includes(s)) return { status: 'finished', homeScore: f.goals.home||0, awayScore: f.goals.away||0 };
          if (['1H','HT','2H','ET','P'].includes(s)) return { status: 'live', homeScore: f.goals.home||0, awayScore: f.goals.away||0, elapsed: f.fixture?.status?.elapsed||0 };
          if (['CANC','PST'].includes(s)) return { status: 'void' };
          return { status: 'scheduled', date: f.fixture?.date };
        }
      }
    }
    return { status: 'not_found' };
  }

  const thirtyAhead = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  
  // Search WITHOUT season filter - works for all competitions including internationals
  const fixtures = await apiFootball(`/fixtures?team=${team.team.id}&from=${sixtyAgo}&to=${thirtyAhead}`);
  console.log(`  [API] No-season search: ${fixtures.length} fixtures for team ${team.team.id}`);
  if (fixtures.length > 0) {
    console.log(`  [API] Sample:`, fixtures.slice(0,5).map(f => `${f.teams?.home?.name} vs ${f.teams?.away?.name} (${f.fixture?.status?.short})`).join(' | '));
  }
  
  for (const f of fixtures) {
    if (teamMatch(f.teams?.home?.name, home) && teamMatch(f.teams?.away?.name, away)) {
      console.log(`  [MATCH FOUND] ${f.teams?.home?.name} vs ${f.teams?.away?.name} status:${f.fixture?.status?.short}`);
      const s = f.fixture?.status?.short;
      if (['FT','AET','PEN'].includes(s)) return { status: 'finished', homeScore: f.goals.home||0, awayScore: f.goals.away||0 };
      if (['1H','HT','2H','ET','P'].includes(s)) return { status: 'live', homeScore: f.goals.home||0, awayScore: f.goals.away||0, elapsed: f.fixture?.status?.elapsed||0 };
      if (['CANC','PST'].includes(s)) return { status: 'void' };
      return { status: 'scheduled', date: f.fixture?.date };
    }
  }
  
  // If still not found, try with season
  for (const season of [2026, 2025, 2024]) {
    const sf = await apiFootball(`/fixtures?team=${team.team.id}&season=${season}&from=${sixtyAgo}&to=${thirtyAhead}`);
    console.log(`  [API] Season ${season}: ${sf.length} fixtures`);
    for (const f of sf) {
      if (teamMatch(f.teams?.home?.name, home) && teamMatch(f.teams?.away?.name, away)) {
        console.log(`  [MATCH FOUND season] ${f.teams?.home?.name} vs ${f.teams?.away?.name}`);
        const s = f.fixture?.status?.short;
        if (['FT','AET','PEN'].includes(s)) return { status: 'finished', homeScore: f.goals.home||0, awayScore: f.goals.away||0 };
        if (['1H','HT','2H','ET','P'].includes(s)) return { status: 'live', homeScore: f.goals.home||0, awayScore: f.goals.away||0, elapsed: f.fixture?.status?.elapsed||0 };
        if (['CANC','PST'].includes(s)) return { status: 'void' };
        return { status: 'scheduled', date: f.fixture?.date };
      }
    }
  }
  return { status: 'not_found' };
}

// ── Evaluate prediction ────────────────────────────────────────
function evaluate(pred, h, a) {
  const p = (pred || '').toLowerCase().trim();
  if (!p) return null;
  if (p === '1' || p === 'home' || p === 'home win') return h > a;
  if (p === 'x' || p === 'draw') return h === a;
  if (p === '2' || p === 'away' || p === 'away win') return a > h;
  if (p === '1x') return h >= a;
  if (p === 'x2') return a >= h;
  if (p === '12') return h !== a;
  if (p === 'gg' || p === 'btts') return h > 0 && a > 0;
  if (p === 'ng') return h === 0 || a === 0;
  const over = p.match(/over\s*([\d.]+)/);
  if (over) return (h + a) > parseFloat(over[1]);
  const under = p.match(/under\s*([\d.]+)/);
  if (under) return (h + a) < parseFloat(under[1]);
  return null;
}

// ── Main ───────────────────────────────────────────────────────
exports.handler = async function(event) {
  const qs = (event && event.queryStringParameters) || {};
  const hdrs = (event && event.headers) || {};
  const secret = qs.secret || hdrs['x-admin-secret'] || '';
  if (secret && secret !== 'arena-admin-2024') {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    console.log('🔄 Tip verification started:', new Date().toISOString());
    const token = await getToken();
    console.log('✅ Auth OK');

    let checked = 0, settled = 0;

    const channels = await fsList('channels', token);
    console.log('📡 Channels:', channels.length);

    for (const ch of channels) {
      const chId = ch.name.split('/').pop();
      const chData = fromDoc(ch);
      const chName = chData.name || chId;
      const tipsterId = chData.ownerId || '';

      const tips = await fsList(`channels/${chId}/tips`, token);
      const pending = tips.filter(t => fromDoc(t).status === 'pending');
      if (!pending.length) continue;

      console.log(`Channel "${chName}": ${pending.length} pending`);

      for (const tip of pending) {
        const tipId = tip.name.split('/').pop();
        const tipData = fromDoc(tip);
        const matches = tipData.matches || [];
        if (!matches.length) continue;

        checked++;
        let allSettled = true, anyLost = false;
        const updated = [];

        for (const match of matches) {
          const st = match.status || 'pending';
          if (['win','lost','void'].includes(st)) {
            if (st === 'lost') anyLost = true;
            updated.push(match);
            continue;
          }

          const home = match.home || '';
          const away = match.away || '';
          const pred = match.prediction || tipData.prediction || '';
          const fId = match.fixtureId || null;

          console.log(`  "${home}" vs "${away}" (fixtureId:${fId})`);
          const result = await checkMatch(home, away, fId);
          console.log(`  → ${result.status}`);

          if (result.status === 'not_found' || result.status === 'scheduled') {
            allSettled = false;
            updated.push(Object.assign({}, match, result.status === 'scheduled' ? { matchDate: result.date } : {}));
            continue;
          }
          if (result.status === 'live') {
            allSettled = false;
            updated.push(Object.assign({}, match, { isLive: true, currentHomeScore: result.homeScore, currentAwayScore: result.awayScore, elapsed: result.elapsed }));
            continue;
          }
          if (result.status === 'void') {
            updated.push(Object.assign({}, match, { status: 'void' }));
            continue;
          }
          if (result.status === 'finished') {
            const won = evaluate(pred, result.homeScore, result.awayScore);
            if (won === null) { allSettled = false; updated.push(match); continue; }
            const ns = won ? 'win' : 'lost';
            if (!won) anyLost = true;
            updated.push(Object.assign({}, match, { status: ns, homeScore: result.homeScore, awayScore: result.awayScore }));
            console.log(`  ✅ ${home} ${result.homeScore}-${result.awayScore} ${away} → ${ns}`);
          }
        }

        if (anyLost) allSettled = true;
        const tipStatus = allSettled ? (anyLost ? 'lost' : 'won') : 'pending';

        await fsPatch(`channels/${chId}/tips/${tipId}`, {
          matches: tv(updated),
          status: tv(tipStatus),
        }, token);

        if (tipStatus !== 'pending') {
          settled++;
          console.log(`📝 Tip ${tipId} → ${tipStatus}`);
          if (tipsterId) {
            await fsAdd('notifications', {
              userId: tv(tipsterId),
              type: tv('tip_result'),
              title: tv(tipStatus === 'won' ? '✅ Tip Won!' : '❌ Tip Lost'),
              message: tv(`Your tip in "${chName}" → ${tipStatus.toUpperCase()}`),
              read: tv(false),
              createdAt: { timestampValue: new Date().toISOString() },
            }, token);
          }
        }
      }
    }

    console.log(`✅ Done. Checked: ${checked}, Settled: ${settled}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, checked, settled }) };
  } catch(e) {
    console.error('❌ Error:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
