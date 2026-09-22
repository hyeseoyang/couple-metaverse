import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Phaser from 'phaser';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { useAuth } from '../firebase/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import MainScene from '../game/MainScene';

export default function CoupleRoom() {
    const { user, profile } = useAuth();
    const gameRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        let game;
        let destroyed = false;

        async function setupGame() {
            // 커플 문서에서 상대방 uid 찾기
            const coupleSnap = await getDoc(doc(db, 'couples', profile.coupleId));
            if (!coupleSnap.exists() || destroyed) return;
            const partnerUid = coupleSnap
                .data()
                .members.find((uid) => uid !== user.uid);

            // 상대방의 아바타 색상 가져오기 (내 색상은 profile에 이미 있음)
            const partnerSnap = await getDoc(doc(db, 'users', partnerUid));
            const partnerColor = partnerSnap.exists()
                ? partnerSnap.data().avatarColor
                : '#ff6fa5';

            if (destroyed) return;

            game = new Phaser.Game({
                type: Phaser.AUTO,
                width: 800,
                height: 600,
                parent: containerRef.current,
                backgroundColor: '#f3ead6',
                physics: {
                    default: 'arcade',
                    arcade: { debug: false },
                },
                scene: [MainScene],
            });

            game.scene.start('MainScene', {
                coupleId: profile.coupleId,
                myUid: user.uid,
                partnerUid,
                myColor: profile.avatarColor || '#4f8cff',
                partnerColor,
            });

            gameRef.current = game;
        }

        if (profile?.coupleId) setupGame();

        return () => {
            destroyed = true;
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [profile?.coupleId, user?.uid]);

    return (
        <div className="couple-room-page">
            <header>
                <h1>우리 방</h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Link to="/avatar">🎨 아바타 꾸미기</Link>
                    <button onClick={() => signOut(auth)}>로그아웃</button>
                </div>
            </header>
            <p className="hint">방향키 또는 WASD로 이동하세요</p>
            <div ref={containerRef} className="game-container" />
        </div>
    );
}
