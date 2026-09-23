import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const MAX_MESSAGES = 100; // 최근 100개만 불러와서 화면/비용 부담을 줄임

export function subscribeToMessages(coupleId, callback) {
  const q = query(
    collection(db, 'couples', coupleId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(MAX_MESSAGES)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function sendMessage(coupleId, senderId, text) {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();
  return addDoc(collection(db, 'couples', coupleId, 'messages'), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
}
