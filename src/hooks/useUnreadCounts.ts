import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query as firestoreQuery, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export function useUnreadCounts() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUid(u?.uid || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = firestoreQuery(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, snap => setUnreadNotifications(snap.size));
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = firestoreQuery(
      collection(db, 'chats'),
      where('participants', 'array-contains', uid)
    );
    const unsub = onSnapshot(q, snap => {
      let total = 0;
      snap.docs.forEach(d => { total += d.data()[`unread_${uid}`] || 0; });
      setUnreadMessages(total);
    });
    return () => unsub();
  }, [uid]);

  return { unreadMessages, unreadNotifications };
}
