import { VideoCard } from './VideoCard';
import { PredictionCard } from './PredictionCard';
import { AnalysisCard } from './AnalysisCard';
import { LiveMatchCard } from './LiveMatchCard';
import { TrendingCard } from './TrendingCard';
import { UserCard } from './UserCard';
import type { FeedCard } from '../../types/feed';

interface FeedCardRendererProps {
  card: FeedCard;
  onUserClick?: (userId: string) => void;
  onMatchClick?: (matchId: string) => void;
  onFollowClick?: (userId: string) => void;
  onTagClick?: (tag: string) => void;
}

export function FeedCardRenderer({
  card,
  onUserClick,
  onMatchClick,
  onFollowClick,
  onTagClick,
}: FeedCardRendererProps) {
  switch (card.type) {
    case 'video':
      return (
        <VideoCard
          card={card}
          onUserClick={onUserClick}
          onMatchClick={onMatchClick}
        />
      );

    case 'prediction':
      return (
        <PredictionCard
          card={card}
          onUserClick={onUserClick}
          onMatchClick={onMatchClick}
        />
      );

    case 'analysis':
      return (
        <AnalysisCard
          card={card}
          onUserClick={onUserClick}
          onMatchClick={onMatchClick}
        />
      );

    case 'live-match':
      return <LiveMatchCard card={card} onMatchClick={onMatchClick} />;

    case 'trending':
      return <TrendingCard card={card} onTagClick={onTagClick} />;

    case 'user':
      return (
        <UserCard
          card={card}
          onUserClick={onUserClick}
          onFollowClick={onFollowClick}
        />
      );

    default:
      return (
        <div className="bg-[#0a0a0a] rounded-2xl border border-[#1f1f1f] p-4 text-center text-[#71767b]">
          <p>Card type "{card.type}" not yet implemented</p>
        </div>
      );
  }
}
