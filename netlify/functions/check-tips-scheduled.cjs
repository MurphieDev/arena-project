// netlify/functions/check-tips-scheduled.cjs
// Uses Firebase Admin SDK for reliable Firestore access

const https = require('https');

// ── Environment vars ───────────────────────────────────────────
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

// ── JWT for Firebase Admin ─────────────────────────────────────
const crypto = require('crypto');

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  
  // Build JWT header and payload
  const headerObj = { alg: 'RS256', typ: 'JWT' };
  const payloadObj = {
    iss: CLIENT_EMAIL,
    sub: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const header = Buffer.from(JSON.stringify(headerObj)).toString('base64url');
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const signingInput = `${header}.${payload}`;
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  sign.end();
  const signature = sign.sign(PRIVATE_KEY).toString('base64url');
  
  const jwt = `${signingInput}.${signature}`;
  
  console.log('JWT client_email:', CLIENT_EMAIL);
  console.log('Private key starts with:', PRIVATE_KEY.slice(0, 30));

  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('Token response:', JSON.stringify(parsed).slice(0, 200));
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error('No access token: ' + data));
          }
        } catch (e) { reject(new Error('Token parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Firestore REST helpers ─────────────────────────────────────


function httpsReq(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'firestore.googleapis.com',
      path,
      method: method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({}); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const FS_BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fsGet(path, token) {
  return httpsReq('GET', `${FS_BASE}/${path}`, token);
}

async function fsList(path, token) {
  return httpsReq('GET', `${FS_BASE}/${path}?pageSize=300`, token);
}

async function fsPatch(path, fields, token) {
  const fieldMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  return httpsReq('PATCH', `${FS_BASE}/${path}?${fieldMask}`, token, { fields });
}

async function fsCreate(path, fields, token) {
  return httpsReq('POST', `${FS_BASE}/${path}`, token, { fields });
}

// ── API Football ───────────────────────────────────────────────
function apiFootball(endpoint) {
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'v3.football.api-sports.io',
      path: endpoint,
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).response || []); }
        catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

// ── Team name matching ─────────────────────────────────────────
function normalize(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\bfc\b|\bac\b|\bsc\b|\bcf\b|\baf\b/g, '')
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

const teamCache = {};
async function findTeamId(name) {
  if (!name) return null;
  const key = normalize(name);
  if (teamCache[key] !== undefined) return teamCache[key];
  const results = await apiFootball(`/teams?search=${encodeURIComponent(name)}`);
  const best = results.find(r => teamsMatch(r?.team?.name, name)) || results[0];
  teamCache[key] = best?.team?.id || null;
  return teamCache[key];
}

async function checkMatch(home, away) {
  if (!home || !away) return { status: 'not_found' };

  // Look back 30 days for old tips
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const teamId = await findTeamId(home) || await findTeamId(away);
  if (!teamId) return { status: 'not_found' };

  for (const season of [2026, 2025, 2024]) {
    const fixtures = await apiFootball(
      `/fixtures?team=${teamId}&season=${season}&from=${monthAgo}&to=${today}`
    );
    for (const f of fixtures) {
      if (teamsMatch(f?.teams?.home?.name, home) && teamsMatch(f?.teams?.away?.name, away)) {
        const s = f?.fixture?.status?.short;
        if (['FT', 'AET', 'PEN'].includes(s)) {
          return { status: 'finished', homeScore: f.goals.home ?? 0, awayScore: f.goals.away ?? 0 };
        }
        if (['CANC', 'PST', 'ABD'].includes(s)) return { status: 'void' };
        if (['1H', 'HT', '2H', 'ET', 'P', 'BT'].includes(s)) return { status: 'live' };
        return { status: 'scheduled' };
      }
    }
  }
  return { status: 'not_found' };
}

// ── Evaluate prediction ────────────────────────────────────────
function evaluate(pred, h, a) {
  const p = (pred || '').toLowerCase().trim();
  if (!p) return null;
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

// ── Main handler ───────────────────────────────────────────────
exports.handler = async function () {
  console.log('🔄 Tip verification started:', new Date().toISOString());

  if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY || !API_FOOTBALL_KEY) {
    const missing = [
      !PROJECT_ID && 'FIREBASE_PROJECT_ID',
      !CLIENT_EMAIL && 'FIREBASE_CLIENT_EMAIL',
      !PRIVATE_KEY && 'FIREBASE_PRIVATE_KEY',
      !API_FOOTBALL_KEY && 'API_FOOTBALL_KEY',
    ].filter(Boolean);
    console.error('❌ Missing env vars:', missing.join(', '));
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing: ' + missing.join(', ') }) };
  }

  let checked = 0, settled = 0;

  try {
    // Get Firebase access token
    const token = await getAccessToken();
    console.log('✅ Got Firebase access token');

    // List all channels
    const channelsPath = `${FS_BASE}/channels?pageSize=300`;
    console.log('Fetching channels from:', channelsPath);

    const channelsRes = await httpsReq('GET', `/v1/projects/${PROJECT_ID}/databases/(default)/documents/channels?pageSize=300`, token);
    console.log('Channels response keys:', Object.keys(channelsRes));
    console.log('Full response sample:', JSON.stringify(channelsRes).slice(0, 500));

    const channels = channelsRes.documents || [];
    console.log(`📡 Found ${channels.length} channels`);

    if (channels.length === 0) {
      // Log what we got back to debug
      console.log('Response was:', JSON.stringify(channelsRes).slice(0, 300));
      return { statusCode: 200, body: JSON.stringify({ 
        success: false, checked: 0, settled: 0, 
        note: 'No channels found',
        debug: JSON.stringify(channelsRes).slice(0, 300),
        projectId: PROJECT_ID
      })};
    }

    for (const channel of channels) {
      const channelId = channel.name.split('/').pop();
      const channelName = channel.fields?.name?.stringValue || channelId;
      const tipsterId = channel.fields?.ownerId?.stringValue || '';

      // List all tips in this channel
      const tipsRes = await fsList(`channels/${channelId}/tips`, token);
      const pendingTips = (tipsRes.documents || []).filter(t =>
        t.fields?.status?.stringValue === 'pending'
      );

      if (!pendingTips.length) continue;
      console.log(`Channel "${channelName}": ${pendingTips.length} pending tips`);

      for (const tip of pendingTips) {
        const tipId = tip.name.split('/').pop();
        const fields = tip.fields || {};
        const matchesArr = fields.matches?.arrayValue?.values || [];
        if (!matchesArr.length) {
          console.log(`Tip ${tipId}: no matches, skipping`);
          continue;
        }

        checked++;
        let allSettled = true;
        let anyLost = false;
        const updatedMatches = [];

        for (const mv of matchesArr) {
          const mf = mv.mapValue?.fields || {};
          const currentStatus = mf.status?.stringValue || 'pending';

          if (['win', 'lost', 'void'].includes(currentStatus)) {
            if (currentStatus === 'lost') anyLost = true;
            updatedMatches.push(mv);
            continue;
          }

          const home = mf.home?.stringValue || '';
          const away = mf.away?.stringValue || '';
          const pred = mf.prediction?.stringValue || fields.prediction?.stringValue || '';

          console.log(`  Checking: "${home}" vs "${away}" | pred: "${pred}"`);
          const result = await checkMatch(home, away);
          console.log(`  Result: ${result.status}`);

          if (['pending', 'not_found', 'live', 'scheduled'].includes(result.status)) {
            allSettled = false;
            updatedMatches.push(mv);
            continue;
          }

          if (result.status === 'void') {
            updatedMatches.push({ mapValue: { fields: { ...mf, status: { stringValue: 'void' } } } });
            continue;
          }

          if (result.status === 'finished') {
            const won = evaluate(pred, result.homeScore, result.awayScore);
            if (won === null) {
              // Can't evaluate - mark won if goals scored (default)
              console.log(`  Can't evaluate "${pred}" - defaulting to pending`);
              allSettled = false;
              updatedMatches.push(mv);
              continue;
            }
            const newStatus = won ? 'win' : 'lost';
            if (!won) anyLost = true;
            updatedMatches.push({
              mapValue: {
                fields: {
                  ...mf,
                  status: { stringValue: newStatus },
                  homeScore: { integerValue: String(result.homeScore) },
                  awayScore: { integerValue: String(result.awayScore) },
                }
              }
            });
            console.log(`  ✅ ${home} vs ${away}: ${result.homeScore}-${result.awayScore} → ${newStatus}`);
          }
        }

        if (anyLost) allSettled = true;
        const tipStatus = allSettled ? (anyLost ? 'lost' : 'won') : 'pending';

        // Update tip
        await fsPatch(`channels/${channelId}/tips/${tipId}`, {
          matches: { arrayValue: { values: updatedMatches } },
          status: { stringValue: tipStatus },
        }, token);

        if (allSettled && tipStatus !== 'pending') {
          settled++;
          console.log(`📝 Tip ${tipId} → ${tipStatus}`);

          // Update tipster win rate
          if (tipsterId) {
            const userRes = await fsGet(`users/${tipsterId}`, token);
            const uf = userRes.fields || {};
            const totalTips = parseInt(uf.tipsCount?.integerValue || '0') || 0;
            const wonTips = parseInt(uf.wonTips?.integerValue || '0') || 0;
            const newWon = tipStatus === 'won' ? wonTips + 1 : wonTips;
            const newTotal = totalTips > 0 ? totalTips : 1;
            const winRate = Math.round((newWon / newTotal) * 100);

            await fsPatch(`users/${tipsterId}`, {
              winRate: { integerValue: String(winRate) },
              wonTips: { integerValue: String(newWon) },
              ...(tipStatus === 'won' ? {} : {}),
            }, token);

            // Notify tipster
            await fsCreate('notifications', {
              userId: { stringValue: tipsterId },
              type: { stringValue: 'tip_result' },
              title: { stringValue: tipStatus === 'won' ? '✅ Tip Won!' : '❌ Tip Lost' },
              message: { stringValue: `Your tip in ${channelName} has been verified as ${tipStatus.toUpperCase()}` },
              read: { booleanValue: false },
              createdAt: { timestampValue: new Date().toISOString() },
            }, token);
          }
        }
      }
    }

    console.log(`✅ Done. Checked: ${checked}, Settled: ${settled}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, checked, settled }) };

  } catch (e) {
    console.error('❌ Fatal error:', e.message, e.stack);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
