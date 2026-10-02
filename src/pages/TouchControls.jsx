import { useEffect, useState } from 'react';

// 터치가 주 입력 수단인 기기(폰/태블릿)에서만 버튼을 보여준다
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);
  return isTouch;
}

export default function TouchControls({ gameRef }) {
  const isTouch = useIsTouchDevice();
  if (!isTouch) return null;

  function setDirection(dir, value) {
    const game = gameRef.current;
    if (!game) return;
    const virtual = game.registry.get('virtualInput') || {
      left: false,
      right: false,
      up: false,
      down: false,
    };
    virtual[dir] = value;
    game.registry.set('virtualInput', virtual);
  }

  // 각 버튼: 누르는 동안 true, 떼거나 손가락이 벗어나면 false
  const bind = (dir) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      setDirection(dir, true);
    },
    onPointerUp: () => setDirection(dir, false),
    onPointerLeave: () => setDirection(dir, false),
    onPointerCancel: () => setDirection(dir, false),
  });

  return (
    <div className="touch-controls">
      <div className="touch-row">
        <button className="touch-btn" {...bind('up')}>
          ▲
        </button>
      </div>
      <div className="touch-row">
        <button className="touch-btn" {...bind('left')}>
          ◀
        </button>
        <button className="touch-btn" {...bind('down')}>
          ▼
        </button>
        <button className="touch-btn" {...bind('right')}>
          ▶
        </button>
      </div>
    </div>
  );
}
