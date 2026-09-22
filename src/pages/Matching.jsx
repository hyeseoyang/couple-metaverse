import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../firebase/AuthContext';
import { joinCoupleWithCode } from '../firebase/couple';

export default function Matching() {
    const { profile } = useAuth();
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(profile.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await joinCoupleWithCode(auth.currentUser.uid, inputCode);
            // coupleId가 생기면 AuthContext의 실시간 구독이 감지 →
            // App.jsx의 라우팅 로직이 자동으로 CoupleRoom으로 전환해줌
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="matching-page">
            <h1>커플 연결하기</h1>

            <p style={{ marginBottom: 20 }}>
                <Link to="/avatar">🎨 내 아바타 꾸미기</Link>
            </p>

            <section className="my-code">
                <p>내 초대코드를 상대방에게 공유하세요</p>
                <div className="code-box" onClick={handleCopy}>
                    {profile?.inviteCode || '...'}
                </div>
                {copied && <span className="copied-hint">복사됨!</span>}
            </section>

            <section className="join-code">
                <p>또는 상대방의 초대코드를 입력하세요</p>
                <form onSubmit={handleJoin}>
                    <input
                        type="text"
                        placeholder="예: A3F9K2"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        maxLength={6}
                        required
                    />
                    {error && <p className="error">{error}</p>}
                    <button type="submit" disabled={loading}>
                        {loading ? '연결 중...' : '연결하기'}
                    </button>
                </form>
            </section>

            <button className="logout" onClick={() => signOut(auth)}>
                로그아웃
            </button>
        </div>
    );
}
