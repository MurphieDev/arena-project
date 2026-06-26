const admin = require('firebase-admin');

// ── Firebase Init ──────────────────────────────────────────────────────────
if (!admin.apps.length) {
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = admin.firestore();

// API key from env only - no hardcoded fallback
const API_KEY = process.env.API_FOOTBALL_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

// ── Safe helpers ───────────────────────────────────────────────────────────
function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

function safeString(val) {
  return typeof val === 'string' ? val : '';
}

// ── API call ───────────────────────────────────────────────────────────────
async function apiCall(endpoint) {
  try {
    if (!API_KEY) {
      console.error('❌ API_FOOTBALL_KEY env var is missing');
      return [];
    }
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'x-apisports-key': API_KEY },
    });
    const data = await res.json();
    // Safe check before returning
    return Array.isArray(data.response) ? data.response : [];
  } catch (e) {
    console.error('API call failed:', endpoint, e.message);
    return [];
  }
}

// ── Team name normalizer ───────────────────────────────────────────────────
function normalize(name) {
  if (!name || typeof name !== 'string') return '';
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
  const apiWords = api.split(' ').filter(w => w.length > 2);
  const ocrWords = ocr.split(' ').filter(w => w.length > 2);
  return ocrWords.some(w => apiWords.includes(w));
}

