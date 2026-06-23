// netlify/functions/check-tips-scheduled.cjs
// Runs every 30 minutes - checks each match individually

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
    }),
  });
}

const db = admin.firestore();
const API_KEY = process.env.API_FOOTBALL_KEY || '71b6bd51ec2a77eee7d4a472b85436f0';
const API_BASE = 'https://v3.football.api-sports.io';

// ── API call ───────────────────────────────────────────────────────────────
async function apiCall(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'x-apisports-key': API_KEY },
    });
    const data = await res.json();
    return data.response || [];
  } catch (e) {
    console.error('API error:', e.message);
    return [];
  }
}

// ── Smart team name matching ───────────────────────────────────────────────
function normalize(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\bfc\b|\bac\b|\bsc\b|\bbc\b|\bfk\b|\bsk\b/g, '')
    .replace(/manchester/g, 'man')
    .replace(/united/g, 'utd')
    .replace(/\bsrl\b|\breserve\b|\bu21\b|\bu23\b/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamsMatch(apiTeam, ocrTeam) {
  const api = normalize(apiTeam);
  const ocr = normalize(ocrTeam);
  if (!api || !ocr) return false;
  if (api === ocr) return true;
  if (api.includes(ocr) || ocr.includes(api)) return true;
  // Word-by-word match
  const apiWords = api.split(' ').filter(w => w.length > 2);
  const ocrWords = ocr.split(' ').filter(w => w.length > 2);
  const matches = ocrWords.filter(w => apiWords.includes(w));
  return matches.length >= Math.min(1, ocrWords.length);
}

// ── Find fixture result for a single match ─────────────────────────────────
async function checkSingleMatch(homeTeam, awayTeam) {
  const today = new Date().toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  // Try multiple seasons
  for (const season of [2026, 2025, 2024]) {
    // Search by home team name
    const fixtures = await apiCall(
      `/fixtures?team=${encodeURIComponent(homeTeam)}&season=${season}&from=${twoWeeksAgo}&to=${today}`
    );

    for (const f of fixtures) {
      const homeMatch = teamsMatch(f.teams.home.name, homeTeam);
      const awayMatch = teamsMatch(f.teams.away.name, awayTeam);

      if (homeMatch && awayMatch) {
        const status = f.fixture.status.short;

        // Cancelled or postponed = void
        if (['CANC', 'PST', 'ABD', 'AWD', 'WO'].includes(status)) {
          return { status: 'void', homeScore: 0, awayScore: 0 };
        }

        // Not started or live = still pending
        if (['NS', 'TBD', '1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(status)) {
          return { status: 'pending' };
        }

        // Finished
        if (['FT', 'AET', 'PEN'].includes(status)) {
          return {
            status: 'finished',
            homeScore: f.goals.home ?? 0,
            awayScore: f.goals.away ?? 0,
            fixtureId: f.fixture.id,
          };
        }
      }
    }
  }

  // Not found in API - could be lower league not covered
  // Check if match date has passed significantly (more than 3 days)
  return { status: 'not_found' };
}

// ── Evaluate single match prediction ──────────────────────────────────────
function evaluatePrediction(pred, homeScore, awayScore) {
  const p = (pred || '').toLowerCase().trim();
  const total = homeScore + awayScore;

  if (p === '1' || p === 'home win' || p === 'home') return homeScore > awayScore;
  if (p === 'x' || p === 'draw') return homeScore === awayScore;
  if (p === '2' || p === 'away win' || p === 'away') return awayScore > homeScore;
  if (p === '1x') return homeScore >= awayScore;
  if (p === 'x2') return awayScore >= homeScore;
  if (p === '12') return homeScore !== awayScore;
  if (p === 'gg' || p === 'btts' || p === 'both teams to score') return homeScore > 0 && awayScore > 0;
  if (p === 'ng' || p === 'btts no' || p === 'no btts') return homeScore === 0 || awayScore === 0;
  if (p === 'home to score' || p === 'home team to score') return homeScore > 0;
  if (p === 'away to score' || p === 'away team to score') return awayScore > 0;
  if (p.includes('clean sheet')) {
    if (p.includes('home')) return awayScore === 0;
    if (p.includes('away')) return homeScore === 0;
  }

  const overMatch = p.match(/^over\s*([\d.]+)/);
  if (overMatch) return total > parseFloat(overMatch[1]);

  const underMatch = p.match(/^under\s*([\d.]+)/);
  if (underMatch) return total < parseFloat(underMatch[1]);

  const scoreMatch = p.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (scoreMatch) return homeScore === parseInt(scoreMatch[1]) && awayScore === parseInt(scoreMatch[2]);

  // Unknown market
  return null;
}

// ── Main handler ───────────────────────────────────────────────────────────
exports.handler = async function () {
  console.log('🔄 Tip verification started:', new Date().toISOString());

  let checked = 0;
  let settled = 0;

  try {
    const channelsSnap = await db.collection('channels').get();

    for (const channelDoc of channelsSnap.docs) {
      const channelId = channelDoc.id;
      const channelData = channelDoc.data();
      const tipsterId = channelData.ownerId;

      // Get all pending tips
      const tipsSnap = await db
        .collection('channels').doc(channelId)
        .collection('tips').where('status', '==', 'pending')
        .get();

      for (const tipDoc of tipsSnap.docs) {
        const tip = tipDoc.data();
        if (!tip.matches || tip.matches.length === 0) continue;
        checked++;

        const updatedMatches = [...tip.matches];
        let allSettled = true;
        let anyLost = false;
        let allWon = true;

        // Check EACH match individually
        for (let i = 0; i < updatedMatches.length; i++) {
          const match = updatedMatches[i];

          // Skip already settled matches
          if (match.status === 'win' || match.status === 'lost' || match.status === 'void') {
            if (match.status === 'lost') { anyLost = true; allWon = false; }
            continue;
          }

          const result = await checkSingleMatch(match.home, match.away);

          if (result.status === 'pending' || result.status === 'not_found') {
            // This match is still pending
            allSettled = false;
            allWon = false;
            continue;
          }

          if (result.status === 'void') {
            updatedMatches[i] = { ...match, status: 'void' };
            continue;
          }

          if (result.status === 'finished') {
            const prediction = match.prediction || tip.prediction || '';
            const won = evaluatePrediction(prediction, result.homeScore, result.awayScore);

            if (won === null) {
              // Unknown market - leave pending
              allSettled = false;
              continue;
            }

            // Update this specific match status
            updatedMatches[i] = {
              ...match,
              status: won ? 'win' : 'lost',
              homeScore: result.homeScore,
              awayScore: result.awayScore,
            };

            if (!won) { anyLost = true; allWon = false; }
          }
        }

        // Update matches in Firestore (even partial updates)
        const matchesChanged = JSON.stringify(updatedMatches) !== JSON.stringify(tip.matches);

        if (matchesChanged) {
          // Determine overall tip status
          let tipStatus = 'pending';

          if (allSettled) {
            tipStatus = anyLost ? 'lost' : 'won';
          } else if (anyLost) {
            // If any match lost in an accumulator, whole tip is lost
            tipStatus = 'lost';
            allSettled = true;
          }

          await db.collection('channels').doc(channelId)
            .collection('tips').doc(tipDoc.id)
            .update({
              matches: updatedMatches,
              status: tipStatus,
              ...(allSettled ? { settledAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
            });

          if (allSettled) {
            settled++;

            // Update tipster win rate
            const allTipsSnap = await db
              .collection('channels').doc(channelId)
              .collection('tips').get();

            const allTips = allTipsSnap.docs.map(d => d.data());
            const wonCount = allTips.filter(t => t.status === 'won').length;
            const lostCount = allTips.filter(t => t.status === 'lost').length;
            const totalSettled = wonCount + lostCount;

            if (totalSettled > 0 && tipsterId) {
              await db.collection('users').doc(tipsterId).update({
                winRate: Math.round((wonCount / totalSettled) * 100),
                tipsCount: allTips.length,
                paidChannelEligible: allTips.length >= 5,
              });
            }

            // Notify tipster
            if (tipsterId) {
              await db.collection('notifications').add({
                userId: tipsterId,
                type: 'tip_result',
                title: tipStatus === 'won' ? '✅ Tip Won!' : '❌ Tip Lost',
                message: `Your tip in ${channelData.name || 'your channel'} has been settled as ${tipStatus.toUpperCase()}`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            // Notify subscribers
            const membersSnap = await db
              .collection('channels').doc(channelId)
              .collection('members').get();

            for (const memberDoc of membersSnap.docs) {
              if (memberDoc.id === tipsterId) continue;
              await db.collection('notifications').add({
                userId: memberDoc.id,
                type: 'tip_result',
                title: tipStatus === 'won' ? '✅ Tip Won!' : '❌ Tip Lost',
                message: `A tip in ${channelData.name || 'a channel'} has been settled`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }
    }

    console.log(`✅ Done. Checked: ${checked}, Settled: ${settled}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, checked, settled }),
    };

  } catch (e) {
    console.error('Fatal error:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
