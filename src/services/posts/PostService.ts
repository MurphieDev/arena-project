// src/services/posts/PostService.ts
// Direct Firestore SDK — same pattern as AuthService.ts, no custom backend.
//
// Schema this assumes (greenfield — adjust names if a `posts` collection
// already exists with different field names):
//   posts/{postId}                       { authorId, author: <snapshot>, content, tag?, image?, video?,
//                                           likesCount, commentsCount, repostsCount, createdAt }
//   posts/{postId}/comments/{commentId}  { authorId, author: <snapshot>, content, likesCount, repliesCount, createdAt }
//   likes/{userId_postId}                { userId, postId, createdAt }
//   bookmarks/{userId_postId}            { userId, postId, createdAt }
//   reposts/{userId_postId}              { userId, postId, createdAt }
//   commentLikes/{userId_commentId}      { userId, commentId, createdAt }
//
// Author info is denormalized onto posts/comments at write time (name,
// handle, verified, tipster) so rendering a feed doesn't need N extra user
// lookups. That's a common Firestore tradeoff, but it means a user's
// profile edits won't retroactively update their old posts' displayed name.
//
// getUserPosts() needs a composite index (authorId ==, createdAt desc) —
// Firestore will give you a console link to create it the first time this
// runs if it's missing.

import {
  collection, doc, addDoc, getDoc, getDocs, deleteDoc, setDoc, updateDoc,
  increment, serverTimestamp, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AppUser } from '../../core/types';

export interface PostAuthor {
  id: string;
  name: string;
  handle: string;
  verified: boolean;
  tipster: boolean;
  profilePicture?: string;
}

export interface FeedPost {
  id: string;
  user: PostAuthor;
  content: string;
  time: string;
  likes: number;
  comments: number;
  reposts: number;
  tag?: string;
  image?: string;
  video?: string;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
  repostedByMe?: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  user: PostAuthor;
  content: string;
  time: string;
  likes: number;
  replies: number;
  likedByMe?: boolean;
}

function authorSnapshot(user: AppUser): PostAuthor {
  return {
    id: user.uid || user.id,
    name: user.displayName || user.name,
    handle: user.handle,
    verified: !!user.verified,
    tipster: user.role === 'tipster',
    profilePicture: user.profilePicture,
  };
}

function timeAgo(ts: any): string {
  if (!ts) return 'Just now';
  const date: Date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function likeDocId(userId: string, targetId: string): string {
  return `${userId}_${targetId}`;
}

class PostService {
  private static instance: PostService;
  private constructor() {}

  static getInstance(): PostService {
    if (!PostService.instance) {
      PostService.instance = new PostService();
    }
    return PostService.instance;
  }

  async getUserPosts(userId: string, viewerId?: string): Promise<FeedPost[]> {
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    const posts: FeedPost[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        user: data.author as PostAuthor,
        content: data.content,
        time: timeAgo(data.createdAt),
        likes: data.likesCount || 0,
        comments: data.commentsCount || 0,
        reposts: data.repostsCount || 0,
        tag: data.tag,
        image: data.image,
        video: data.video,
      };
    });

    if (viewerId) {
      await Promise.all(posts.map(async (p) => {
        const likeSnap = await getDoc(doc(db, 'likes', likeDocId(viewerId, p.id)));
        p.likedByMe = likeSnap.exists();
      }));
    }

    return posts;
  }

  async getComments(postId: string, viewerId?: string): Promise<PostComment[]> {
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    const comments: PostComment[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        postId,
        user: data.author as PostAuthor,
        content: data.content,
        time: timeAgo(data.createdAt),
        likes: data.likesCount || 0,
        replies: data.repliesCount || 0,
      };
    });

    if (viewerId) {
      await Promise.all(comments.map(async (c) => {
        const likeSnap = await getDoc(doc(db, 'commentLikes', likeDocId(viewerId, c.id)));
        c.likedByMe = likeSnap.exists();
      }));
    }

    return comments;
  }

  async addComment(postId: string, content: string, author: AppUser): Promise<PostComment> {
    const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
      authorId: author.uid || author.id,
      author: authorSnapshot(author),
      content,
      likesCount: 0,
      repliesCount: 0,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });

    return {
      id: ref.id,
      postId,
      user: authorSnapshot(author),
      content,
      time: 'Just now',
      likes: 0,
      replies: 0,
      likedByMe: false,
    };
  }

  async likePost(postId: string, userId: string): Promise<void> {
    await setDoc(doc(db, 'likes', likeDocId(userId, postId)), { userId, postId, createdAt: serverTimestamp() });
    await updateDoc(doc(db, 'posts', postId), { likesCount: increment(1) });
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    await deleteDoc(doc(db, 'likes', likeDocId(userId, postId)));
    await updateDoc(doc(db, 'posts', postId), { likesCount: increment(-1) });
  }

  async bookmarkPost(postId: string, userId: string): Promise<void> {
    await setDoc(doc(db, 'bookmarks', likeDocId(userId, postId)), { userId, postId, createdAt: serverTimestamp() });
  }

  async unbookmarkPost(postId: string, userId: string): Promise<void> {
    await deleteDoc(doc(db, 'bookmarks', likeDocId(userId, postId)));
  }

  async repostPost(postId: string, userId: string): Promise<void> {
    await setDoc(doc(db, 'reposts', likeDocId(userId, postId)), { userId, postId, createdAt: serverTimestamp() });
    await updateDoc(doc(db, 'posts', postId), { repostsCount: increment(1) });
  }

  async unrepostPost(postId: string, userId: string): Promise<void> {
    await deleteDoc(doc(db, 'reposts', likeDocId(userId, postId)));
    await updateDoc(doc(db, 'posts', postId), { repostsCount: increment(-1) });
  }

  async likeComment(postId: string, commentId: string, userId: string): Promise<void> {
    await setDoc(doc(db, 'commentLikes', likeDocId(userId, commentId)), { userId, commentId, createdAt: serverTimestamp() });
    await updateDoc(doc(db, 'posts', postId, 'comments', commentId), { likesCount: increment(1) });
  }

  async unlikeComment(postId: string, commentId: string, userId: string): Promise<void> {
    await deleteDoc(doc(db, 'commentLikes', likeDocId(userId, commentId)));
    await updateDoc(doc(db, 'posts', postId, 'comments', commentId), { likesCount: increment(-1) });
  }
}

export const postService = PostService.getInstance();