// ── Check single match against API ────────────────────────────────────────
async function checkSingleMatch(homeTeam, awayTeam) {
  // Defensive checks
  if (!homeTeam || !awayTeam) {
    console.log('Skipping match - missing team names');
    return { status: 'not_found' };
  }

  const today = new Date().toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  for (const season of [2026, 2025, 2024]) {
    try {
      const fixtures = await apiCall(
        `/fixtures?team=${encodeURIComponent(homeTeam)}&season=${season}&from=${twoWeeksAgo}&to=${today}`
      );

      // Safe iteration
      for (const f of safeArray(fixtures)) {
        // Defensive access of nested properties
        const homeTeamName = f?.teams?.home?.name || '';
        const awayTeamName = f?.teams?.away?.name || '';
        const status = f?.fixture?.status?.short || '';
        const homeGoals = f?.goals?.home;
        const awayGoals = f?.goals?.away;

        if (teamsMatch(homeTeamName, homeTeam) && teamsMatch(awayTeamName, awayTeam)) {
          console.log(`Found: ${homeTeamName} vs ${awayTeamName} | Status: ${status} | Score: ${homeGoals}-${awayGoals}`);

          if (['CANC', 'PST', 'ABD', 'AWD', 'WO'].includes(status)) {
            return { status: 'void' };
          }

          if (['NS', 'TBD'].includes(status)) {
            return { status: 'pending' };
          }

          if (['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(status)) {
            return { status: 'live', homeScore: homeGoals ?? 0, awayScore: awayGoals ?? 0 };
          }

          if (['FT', 'AET', 'PEN'].includes(status)) {
            return {
              status: 'finished',
              homeScore: homeGoals ?? 0,
              awayScore: awayGoals ?? 0,
            };
          }
        }
      }
    } catch (e) {
      console.error(`Error checking season ${season}:`, e.message);
    }
  }

  // Match not found in API - could be lower league not covered
  console.log(`Match not found in API: ${homeTeam} vs ${awayTeam}`);
  return { status: 'not_found' };
}

// ── Evaluate prediction ────────────────────────────────────────────────────
function evaluatePrediction(pred, homeScore, awayScore) {
  const p = safeString(pred).toLowerCase().trim();
  const total = homeScore + awayScore;

  if (!p) return null;

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
  if (p.includes('clean sheet home')) return awayScore === 0;
  if (p.includes('clean sheet away')) return homeScore === 0;

  const overMatch = p.match(/^over\s*([\d.]+)/);
  if (overMatch) return total > parseFloat(overMatch[1]);

  const underMatch = p.match(/^under\s*([\d.]+)/);
  if (underMatch) return total < parseFloat(underMatch[1]);

  const scoreMatch = p.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (scoreMatch) {
    return homeScore === parseInt(scoreMatch[1]) &&
           awayScore === parseInt(scoreMatch[2]);
  }

  console.log(`Unknown prediction market: ${p}`);
  return null;
}

// ── Main handler ───────────────────────────────────────────────────────────
exports.handler = async function () {
  console.log('🔄 Arena tip verification started:', new Date().toISOString());

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('❌ Missing Firebase env vars');
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Firebase env vars' }) };
  }

  if (!API_KEY) {
    console.error('❌ Missing API_FOOTBALL_KEY env var');
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing API_FOOTBALL_KEY' }) };
  }

  let checked = 0;
  let settled = 0;
  let skipped = 0;

  try {
    const channelsSnap = await db.collection('channels').get();
    console.log(`📂 Found ${channelsSnap.size} channels`);

    for (const channelDoc of safeArray(channelsSnap.docs)) {
      try {
        const channelId = channelDoc.id;
        const channelData = channelDoc.data() || {};
        const tipsterId = channelData.ownerId;
        const channelName = channelData.name || 'Unknown Channel';

        const tipsSnap = await db
          .collection('channels').doc(channelId)
          .collection('tips').where('status', '==', 'pending')
          .get();

        if (tipsSnap.empty) continue;
        console.log(`📌 Channel "${channelName}": ${tipsSnap.size} pending tips`);

        for (const tipDoc of safeArray(tipsSnap.docs)) {
          try {
            const tip = tipDoc.data() || {};
            const tipMatches = safeArray(tip.matches);

            if (tipMatches.length === 0) {
              console.log(`Tip ${tipDoc.id} has no matches - skipping`);
              skipped++;
              continue;
            }

            checked++;
            const updatedMatches = tipMatches.map(m => ({ ...m }));
            let allSettled = true;
            let anyLost = false;

            for (let i = 0; i < updatedMatches.length; i++) {
              const match = updatedMatches[i] || {};

              // Already settled
              if (match.status === 'win' || match.status === 'lost' || match.status === 'void') {
                if (match.status === 'lost') anyLost = true;
                continue;
              }

              const homeTeam = safeString(match.home);
              const awayTeam = safeString(match.away);

              const result = await checkSingleMatch(homeTeam, awayTeam);

              if (result.status === 'pending' || result.status === 'not_found') {
                allSettled = false;
                continue;
              }

              if (result.status === 'void') {
                updatedMatches[i] = { ...match, status: 'void' };
                continue;
              }

              if (result.status === 'live') {
                // Still in progress
                allSettled = false;
                updatedMatches[i] = {
                  ...match,
                  liveScore: `${result.homeScore}-${result.awayScore}`,
                };
                continue;
              }

              if (result.status === 'finished') {
                const prediction = safeString(match.prediction || tip.prediction);
                const won = evaluatePrediction(prediction, result.homeScore, result.awayScore);

                if (won === null) {
                  // Unknown market — leave pending
                  allSettled = false;
                  console.log(`Unknown market "${prediction}" for ${homeTeam} vs ${awayTeam}`);
                  continue;
                }

                updatedMatches[i] = {
                  ...match,
                  status: won ? 'win' : 'lost',
                  homeScore: result.homeScore,
                  awayScore: result.awayScore,
                };

                console.log(`✅ ${homeTeam} vs ${awayTeam}: ${result.homeScore}-${result.awayScore} → ${won ? 'WIN' : 'LOST'}`);

                if (!won) anyLost = true;
              }
            }

            // Accumulator logic: if any match lost, whole tip is lost
            if (anyLost) allSettled = true;

            const matchesChanged = JSON.stringify(updatedMatches) !== JSON.stringify(tipMatches);

            if (matchesChanged) {
              let tipStatus = 'pending';
              if (allSettled) tipStatus = anyLost ? 'lost' : 'won';

              await db.collection('channels').doc(channelId)
                .collection('tips').doc(tipDoc.id)
                .update({
                  matches: updatedMatches,
                  status: tipStatus,
                  ...(allSettled ? { settledAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
                });

              console.log(`📝 Tip ${tipDoc.id} → ${tipStatus}`);

              if (allSettled) {
                settled++;

                // Update tipster win rate
                try {
                  const allTipsSnap = await db
                    .collection('channels').doc(channelId)
                    .collection('tips').get();

                  const allTips = safeArray(allTipsSnap.docs).map(d => d.data() || {});
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
                } catch (e) {
                  console.error('Error updating win rate:', e.message);
                }

                // Notify tipster
                try {
                  if (tipsterId) {
                    await db.collection('notifications').add({
                      userId: tipsterId,
                      type: 'tip_result',
                      title: anyLost ? '❌ Tip Lost' : '✅ Tip Won!',
                      message: `Your tip in ${channelName} settled as ${tipStatus.toUpperCase()}`,
                      read: false,
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                  }
                } catch (e) {
                  console.error('Error sending notification:', e.message);
                }
              }
            }
          } catch (e) {
            console.error(`Error processing tip ${tipDoc.id}:`, e.message);
          }
        }
      } catch (e) {
        console.error(`Error processing channel ${channelDoc.id}:`, e.message);
      }
    }

    const summary = { success: true, checked, settled, skipped };
    console.log('✅ Verification complete:', summary);
    return { statusCode: 200, body: JSON.stringify(summary) };

  } catch (e) {
    console.error('❌ Fatal error:', e.message);
    console.error(e.stack);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
