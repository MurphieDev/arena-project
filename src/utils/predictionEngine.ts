// ── Arena Prediction Engine ────────────────────────────────────────────────
// Evaluates all prediction markets against real match data from ESPN API

export type PredictionResult = 'won' | 'lost' | 'pending' | 'void';

export interface MatchData {
  // Scores
  homeScore: number;
  awayScore: number;
  homeScoreHT?: number; // half time
  awayScoreHT?: number;
  homeScoreHalf2?: number; // second half only
  awayScoreHalf2?: number;

  // Status
  isCompleted: boolean;
  isLive: boolean;
  isCancelled: boolean;
  isPostponed: boolean;

  // Events
  goals?: GoalEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

export interface GoalEvent {
  team: 'home' | 'away';
  minute: number;
  playerName?: string;
  isOwnGoal?: boolean;
}

// ── Extract match data from ESPN event ────────────────────────────────────
export function extractMatchData(espnEvent: any): MatchData | null {
  try {
    const competition = espnEvent.competitions?.[0];
    if (!competition) return null;

    const homeComp = competition.competitors?.find((c: any) => c.homeAway === 'home');
    const awayComp = competition.competitors?.find((c: any) => c.homeAway === 'away');

    const homeScore = parseInt(homeComp?.score || '0');
    const awayScore = parseInt(awayComp?.score || '0');

    const statusName = espnEvent.status?.type?.name || '';
    const isCompleted = espnEvent.status?.type?.completed === true;
    const isScheduled = statusName === 'STATUS_SCHEDULED';
    const isCancelled = statusName === 'STATUS_CANCELED' || statusName === 'STATUS_ABANDONED';
    const isPostponed = statusName === 'STATUS_POSTPONED';
    const isLive = !isCompleted && !isScheduled && !isCancelled && !isPostponed;

    // Extract goal events from ESPN details
    const goals: GoalEvent[] = [];
    const details = competition.details || [];
    for (const detail of details) {
      if (detail.type?.text?.toLowerCase().includes('goal')) {
        const team = detail.team?.id === homeComp?.team?.id ? 'home' : 'away';
        const minute = parseInt(detail.clock?.displayValue?.replace("'", '') || '0');
        const playerName = detail.athletesInvolved?.[0]?.displayName;
        goals.push({ team, minute, playerName });
      }
    }

    // Half time scores from linescores
    const linescores = competition.linescores || [];
    let homeScoreHT: number | undefined;
    let awayScoreHT: number | undefined;

    if (linescores.length >= 2) {
      const homeLinescore = homeComp?.linescores || [];
      const awayLinescore = awayComp?.linescores || [];
      if (homeLinescore.length >= 1) homeScoreHT = parseInt(homeLinescore[0]?.value || '0');
      if (awayLinescore.length >= 1) awayScoreHT = parseInt(awayLinescore[0]?.value || '0');
    }

    // Second half scores
    const homeScoreHalf2 = homeScoreHT !== undefined ? homeScore - homeScoreHT : undefined;
    const awayScoreHalf2 = awayScoreHT !== undefined ? awayScore - awayScoreHT : undefined;

    return {
      homeScore,
      awayScore,
      homeScoreHT,
      awayScoreHT,
      homeScoreHalf2,
      awayScoreHalf2,
      isCompleted,
      isLive,
      isCancelled,
      isPostponed,
      goals,
      homeTeamName: homeComp?.team?.displayName || '',
      awayTeamName: awayComp?.team?.displayName || '',
    };
  } catch {
    return null;
  }
}

// ── Main prediction evaluator ──────────────────────────────────────────────
export function evaluatePrediction(
  prediction: string,
  matchData: MatchData
): PredictionResult {
  // Handle void cases first
  if (matchData.isCancelled || matchData.isPostponed) return 'void';

  // If match not completed or live, prediction is still pending
  if (!matchData.isCompleted && !matchData.isLive) return 'pending';

  const pred = prediction.toLowerCase().trim();
  const { homeScore, awayScore } = matchData;
  const totalGoals = homeScore + awayScore;

  // ── 1X2 Market ────────────────────────────────────────────────────────
  if (pred === '1' || pred === 'home win' || pred === 'home') {
    if (!matchData.isCompleted) return 'pending';
    return homeScore > awayScore ? 'won' : 'lost';
  }

  if (pred === 'x' || pred === 'draw') {
    if (!matchData.isCompleted) return 'pending';
    return homeScore === awayScore ? 'won' : 'lost';
  }

  if (pred === '2' || pred === 'away win' || pred === 'away') {
    if (!matchData.isCompleted) return 'pending';
    return awayScore > homeScore ? 'won' : 'lost';
  }

  // ── Double Chance ─────────────────────────────────────────────────────
  if (pred === '1x' || pred === 'double chance 1x' || pred === '1 or draw') {
    if (!matchData.isCompleted) return 'pending';
    return homeScore >= awayScore ? 'won' : 'lost';
  }

  if (pred === 'x2' || pred === 'double chance x2' || pred === 'draw or 2') {
    if (!matchData.isCompleted) return 'pending';
    return awayScore >= homeScore ? 'won' : 'lost';
  }

  if (pred === '12' || pred === 'double chance 12' || pred === '1 or 2') {
    if (!matchData.isCompleted) return 'pending';
    return homeScore !== awayScore ? 'won' : 'lost';
  }

  // ── Both Teams to Score ───────────────────────────────────────────────
  if (pred === 'gg' || pred === 'btts' || pred === 'btts yes' ||
      pred === 'both teams to score' || pred === 'both teams to score - yes') {
    if (!matchData.isCompleted) return 'pending';
    return (homeScore > 0 && awayScore > 0) ? 'won' : 'lost';
  }

  if (pred === 'ng' || pred === 'btts no' || pred === 'no btts' ||
      pred === 'both teams to score - no' || pred === 'no goal') {
    if (!matchData.isCompleted) return 'pending';
    return (homeScore === 0 || awayScore === 0) ? 'won' : 'lost';
  }

  // ── Over / Under Goals ────────────────────────────────────────────────
  const overMatch = pred.match(/^over\s*([\d.]+)$/);
  if (overMatch) {
    const line = parseFloat(overMatch[1]);
    if (!matchData.isCompleted) {
      // Can still win if already over the line live
      if (matchData.isLive && totalGoals > line) return 'won';
      return 'pending';
    }
    return totalGoals > line ? 'won' : 'lost';
  }

  const underMatch = pred.match(/^under\s*([\d.]+)$/);
  if (underMatch) {
    const line = parseFloat(underMatch[1]);
    if (!matchData.isCompleted) {
      // Can still lose if already over the line live
      if (matchData.isLive && totalGoals >= line) return 'lost';
      return 'pending';
    }
    return totalGoals < line ? 'won' : 'lost';
  }

  // ── Over/Under with "goals" suffix ────────────────────────────────────
  const overGoalsMatch = pred.match(/^over\s*([\d.]+)\s*goals?$/);
  if (overGoalsMatch) {
    const line = parseFloat(overGoalsMatch[1]);
    if (!matchData.isCompleted) return 'pending';
    return totalGoals > line ? 'won' : 'lost';
  }

  const underGoalsMatch = pred.match(/^under\s*([\d.]+)\s*goals?$/);
  if (underGoalsMatch) {
    const line = parseFloat(underGoalsMatch[1]);
    if (!matchData.isCompleted) return 'pending';
    return totalGoals < line ? 'won' : 'lost';
  }

  // ── First Half Over/Under ─────────────────────────────────────────────
  const htOverMatch = pred.match(/^(?:ht|1st half|first half)\s*over\s*([\d.]+)/) ||
                      pred.match(/^over\s*([\d.]+)\s*(?:ht|1st half|first half)/);
  if (htOverMatch) {
    const line = parseFloat(htOverMatch[1]);
    if (matchData.homeScoreHT === undefined) return 'pending';
    const htGoals = (matchData.homeScoreHT || 0) + (matchData.awayScoreHT || 0);
    return htGoals > line ? 'won' : 'lost';
  }

  const htUnderMatch = pred.match(/^(?:ht|1st half|first half)\s*under\s*([\d.]+)/) ||
                       pred.match(/^under\s*([\d.]+)\s*(?:ht|1st half|first half)/);
  if (htUnderMatch) {
    const line = parseFloat(htUnderMatch[1]);
    if (matchData.homeScoreHT === undefined) return 'pending';
    const htGoals = (matchData.homeScoreHT || 0) + (matchData.awayScoreHT || 0);
    return htGoals < line ? 'won' : 'lost';
  }

  // ── Correct Score ─────────────────────────────────────────────────────
  const correctScoreMatch = pred.match(/^(\d+)\s*[-:]\s*(\d+)$/) ||
                             pred.match(/^correct score\s*(\d+)\s*[-:]\s*(\d+)$/);
  if (correctScoreMatch) {
    if (!matchData.isCompleted) return 'pending';
    const predHome = parseInt(correctScoreMatch[1]);
    const predAway = parseInt(correctScoreMatch[2]);
    return (homeScore === predHome && awayScore === predAway) ? 'won' : 'lost';
  }

  // ── Clean Sheet ───────────────────────────────────────────────────────
  if (pred.includes('clean sheet')) {
    if (!matchData.isCompleted) return 'pending';
    if (pred.includes('home') || pred.startsWith(matchData.homeTeamName.toLowerCase())) {
      return awayScore === 0 ? 'won' : 'lost';
    }
    if (pred.includes('away') || pred.startsWith(matchData.awayTeamName.toLowerCase())) {
      return homeScore === 0 ? 'won' : 'lost';
    }
    // Generic clean sheet — either team keeps clean sheet
    return (homeScore === 0 || awayScore === 0) ? 'won' : 'lost';
  }

  // ── Home Team to Score ────────────────────────────────────────────────
  if (pred === 'home team to score' || pred === 'home to score') {
    if (!matchData.isCompleted) {
      if (matchData.isLive && homeScore > 0) return 'won';
      return 'pending';
    }
    return homeScore > 0 ? 'won' : 'lost';
  }

  // ── Away Team to Score ────────────────────────────────────────────────
  if (pred === 'away team to score' || pred === 'away to score') {
    if (!matchData.isCompleted) {
      if (matchData.isLive && awayScore > 0) return 'won';
      return 'pending';
    }
    return awayScore > 0 ? 'won' : 'lost';
  }

  // ── First Half Result ─────────────────────────────────────────────────
  if (pred.includes('1st half') || pred.includes('first half') || pred.includes('ht')) {
    if (matchData.homeScoreHT === undefined || matchData.awayScoreHT === undefined) return 'pending';
    const htH = matchData.homeScoreHT;
    const htA = matchData.awayScoreHT;

    if (pred.includes('home win') || pred.includes('ht 1') || pred.includes('first half 1')) {
      return htH > htA ? 'won' : 'lost';
    }
    if (pred.includes('draw') || pred.includes('ht x') || pred.includes('first half x')) {
      return htH === htA ? 'won' : 'lost';
    }
    if (pred.includes('away win') || pred.includes('ht 2') || pred.includes('first half 2')) {
      return htA > htH ? 'won' : 'lost';
    }
    if (pred.includes('home to score') || pred.includes('home team to score')) {
      return htH > 0 ? 'won' : 'lost';
    }
    if (pred.includes('away to score') || pred.includes('away team to score')) {
      return htA > 0 ? 'won' : 'lost';
    }
  }

  // ── Second Half Result ────────────────────────────────────────────────
  if (pred.includes('2nd half') || pred.includes('second half')) {
    if (!matchData.isCompleted) return 'pending';
    if (matchData.homeScoreHalf2 === undefined) return 'pending';
    const h2H = matchData.homeScoreHalf2;
    const h2A = matchData.awayScoreHalf2 || 0;

    if (pred.includes('home win') || pred.includes('2nd half 1')) return h2H > h2A ? 'won' : 'lost';
    if (pred.includes('draw') || pred.includes('2nd half x')) return h2H === h2A ? 'won' : 'lost';
    if (pred.includes('away win') || pred.includes('2nd half 2')) return h2A > h2H ? 'won' : 'lost';
    if (pred.includes('home to score')) return h2H > 0 ? 'won' : 'lost';
    if (pred.includes('away to score')) return h2A > 0 ? 'won' : 'lost';
  }

  // ── Team to Win Either Half ───────────────────────────────────────────
  if (pred.includes('win either half')) {
    if (!matchData.isCompleted) return 'pending';
    if (matchData.homeScoreHT === undefined || matchData.homeScoreHalf2 === undefined) return 'pending';
    const htH = matchData.homeScoreHT;
    const htA = matchData.awayScoreHT || 0;
    const h2H = matchData.homeScoreHalf2;
    const h2A = matchData.awayScoreHalf2 || 0;

    if (pred.includes('home')) {
      return (htH > htA || h2H > h2A) ? 'won' : 'lost';
    }
    if (pred.includes('away')) {
      return (htA > htH || h2A > h2H) ? 'won' : 'lost';
    }
  }

  // ── Goal Before Half Time ─────────────────────────────────────────────
  if (pred === 'goal before half time' || pred === 'goal before ht') {
    if (matchData.homeScoreHT === undefined) return 'pending';
    const htGoals = (matchData.homeScoreHT || 0) + (matchData.awayScoreHT || 0);
    return htGoals > 0 ? 'won' : 'lost';
  }

  // ── Goal in First N Minutes ───────────────────────────────────────────
  const firstNMinMatch = pred.match(/^goal in (?:first|the first)\s*(\d+)\s*(?:min|minutes?)$/);
  if (firstNMinMatch) {
    const minutes = parseInt(firstNMinMatch[1]);
    if (!matchData.goals) return 'pending';
    if (!matchData.isCompleted && matchData.isLive) return 'pending';
    const earlyGoal = matchData.goals.find(g => g.minute <= minutes);
    return earlyGoal ? 'won' : 'lost';
  }

  // ── First Team to Score ───────────────────────────────────────────────
  if (pred.includes('first to score') || pred.includes('first goal scorer team')) {
    if (!matchData.goals || matchData.goals.length === 0) {
      if (matchData.isCompleted) return totalGoals === 0 ? 'void' : 'lost';
      return 'pending';
    }
    const firstGoal = matchData.goals.sort((a, b) => a.minute - b.minute)[0];
    if (pred.includes('home') || pred.includes(matchData.homeTeamName.toLowerCase())) {
      return firstGoal.team === 'home' ? 'won' : 'lost';
    }
    if (pred.includes('away') || pred.includes(matchData.awayTeamName.toLowerCase())) {
      return firstGoal.team === 'away' ? 'won' : 'lost';
    }
  }

  // ── Last Team to Score ────────────────────────────────────────────────
  if (pred.includes('last to score') || pred.includes('last goal scorer team')) {
    if (!matchData.isCompleted) return 'pending';
    if (!matchData.goals || matchData.goals.length === 0) return 'void';
    const lastGoal = matchData.goals.sort((a, b) => b.minute - a.minute)[0];
    if (pred.includes('home') || pred.includes(matchData.homeTeamName.toLowerCase())) {
      return lastGoal.team === 'home' ? 'won' : 'lost';
    }
    if (pred.includes('away') || pred.includes(matchData.awayTeamName.toLowerCase())) {
      return lastGoal.team === 'away' ? 'won' : 'lost';
    }
  }

  // ── Anytime Goal Scorer ───────────────────────────────────────────────
  if (pred.includes('anytime goal scorer') || pred.includes('anytime scorer')) {
    if (!matchData.isCompleted) {
      // Check if player already scored live
      if (matchData.isLive && matchData.goals) {
        const playerName = pred.replace('anytime goal scorer', '').replace('anytime scorer', '').trim();
        const scored = matchData.goals.some(g =>
          g.playerName?.toLowerCase().includes(playerName)
        );
        if (scored) return 'won';
      }
      return 'pending';
    }
    const playerName = pred.replace('anytime goal scorer', '').replace('anytime scorer', '').trim();
    if (!matchData.goals) return 'lost';
    const scored = matchData.goals.some(g =>
      g.playerName?.toLowerCase().includes(playerName)
    );
    return scored ? 'won' : 'lost';
  }

  // ── First Goal Scorer ─────────────────────────────────────────────────
  if (pred.includes('first goal scorer') || pred.includes('first scorer')) {
    if (!matchData.isCompleted) return 'pending';
    if (!matchData.goals || matchData.goals.length === 0) return 'void';
    const playerName = pred.replace('first goal scorer', '').replace('first scorer', '').trim();
    const firstGoal = matchData.goals.sort((a, b) => a.minute - b.minute)[0];
    return firstGoal.playerName?.toLowerCase().includes(playerName) ? 'won' : 'lost';
  }

  // ── Win to Nil (Win without conceding) ────────────────────────────────
  if (pred.includes('win to nil') || pred.includes('win & keep clean sheet')) {
    if (!matchData.isCompleted) return 'pending';
    if (pred.includes('home')) return (homeScore > awayScore && awayScore === 0) ? 'won' : 'lost';
    if (pred.includes('away')) return (awayScore > homeScore && homeScore === 0) ? 'won' : 'lost';
  }

  // ── Score in Both Halves ──────────────────────────────────────────────
  if (pred.includes('score in both halves')) {
    if (!matchData.isCompleted) return 'pending';
    if (matchData.homeScoreHT === undefined) return 'pending';
    const htGoals = (matchData.homeScoreHT || 0) + (matchData.awayScoreHT || 0);
    const h2Goals = (matchData.homeScoreHalf2 || 0) + (matchData.awayScoreHalf2 || 0);
    if (pred.includes('home')) {
      return ((matchData.homeScoreHT || 0) > 0 && (matchData.homeScoreHalf2 || 0) > 0) ? 'won' : 'lost';
    }
    if (pred.includes('away')) {
      return ((matchData.awayScoreHT || 0) > 0 && (matchData.awayScoreHalf2 || 0) > 0) ? 'won' : 'lost';
    }
    return (htGoals > 0 && h2Goals > 0) ? 'won' : 'lost';
  }

  // ── Draw at Half Time & Win Full Time ─────────────────────────────────
  if (pred.includes('draw at ht') || pred.includes('ht draw')) {
    if (!matchData.isCompleted) return 'pending';
    if (matchData.homeScoreHT === undefined) return 'pending';
    if (pred.includes('home win') || pred.includes('& home win')) {
      return (matchData.homeScoreHT === matchData.awayScoreHT && homeScore > awayScore) ? 'won' : 'lost';
    }
    if (pred.includes('away win') || pred.includes('& away win')) {
      return (matchData.homeScoreHT === matchData.awayScoreHT && awayScore > homeScore) ? 'won' : 'lost';
    }
    return matchData.homeScoreHT === matchData.awayScoreHT ? 'won' : 'lost';
  }

  // ── Total Goals Exact ─────────────────────────────────────────────────
  const exactGoalsMatch = pred.match(/^(\d+)\s*goals?$/);
  if (exactGoalsMatch) {
    if (!matchData.isCompleted) return 'pending';
    return totalGoals === parseInt(exactGoalsMatch[1]) ? 'won' : 'lost';
  }

  // ── Asian Handicap simplified ─────────────────────────────────────────
  const handicapMatch = pred.match(/^asian handicap\s*(home|away)\s*([-+][\d.]+)$/);
  if (handicapMatch) {
    if (!matchData.isCompleted) return 'pending';
    const team = handicapMatch[1];
    const handicap = parseFloat(handicapMatch[2]);
    const diff = team === 'home' ? homeScore - awayScore + handicap : awayScore - homeScore + handicap;
    if (diff > 0) return 'won';
    if (diff < 0) return 'lost';
    return 'void'; // push
  }

  // If no market matched, return pending
  return 'pending';
}

// ── Evaluate all matches in a tip ─────────────────────────────────────────
export function evaluateTip(
  tipMatches: { home: string; away: string; prediction: string; odds: string }[],
  matchResults: Map<string, MatchData>
): PredictionResult {
  let allSettled = true;
  let allWon = true;
  let anyVoid = false;

  for (const match of tipMatches) {
    const key = `${match.home.toLowerCase()}_${match.away.toLowerCase()}`;
    const matchData = matchResults.get(key);

    if (!matchData) {
      allSettled = false;
      continue;
    }

    const result = evaluatePrediction(match.prediction, matchData);

    if (result === 'void') {
      anyVoid = true;
      continue;
    }

    if (result === 'pending') {
      allSettled = false;
    }

    if (result === 'lost') {
      allWon = false;
    }
  }

  if (!allSettled) return 'pending';
  if (!allWon) return 'lost';
  if (anyVoid && allWon) return 'won'; // void selections don't count
  return 'won';
}

// ── Format prediction result for display ──────────────────────────────────
export function formatPredictionResult(result: PredictionResult): {
  label: string;
  color: string;
  bg: string;
  emoji: string;
} {
  switch (result) {
    case 'won':
      return { label: 'WON', color: 'text-green-400', bg: 'bg-green-500/20', emoji: '✅' };
    case 'lost':
      return { label: 'LOST', color: 'text-red-400', bg: 'bg-red-500/20', emoji: '❌' };
    case 'void':
      return { label: 'VOID', color: 'text-gray-400', bg: 'bg-gray-500/20', emoji: '⚪' };
    default:
      return { label: 'PENDING', color: 'text-yellow-400', bg: 'bg-yellow-500/20', emoji: '⏳' };
  }
}
