import { useEffect, useRef, useState } from 'react';
import {
  subscribeToVideoState,
  setVideoState,
  extractVideoId,
} from '../firebase/video';

const SEEK_THRESHOLD = 2; // 이 정도(초) 이상 차이나야 강제로 맞춰줌 (미세한 오차는 무시)
const PERIODIC_SYNC_MS = 5000; // 재생 중일 때 주기적으로 시간 맞춰주는 간격

let ytApiPromise = null;
function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
  return ytApiPromise;
}

export default function WatchTogether({ coupleId, myUid }) {
  const playerRef = useRef(null);
  const playerElRef = useRef(null);
  const currentVideoIdRef = useRef(null);
  const applyingRemoteRef = useRef(false); // 원격 상태를 반영 중일 땐 내 쪽 이벤트를 무시(무한루프 방지)
  const [input, setInput] = useState('');
  const [videoId, setVideoId] = useState(null);
  const [error, setError] = useState('');

  // 유튜브 플레이어 초기화 (한 번만)
  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then((YT) => {
      if (cancelled || !playerElRef.current) return;
      playerRef.current = new YT.Player(playerElRef.current, {
        height: '100%',
        width: '100%',
        videoId: '',
        events: {
          onStateChange: handlePlayerStateChange,
        },
      });
    });
    return () => {
      cancelled = true;
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Firestore 상태 실시간 구독
  useEffect(() => {
    const unsubscribe = subscribeToVideoState(coupleId, (state) => {
      if (!state || !playerRef.current?.loadVideoById) return;

      applyingRemoteRef.current = true;

      if (state.videoId !== currentVideoIdRef.current) {
        currentVideoIdRef.current = state.videoId;
        setVideoId(state.videoId);
        playerRef.current.loadVideoById(state.videoId, state.currentTime || 0);
        if (!state.isPlaying) {
          // loadVideoById는 자동재생되므로, 정지 상태였다면 바로 멈춤
          setTimeout(() => playerRef.current?.pauseVideo?.(), 300);
        }
      } else {
        const localTime = playerRef.current.getCurrentTime?.() || 0;
        if (Math.abs(localTime - (state.currentTime || 0)) > SEEK_THRESHOLD) {
          playerRef.current.seekTo(state.currentTime || 0, true);
        }
        if (state.isPlaying) playerRef.current.playVideo?.();
        else playerRef.current.pauseVideo?.();
      }

      setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 400);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  function handlePlayerStateChange(event) {
    if (applyingRemoteRef.current) return; // 원격 반영 중 발생한 이벤트는 무시
    const YT = window.YT;
    if (!YT) return;

    if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
      pushState(event.data === YT.PlayerState.PLAYING);
    }
  }

  function pushState(isPlaying) {
    if (!currentVideoIdRef.current || !playerRef.current) return;
    setVideoState(coupleId, myUid, {
      videoId: currentVideoIdRef.current,
      isPlaying,
      currentTime: playerRef.current.getCurrentTime?.() || 0,
    });
  }

  // 재생 중일 때 주기적으로 시간을 맞춰서(가끔 생기는 오차 보정) 전송
  useEffect(() => {
    const interval = setInterval(() => {
      if (applyingRemoteRef.current) return;
      const YT = window.YT;
      if (!YT || !playerRef.current?.getPlayerState) return;
      if (playerRef.current.getPlayerState() === YT.PlayerState.PLAYING) {
        pushState(true);
      }
    }, PERIODIC_SYNC_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLoadVideo(e) {
    e.preventDefault();
    const id = extractVideoId(input);
    if (!id) {
      setError('올바른 유튜브 링크 또는 영상 ID를 입력해주세요.');
      return;
    }
    setError('');
    currentVideoIdRef.current = id;
    setVideoId(id);
    playerRef.current?.loadVideoById?.(id, 0);
    setVideoState(coupleId, myUid, { videoId: id, isPlaying: true, currentTime: 0 });
    setInput('');
  }

  return (
    <div className="watch-together">
      <form className="watch-form" onSubmit={handleLoadVideo}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="유튜브 링크를 붙여넣으세요"
        />
        <button type="submit">불러오기</button>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="watch-player">
        <div ref={playerElRef} />
        {!videoId && <div className="watch-placeholder">영상을 불러와주세요</div>}
      </div>
    </div>
  );
}
