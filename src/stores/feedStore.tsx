import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { FeedCard, FeedState } from '../types/feed';

type FeedAction =
  | { type: 'ADD_CARDS'; payload: FeedCard[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACTIVE_VIDEO'; payload: string | null }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'INCREMENT_PAGE' }
  | { type: 'RESET_FEED' }
  | { type: 'LIKE_CARD'; payload: string }
  | { type: 'BOOKMARK_CARD'; payload: string }
  | { type: 'CLEAR_FEED' };

interface FeedContextType extends FeedState {
  dispatch: (action: FeedAction) => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

const initialState: FeedState = {
  cards: [],
  loading: false,
  hasMore: true,
  error: null,
  page: 0,
  activeVideoId: null,
};

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'ADD_CARDS':
      return {
        ...state,
        cards: [...state.cards, ...action.payload],
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_ACTIVE_VIDEO':
      return { ...state, activeVideoId: action.payload };
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };
    case 'INCREMENT_PAGE':
      return { ...state, page: state.page + 1 };
    case 'RESET_FEED':
      return initialState;
    case 'LIKE_CARD':
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.payload
            ? {
                ...card,
                likes: (card as any).likes + ((card as any).liked ? -1 : 1),
                liked: !(card as any).liked,
              }
            : card
        ),
      };
    case 'BOOKMARK_CARD':
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.payload
            ? {
                ...card,
                bookmarked: !(card as any).bookmarked,
              }
            : card
        ),
      };
    case 'CLEAR_FEED':
      return {
        ...state,
        cards: [],
        page: 0,
        hasMore: true,
        error: null,
      };
    default:
      return state;
  }
}

export function FeedProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(feedReducer, initialState);

  return (
    <FeedContext.Provider value={{ ...state, dispatch }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeedStore() {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeedStore must be used within FeedProvider');
  }

  return {
    cards: context.cards,
    loading: context.loading,
    hasMore: context.hasMore,
    error: context.error,
    page: context.page,
    activeVideoId: context.activeVideoId,

    addCards: (cards: FeedCard[]) =>
      context.dispatch({ type: 'ADD_CARDS', payload: cards }),
    setLoading: (loading: boolean) =>
      context.dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) =>
      context.dispatch({ type: 'SET_ERROR', payload: error }),
    setActiveVideo: (id: string | null) =>
      context.dispatch({ type: 'SET_ACTIVE_VIDEO', payload: id }),
    setHasMore: (hasMore: boolean) =>
      context.dispatch({ type: 'SET_HAS_MORE', payload: hasMore }),
    incrementPage: () =>
      context.dispatch({ type: 'INCREMENT_PAGE' }),
    resetFeed: () =>
      context.dispatch({ type: 'RESET_FEED' }),
    likeCard: (cardId: string) =>
      context.dispatch({ type: 'LIKE_CARD', payload: cardId }),
    bookmarkCard: (cardId: string) =>
      context.dispatch({ type: 'BOOKMARK_CARD', payload: cardId }),
    clearFeed: () =>
      context.dispatch({ type: 'CLEAR_FEED' }),
  };
}
