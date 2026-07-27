// src/hooks/feed/useFeed.ts
// Real Firebase implementation replacing mock feed data

import { useState, useEffect, useCallback } from 'react';
import {
  collection, query as firestoreQuery, orderBy, limit,
  startAfter, getDocs, type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { FeedCard, FeedOptions, CardType } from '../../types/feed';

interface UseFeedReturn {
  cards: FeedCard[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
}

export function useFeed(options: FeedOptions = {}): UseFeedReturn {
  const { limit: pageLimit = 10, filter, sort = 'new' } = options;
  const [cards, setCards] = useState<FeedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  const fetchPosts = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      let q = sort === 'new'
        ? firestoreQuery(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageLimit))
        : firestoreQuery(collection(db, 'posts'), orderBy('likes', 'desc'), limit(pageLimit));

      // If loading more, start after last doc
      if (isLoadMore && lastDoc) {
        q = sort === 'new'
          ? firestoreQuery(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageLimit))
          : firestoreQuery(collection(db, 'posts'), orderBy('likes', 'desc'), startAfter(lastDoc), limit(pageLimit));
      }

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const newCards: FeedCard[] = snapshot.docs.map(d => {
        const data = d.data();

        // Map video posts to VideoCard type
        if (data.video) {
          return {
            id: d.id,
            type: 'video' as const,
            user: {
              id: data.userId || d.id,
              name: data.userName || 'User',
              handle: data.userHandle || '@user',
              avatar: data.userAvatar || '',
              verified: data.verified || false,
              tipster: data.tipster || false,
            },
            title: data.content?.substring(0, 60) || 'Video',
            description: data.content || '',
            videoUrl: data.video,
            thumbnailUrl: data.image || '',
            duration: 0,
            likes: data.likes || 0,
            comments: data.comments || 0,
            views: data.views || 0,
            timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            liked: false,
            bookmarked: false,
          };
        }

        // Map prediction posts
        if (data.tag === 'Prediction') {
          return {
            id: d.id,
            type: 'analysis' as const,
            user: {
              id: data.userId || d.id,
              name: data.userName || 'User',
              handle: data.userHandle || '@user',
              avatar: data.userAvatar || '',
              verified: data.verified || false,
              tipster: data.tipster || false,
            },
            title: data.content?.substring(0, 60) || 'Prediction',
            content: data.content || '',
            image: data.image,
            confidence: 75,
            winRate: 70,
            roi: 15,
            likes: data.likes || 0,
            comments: data.comments || 0,
            reposts: data.reposts || 0,
            timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            liked: false,
            bookmarked: false,
          };
        }

        // Default: analysis/text post
        return {
          id: d.id,
          type: 'analysis' as const,
          user: {
            id: data.userId || d.id,
            name: data.userName || 'User',
            handle: data.userHandle || '@user',
            avatar: data.userAvatar || '',
            verified: data.verified || false,
            tipster: data.tipster || false,
          },
          title: data.content?.substring(0, 60) || 'Post',
          content: data.content || '',
          image: data.image,
          confidence: 0,
          winRate: 0,
          roi: 0,
          likes: data.likes || 0,
          comments: data.comments || 0,
          reposts: data.reposts || 0,
          timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          liked: false,
          bookmarked: false,
        };
      });

      // Apply filter if specified
      const filtered = filter && filter.length > 0
        ? newCards.filter(c => filter.includes(c.type as CardType))
        : newCards;

      if (isLoadMore) {
        setCards(prev => [...prev, ...filtered]);
      } else {
        setCards(filtered);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === pageLimit);

    } catch (e: any) {
      console.error('Feed error:', e);
      setError('Failed to load feed. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, [pageLimit, sort, filter, lastDoc]);

  useEffect(() => {
    setCards([]);
    setLastDoc(null);
    setHasMore(true);
    fetchPosts(false);
  }, [sort, JSON.stringify(filter)]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPosts(true);
    }
  }, [loading, hasMore, fetchPosts]);

  return { cards, loading, hasMore, error, loadMore };
}
