import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import { AuthProvider, useAuth } from './firebase/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Matching from './pages/Matching';
import AvatarEditor from './pages/AvatarEditor';
import CoupleRoom from './pages/CoupleRoom';

function StuckScreen({ message }) {
    // 프로필 문서가 없거나(가입 중 에러 등) 계속 불러오는 중일 때,
    // 사용자가 빠져나갈 수 있도록 로그아웃 버튼을 항상 함께 보여준다.
    return (
        <div className="center-message" style={{ flexDirection: 'column', gap: 12 }}>
            <p>{message}</p>
            <button onClick={() => signOut(auth)}>로그아웃하고 다시 시도</button>
        </div>
    );
}

function Gate() {
    const { user, profile, loading } = useAuth();

    if (loading) return <StuckScreen message="불러오는 중..." />;

    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    // 로그인은 했지만 프로필 문서가 아직 생성 전 (드문 경우, 잠깐 대기)
    if (!profile) return <StuckScreen message="준비 중... (계속 이 화면이면 아래 버튼으로 로그아웃 후 다시 가입해보세요)" />;

    // 아직 커플로 연결되지 않은 경우 → 매칭 화면 (+ 아바타 꾸미기)
    if (!profile.coupleId) {
        return (
            <Routes>
                <Route path="/avatar" element={<AvatarEditor />} />
                <Route path="*" element={<Matching />} />
            </Routes>
        );
    }

    // 커플 연결 완료 → 메타버스 방으로 (아바타 꾸미기도 계속 접근 가능)
    return (
        <Routes>
            <Route path="/avatar" element={<AvatarEditor />} />
            <Route path="*" element={<CoupleRoom />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Gate />
            </AuthProvider>
        </BrowserRouter>
    );
}
