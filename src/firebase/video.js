import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

function stateRef(coupleId) {
  return doc(db, 'couples', coupleId, 'video', 'state');
}

export function subscribeToVideoState(coupleId, callback) {
  return onSnapshot(stateRef(coupleId), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export function setVideoState(coupleId, myUid, { videoId, isPlaying, currentTime }) {
  return setDoc(stateRef(coupleId), {
    videoId,
    isPlaying,
    currentTime,
    updatedBy: myUid,
    updatedAt: serverTimestamp(),
  });
}

// 유튜브 URL 또는 그냥 영상 ID를 입력받아 영상 ID만 추출
export function extractVideoId(input) {
  const trimmed = input.trim();
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  // 이미 순수 11자리 영상 ID인 경우
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}
