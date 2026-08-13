// netlify/functions/trigger-tip-check.cjs
/* eslint-disable */

exports.handler = async function(event) {
  console.log('🔥 TRIGGER TIP CHECK VERSION 2');
  const params = event ? (event.queryStringParameters || {}) : {};
  const headers = event ? (event.headers || {}) : {};
  const secret = params.secret || headers['x-admin-secret'] || '';
  
  if (secret !== 'arena-admin-2024') {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // Lazy require inside handler to avoid esbuild issues
  const admin = require('firebase-admin');
  const https = require('https');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }

  const db = admin.firestore();

  function apiFootball(endpoint) {
    return new Promise(resolve => {
      const req = https.request({
        hostname: 'v3.football.api-sports.io',
        path: endpoint,
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY }
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

  function normalize(name) {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/\bfc\b|\bac\b|\bsc\b|\bcf\b/g, '')
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
    const best = results.find(r => teamsMatch(r && r.team && r.team.name, name)) || results[0];
    teamCache[key] = (best && best.team && best.team.id) ? best.team.id : null;
    return teamCache[key];
  }

  async function checkMatch(home, away) {
    if (!home || !away) return { status: 'not_found' };
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const teamId = await findTeamId(home) || await findTeamId(away);
    if (!teamId) return { status: 'not_found' };
    for (const season of [2026, 2025, 2024]) {
      const fixtures = await apiFootball(`/fixtures?team=${teamId}&season=${season}&from=${monthAgo}&to=${today}`);
      for (const f of fixtures) {
        const fHome = f && f.teams && f.teams.home && f.teams.home.name;
        const fAway = f && f.teams && f.teams.away && f.teams.away.name;
        if (teamsMatch(fHome, home) && teamsMatch(fAway, away)) {
          const s = f.fixture && f.fixture.status && f.fixture.status.short;
          if (['FT', 'AET', 'PEN'].includes(s)) {
            return { status: 'finished', homeScore: f.goals.home || 0, awayScore: f.goals.away || 0 };
          }
          if (['CANC', 'PST', 'ABD'].includes(s)) return { status: 'void' };
          if (['1H', 'HT', '2H', 'ET', 'P'].includes(s)) return { status: 'live' };
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

  try {
    console.log('🔄 Tip verification started:', new Date().toISOString());
    let checked = 0, settled = 0;

    const channelsSnap = await db.collection('channels').get();
    console.log('📡 Found channels:', channelsSnap.size);

    for (const channelDoc of channelsSnap.docs) {
      const channelData = channelDoc.data();
      const channelName = channelData.name || channelDoc.id;
      const tipsterId = channelData.ownerId || '';

      const tipsSnap = await db.collection('channels')
        .doc(channelDoc.id)
        .collection('tips')
        .where('status', '==', 'pending')
        .get();

      if (tipsSnap.empty) continue;
      console.log(`Channel "${channelName}": ${tipsSnap.size} pending tips`);

      for (const tipDoc of tipsSnap.docs) {
        const tipData = tipDoc.data();
        const matches = tipData.matches || [];
        if (!matches.length) continue;

        checked++;
        let allSettled = true;
        let anyLost = false;
        const updatedMatches = [];

        for (const match of matches) {
          const currentStatus = match.status || 'pending';
          if (['win', 'lost', 'void'].includes(currentStatus)) {
            if (currentStatus === 'lost') anyLost = true;
            updatedMatches.push(match);
            continue;
          }

          const home = match.home || '';
          const away = match.away || '';
          const pred = match.prediction || tipData.prediction || '';

          console.log(`  Checking: "${home}" vs "${away}"`);
          const result = await checkMatch(home, away);
          console.log(`  Result: ${result.status}`);

          if (['pending', 'not_found', 'live', 'scheduled'].includes(result.status)) {
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
            console.log(`  ✅ ${home} ${result.homeScore}-${result.awayScore} ${away} → ${newStatus}`);
          }
        }

        if (anyLost) allSettled = true;
        const tipStatus = allSettled ? (anyLost ? 'lost' : 'won') : 'pending';
        await tipDoc.ref.update({ matches: updatedMatches, status: tipStatus });

        if (tipStatus !== 'pending') {
          settled++;
          if (tipsterId) {
            await db.collection('notifications').add({
              userId: tipsterId,
              type: 'tip_result',
              title: tipStatus === 'won' ? '✅ Tip Won!' : '❌ Tip Lost',
              message: `Your tip in "${channelName}" → ${tipStatus.toUpperCase()}`,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }
    }

    console.log(`✅ Done. Checked: ${checked}, Settled: ${settled}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, checked, settled }) };

  } catch(e) {
    console.error('❌ Error:', e.message, e.stack);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
