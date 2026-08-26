'use strict';

const https = require('https');

// Use Firebase REST API with Web API Key instead of Admin SDK
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'sport-x-af95c';
const WEB_API_KEY = process.env.FIREBASE_TOKEN || 'AIzaSyDaegUsnDK9H1D0_r5Hnf-IAaCUqBT-BU4';
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// Sign in with email/password to get auth token
async function getAuthToken() {
  const email = process.env.VERIFY_EMAIL || 'tipverify@arena.app';
  const password = process.env.VERIFY_PASSWORD || 'ArenaVerify2026!';
  
  const res = await request({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email, password, returnSecureToken: true });
  
  if (res.data.idToken) return res.data.idToken;
  throw new Error('Failed to get auth token: ' + JSON.stringify(res.data));
}

// Firestore REST
const FS_BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fsGet(path, token) {
  const res = await request({
    hostname: 'firestore.googleapis.com',
    path: `${FS_BASE}/${path}`,
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function fsList(path, token) {
  const res = await request({
    hostname: 'firestore.googleapis.com',
    path: `${FS_BASE}/${path}?pageSize=300`,
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function fsUpdate(path, fields, token) {
  const fieldMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const res = await request({
    hostname: 'firestore.googleapis.com',
    path: `${FS_BASE}/${path}?${fieldMask}`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, { fields });
  return res.data;
}

async function fsAdd(path, fields, token) {
  const res = await request({
    hostname: 'firestore.googleapis.com',
    path: `${FS_BASE}/${path}`,
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }, { fields });
  return res.data;
}

function apiFootball(endpoint) {
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'v3.football.api-sports.io',
      path: endpoint,
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data).response || []); } catch { resolve([]); } });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

// Premier League abbreviations
const TEAM_ABBR = {
  'bha': 'brighton', 'mci': 'manchester city', 'bur': 'burnley',
  'liv': 'liverpool', 'mun': 'manchester united', 'bou': 'bournemouth',
  'bre': 'brentford', 'che': 'chelsea', 'ars': 'arsenal',
  'for': 'nottingham forest', 'tot': 'tottenham', 'new': 'newcastle',
  'eve': 'everton', 'whu': 'west ham', 'avl': 'aston villa',
  'wol': 'wolverhampton', 'cry': 'crystal palace', 'sou': 'southampton',
  'lei': 'leicester', 'lut': 'luton', 'ful': 'fulham', 'shf': 'sheffield',
  'nfo': 'nottingham forest', 'mcy': 'manchester city',
};

function normalize(name) {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  // Check abbreviation map first
  if (TEAM_ABBR[lower]) return TEAM_ABBR[lower];
  // Remove SRL suffix (simulated matches)
  return lower
    .replace(/\bsrl\b/g, '')
    .replace(/\bfc\b|\bac\b|\bsc\b|\bcf\b/g, '')
    .replace(/manchester/g, 'man').replace(/united/g, 'utd')
    .replace(/nottingham forest/g, 'forest')
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function teamsMatch(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(' ').filter(w => w.length > 2);
  const wb = nb.split(' ').filter(w => w.length > 2);
  return wb.some(w => wa.includes(w));
}

const teamCache = {};
async function findTeamId(name) {
  if (!name) return null;
  const key = normalize(name);
  if (teamCache[key] !== undefined) return teamCache[key];
  const results = await apiFootball('/teams?search=' + encodeURIComponent(name));
  const best = results.find(r => r && r.team && teamsMatch(r.team.name, name)) || results[0];
  teamCache[key] = (best && best.team) ? best.team.id : null;
  return teamCache[key];
}

async function checkMatch(home, away) {
  if (!home || !away) return { status: 'not_found' };
  if (home.toLowerCase().includes('srl') || away.toLowerCase().includes('srl')) {
    return { status: 'void' };
  }
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
  const teamId = await findTeamId(home) || await findTeamId(away);
  if (!teamId) return { status: 'not_found' };
  for (const season of [2027, 2026, 2025]) {
    const fixtures = await apiFootball('/fixtures?team=' + teamId + '&season=' + season + '&from=' + monthAgo + '&to=' + today);
    for (const f of fixtures) {
      if (!f || !f.teams) continue;
      const fh = f.teams.home && f.teams.home.name;
      const fa = f.teams.away && f.teams.away.name;
      if (teamsMatch(fh, home) && teamsMatch(fa, away)) {
        const s = f.fixture && f.fixture.status && f.fixture.status.short;
        if (['FT','AET','PEN'].includes(s)) return { status: 'finished', homeScore: f.goals.home || 0, awayScore: f.goals.away || 0 };
        if (['CANC','PST','ABD'].includes(s)) return { status: 'void' };
        if (['1H','HT','2H','ET','P'].includes(s)) return { status: 'live' };
        return { status: 'scheduled' };
      }
    }
  }
  return { status: 'not_found' };
}

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
  const over = p.match(/^over\s*([\d.]+)/);
  if (over) return (h + a) > parseFloat(over[1]);
  const under = p.match(/^under\s*([\d.]+)/);
  if (under) return (h + a) < parseFloat(under[1]);
  return null;
}

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, toValue(val)])) } };
  return { stringValue: String(v) };
}

function fromValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, fromValue(val)]));
  return null;
}

function fromDoc(doc) {
  if (!doc || !doc.fields) return {};
  return Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, fromValue(v)]));
}

exports.handler = async function(event) {
  try {
    console.log('🔄 Getting auth token...');
    const token = await getAuthToken();
    console.log('✅ Got token');

    let checked = 0, settled = 0;

    const channelsRes = await fsList('channels', token);
    const channels = channelsRes.documents || [];
    console.log('📡 Channels found:', channels.length);

    for (const channelDoc of channels) {
      const channelId = channelDoc.name.split('/').pop();
      const channelData = fromDoc(channelDoc);
      const channelName = channelData.name || channelId;
      const tipsterId = channelData.ownerId || '';

      const tipsRes = await fsList(`channels/${channelId}/tips`, token);
      const pendingTips = (tipsRes.documents || []).filter(t => fromDoc(t).status === 'pending');

      if (!pendingTips.length) continue;
      console.log('Channel "' + channelName + '": ' + pendingTips.length + ' pending tips');

      for (const tipDoc of pendingTips) {
        const tipId = tipDoc.name.split('/').pop();
        const tipData = fromDoc(tipDoc);
        const matches = tipData.matches || [];
        if (!matches.length) continue;

        checked++;
        let allSettled = true;
        let anyLost = false;
        const updatedMatches = [];

        for (const match of matches) {
          const currentStatus = match.status || 'pending';
          if (['win','lost','void'].includes(currentStatus)) {
            if (currentStatus === 'lost') anyLost = true;
            updatedMatches.push(match);
            continue;
          }

          const home = match.home || '';
          const away = match.away || '';
          const pred = match.prediction || tipData.prediction || '';

          console.log('Checking: "' + home + '" vs "' + away + '"');
          const result = await checkMatch(home, away);
          console.log('Result:', result.status);

          if (['pending','not_found','live','scheduled'].includes(result.status)) {
            allSettled = false;
            updatedMatches.push(match);
            continue;
          }

          if (result.status === 'void') {
            updatedMatches.push(Object.assign({}, match, { status: 'void' }));
            continue;
          }

          if (result.status === 'finished') {
            const won = evaluate(pred, result.homeScore, result.awayScore);
            if (won === null) { allSettled = false; updatedMatches.push(match); continue; }
            const newStatus = won ? 'win' : 'lost';
            if (!won) anyLost = true;
            updatedMatches.push(Object.assign({}, match, {
              status: newStatus,
              homeScore: result.homeScore,
              awayScore: result.awayScore,
            }));
            console.log('✅ ' + home + ' ' + result.homeScore + '-' + result.awayScore + ' ' + away + ' → ' + newStatus);
          }
        }

        if (anyLost) allSettled = true;
        const tipStatus = allSettled ? (anyLost ? 'lost' : 'won') : 'pending';

        await fsUpdate(`channels/${channelId}/tips/${tipId}`, {
          matches: toValue(updatedMatches),
          status: toValue(tipStatus),
        }, token);

        if (tipStatus !== 'pending') {
          settled++;
          if (tipsterId) {
            await fsAdd('notifications', {
              userId: toValue(tipsterId),
              type: toValue('tip_result'),
              title: toValue(tipStatus === 'won' ? '✅ Tip Won!' : '❌ Tip Lost'),
              message: toValue('Your tip in "' + channelName + '" → ' + tipStatus.toUpperCase()),
              read: toValue(false),
              createdAt: { timestampValue: new Date().toISOString() },
            }, token);
          }
        }
      }
    }

    console.log('✅ Done. Checked:', checked, 'Settled:', settled);
    return { statusCode: 200, body: JSON.stringify({ success: true, checked, settled }) };

  } catch(e) {
    console.error('❌ Error:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
