import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../firebase/AuthContext';
import { AVATAR_PALETTE } from '../firebase/couple';

const SPRITE_SRC = '/assets/avatar.png';
const FRAME = 32; // 스프라이트 한 프레임 크기
const PREVIEW_SCALE = 4;

export default function AvatarEditor() {
    const { profile } = useAuth();
    const [color, setColor] = useState(profile?.avatarColor || AVATAR_PALETTE[0]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const canvasRef = useRef(null);
    const imgRef = useRef(null);

    // 스프라이트 이미지는 한 번만 로드
    useEffect(() => {
        const img = new Image();
        img.src = SPRITE_SRC;
        img.onload = () => {
            imgRef.current = img;
            drawPreview(color);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 색이 바뀔 때마다 미리보기 다시 그리기
    useEffect(() => {
        drawPreview(color);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [color]);

    function drawPreview(hex) {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;
        const ctx = canvas.getContext('2d');
        canvas.width = FRAME * PREVIEW_SCALE;
        canvas.height = FRAME * PREVIEW_SCALE;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 스프라이트시트에서 "아래를 보는 정지 프레임"(0번, 왼쪽 위)만 잘라서 확대 표시
        ctx.drawImage(img, 0, 0, FRAME, FRAME, 0, 0, canvas.width, canvas.height);

        // Phaser의 setTint와 비슷하게 흰색 영역을 선택한 색으로 곱연산(multiply) 처리
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = hex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 곱연산으로 사라진 투명 영역을 원본 알파로 다시 복원
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(img, 0, 0, FRAME, FRAME, 0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'source-over';
    }

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                avatarColor: color,
            });
            setSaved(true);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="matching-page">
            <h1>내 아바타 꾸미기</h1>

            <canvas ref={canvasRef} className="avatar-preview" />

            <div className="palette">
                {AVATAR_PALETTE.map((hex) => (
                    <button
                        key={hex}
                        type="button"
                        className={`swatch ${color === hex ? 'selected' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => setColor(hex)}
                        aria-label={hex}
                    />
                ))}
            </div>

            <button onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : '저장하기'}
            </button>
            {saved && <p className="copied-hint">저장됐어요!</p>}

            <p style={{ marginTop: 20 }}>
                <Link to="/">← 돌아가기</Link>
            </p>
        </div>
    );
}
