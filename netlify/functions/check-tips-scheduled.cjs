// netlify/functions/check-tips-scheduled.cjs
// Uses Firebase REST API - no firebase-admin needed

const https = require('https');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const FIREBASE_TOKEN = process.env.FIREBASE_TOKEN;

// ── Simple HTTPS request helper ────────────────────────────────────────────
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({}); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ── Firebase REST API helpers ──────────────────────────────────────────────
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function firestoreGet(path) {
  const url = `${FIRESTORE_BASE}/${path}?key=${FIREBASE_TOKEN}`;
  return httpsRequest(url);
}

async function firestoreQuery(collectionPath, field, value) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_TOKEN}`;
  const body = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: collectionPath.split('/').pop() }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: 'EQUAL',
          value: { stringValue: value }
        }
      }
    }
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    body
  };

  const url2 = new URL(url);
  return httpsRequest({ hostname: url2.hostname, path: url2.pathname + url2.search, method: 'POST', headers: options.headers }, options);
}

async function firestorePatch(path, fields) {
  const url = `${FIRESTORE_BASE}/${path}?key=${FIREBASE_TOKEN}`;
  const body = JSON.stringify({ fields });
  const urlParsed = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlParsed.hostname,
      path: urlParsed.pathname + urlParsed.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── API Football helper ────────────────────────────────────────────────────
function apiFootball(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'v3.football.api-sports.io',
      path: endpoint,
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(Array.isArray(parsed.response) ? parsed.response : []);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

// ── Team matching ──────────────────────────────────────────────────────────
function normalize(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\bfc\b|\bac\b|\bsc\b/g, '')
    .replace(/manchester/g, 'man')
    .replace(/united/g, 'utd')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function teamsMatch(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(' ').filter(w => w.length > 2);
  const wb = nb.split(' ').filter(w => w.length > 2);
  return wb.some(w => wa.includes(w));
}

// ── Check match result ─────────────────────────────────────────────────────
async function checkMatch(home, away) {
  if (!home || !away) return { status: 'not_found' };
  const today = new Date().toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  for (const season of [2026, 2025]) {
    const fixtures = await apiFootball(
      `/fixtures?team=${encodeURIComponent(home)}&season=${season}&from=${twoWeeksAgo}&to=${today}`
    );
    for (const f of fixtures) {
      if (teamsMatch(f?.teams?.home?.name, home) && teamsMatch(f?.teams?.away?.name, away)) {
        const s = f?.fixture?.status?.short;
        if (['FT', 'AET', 'PEN'].includes(s)) {
          return { status: 'finished', homeScore: f.goals.home ?? 0, awayScore: f.goals.away ?? 0 };
        }
        if (['CANC', 'PST', 'ABD'].includes(s)) return { status: 'void' };
        if (['1H', 'HT', '2H', 'ET'].includes(s)) return { status: 'live' };
        return { status: 'pending' };
      }
    }
  }
  return { status: 'not_found' };
}

// ── Evaluate prediction ────────────────────────────────────────────────────
function evaluate(pred, h, a) {
  const p = (pred || '').toLowerCase().trim();
  const t = h + a;
  if (p === '1' || p === 'home' || p === 'home win') return h > a;
  if (p === 'x' || p === 'draw') return h === a;
  if (p === '2' || p === 'away' || p === 'away win') return a > h;
  if (p === '1x') return h >= a;
  if (p === 'x2') return a >= h;
  if (p === '12') return h !== a;
  if (p === 'gg' || p === 'btts') return h > 0 && a > 0;
  if (p === 'ng' || p === 'no btts') return h === 0 || a === 0;
  if (p === 'home to score') return h > 0;
  if (p === 'away to score') return a > 0;
  const over = p.match(/^over\s*([\d.]+)/);
  if (over) return t > parseFloat(over[1]);
  const under = p.match(/^under\s*([\d.]+)/);
  if (under) return t < parseFloat(under[1]);
  const score = p.match(/^(\d+)[-:](\d+)$/);
  if (score) return h === parseInt(score[1]) && a === parseInt(score[2]);
  return null;
}

// ── Main handler ───────────────────────────────────────────────────────────
exports.handler = async function () {
  console.log('🔄 Starting tip verification:', new Date().toISOString());

  if (!PROJECT_ID || !API_FOOTBALL_KEY || !FIREBASE_TOKEN) {
    const missing = [];
    if (!PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
    if (!API_FOOTBALL_KEY) missing.push('API_FOOTBALL_KEY');
    if (!FIREBASE_TOKEN) missing.push('FIREBASE_TOKEN');
    console.error('❌ Missing env vars:', missing.join(', '));
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing: ' + missing.join(', ') }) };
  }

  let checked = 0, settled = 0;

  try {
    // Get all channels
    const channelsRes = await httpsRequest(`${FIRESTORE_BASE}/channels?key=${FIREBASE_TOKEN}`);
    const channels = channelsRes.documents || [];
    console.log(`Found ${channels.length} channels`);

    for (const channel of channels) {
      const channelId = channel.name.split('/').pop();
      const channelName = channel.fields?.name?.stringValue || '';
      const tipsterId = channel.fields?.ownerId?.stringValue || '';

      // Get pending tips
      const tipsRes = await httpsRequest(
        `${FIRESTORE_BASE}/channels/${channelId}/tips?key=${FIREBASE_TOKEN}`
      );
      const tips = (tipsRes.documents || []).filter(t =>
        t.fields?.status?.stringValue === 'pending'
      );

      if (!tips.length) continue;
      console.log(`Channel ${channelName}: ${tips.length} pending tips`);

      for (const tip of tips) {
        const tipId = tip.name.split('/').pop();
        const tipFields = tip.fields || {};

        // Get matches array from Firestore
        const matchesArray = tipFields.matches?.arrayValue?.values || [];
        if (!matchesArray.length) continue;

        checked++;
        let allSettled = true;
        let anyLost = false;
        const updatedMatches = [];

        for (const matchVal of matchesArray) {
          const match = matchVal.mapValue?.fields || {};
          const currentStatus = match.status?.stringValue || 'pending';

          // Already settled
          if (['win', 'lost', 'void'].includes(currentStatus)) {
            if (currentStatus === 'lost') anyLost = true;
            updatedMatches.push(matchVal);
            continue;
          }

          const home = match.home?.stringValue || '';
          const away = match.away?.stringValue || '';
          const prediction = match.prediction?.stringValue || tipFields.prediction?.stringValue || '';

          console.log(`Checking: ${home} vs ${away} | Prediction: ${prediction}`);

          const result = await checkMatch(home, away);
          console.log(`Result: ${result.status}`);

          if (result.status === 'pending' || result.status === 'not_found' || result.status === 'live') {
            allSettled = false;
            updatedMatches.push(matchVal);
            continue;
          }

          if (result.status === 'void') {
            updatedMatches.push({
              mapValue: { fields: { ...match, status: { stringValue: 'void' } } }
            });
            continue;
          }

          if (result.status === 'finished') {
            const won = evaluate(prediction, result.homeScore, result.awayScore);
            if (won === null) { allSettled = false; updatedMatches.push(matchVal); continue; }

            const newStatus = won ? 'win' : 'lost';
            if (!won) anyLost = true;

            updatedMatches.push({
              mapValue: {
                fields: {
                  ...match,
                  status: { stringValue: newStatus },
                  homeScore: { integerValue: result.homeScore },
                  awayScore: { integerValue: result.awayScore },
                }
              }
            });
            console.log(`✅ ${home} vs ${away}: ${result.homeScore}-${result.awayScore} → ${newStatus}`);
          }
        }

        // Accumulator: if any lost, whole tip lost
        if (anyLost) allSettled = true;

        const tipStatus = allSettled ? (anyLost ? 'lost' : 'won') : 'pending';

        // Update tip in Firestore
        const updateFields = {
          matches: { arrayValue: { values: updatedMatches } },
          status: { stringValue: tipStatus },
        };

        const tipPath = `channels/${channelId}/tips/${tipId}`;
        const updateUrl = `${FIRESTORE_BASE}/${tipPath}?updateMask.fieldPaths=matches&updateMask.fieldPaths=status&key=${FIREBASE_TOKEN}`;

        await new Promise((resolve, reject) => {
          const body = JSON.stringify({ fields: updateFields });
          const u = new URL(updateUrl);
          const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
          }, res => {
            res.on('data', () => {});
            res.on('end', resolve);
          });
          req.on('error', reject);
          req.write(body);
          req.end();
        });

        if (allSettled) {
          settled++;
          console.log(`📝 Tip ${tipId} settled as ${tipStatus}`);

          // Send notification to tipster
          if (tipsterId) {
            const notifBody = JSON.stringify({
              fields: {
                userId: { stringValue: tipsterId },
                type: { stringValue: 'tip_result' },
                title: { stringValue: tipStatus === 'won' ? '✅ Tip Won!' : '❌ Tip Lost' },
                message: { stringValue: `Your tip in ${channelName} settled as ${tipStatus.toUpperCase()}` },
                read: { booleanValue: false },
              }
            });
            const notifUrl = new URL(`${FIRESTORE_BASE}/notifications?key=${FIREBASE_TOKEN}`);
            await new Promise((resolve) => {
              const req = https.request({
                hostname: notifUrl.hostname,
                path: notifUrl.pathname + notifUrl.search,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(notifBody) }
              }, res => { res.on('data', () => {}); res.on('end', resolve); });
              req.on('error', () => resolve());
              req.write(notifBody);
              req.end();
            });
          }
        }
      }
    }

    console.log(`✅ Done. Checked: ${checked}, Settled: ${settled}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, checked, settled }) };

  } catch (e) {
    console.error('❌ Fatal error:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
