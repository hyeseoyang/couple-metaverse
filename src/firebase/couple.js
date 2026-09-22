import {
    doc,
    setDoc,
    getDoc,
    deleteDoc,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

// 아바타 커스터마이징에서 고를 수 있는 색상 팔레트
export const AVATAR_PALETTE = [
    '#4f8cff', // 파랑
    '#ff6fa5', // 핑크
    '#5ac97e', // 초록
    '#b06fff', // 보라
    '#ffb84f', // 주황
    '#4fd4d4', // 청록
    '#ff6f6f', // 빨강
    '#8a8a8a', // 회색
];

// 6자리 대문자+숫자 초대코드 생성 (예: A3F9K2)
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0/O, 1/I 제외
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// 회원가입 직후 호출: users/{uid} 문서 + 고유 초대코드 생성
export async function createUserProfile(uid, email) {
    let code = generateInviteCode();

    // 아주 낮은 확률의 코드 중복을 피하기 위해 최대 5번 재시도
    for (let attempt = 0; attempt < 5; attempt++) {
        const codeRef = doc(db, 'inviteCodes', code);
        const codeSnap = await getDoc(codeRef);
        if (!codeSnap.exists()) break;
        code = generateInviteCode();
    }

    const defaultColor =
        AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];

    await setDoc(doc(db, 'users', uid), {
        email,
        inviteCode: code,
        coupleId: null,
        avatarColor: defaultColor,
        createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'inviteCodes', code), { uid });

    return code;
}

// 상대방의 초대코드를 입력해 커플로 연결
export async function joinCoupleWithCode(myUid, inputCode) {
    const code = inputCode.trim().toUpperCase();
    const codeRef = doc(db, 'inviteCodes', code);

    return runTransaction(db, async (transaction) => {
        const codeSnap = await transaction.get(codeRef);
        if (!codeSnap.exists()) {
            throw new Error('존재하지 않는 초대코드입니다.');
        }

        const partnerUid = codeSnap.data().uid;
        if (partnerUid === myUid) {
            throw new Error('본인의 초대코드는 사용할 수 없습니다.');
        }

        const myRef = doc(db, 'users', myUid);
        const partnerRef = doc(db, 'users', partnerUid);
        const mySnap = await transaction.get(myRef);
        const partnerSnap = await transaction.get(partnerRef);

        if (mySnap.data()?.coupleId) {
            throw new Error('이미 커플로 연결되어 있습니다.');
        }
        if (partnerSnap.data()?.coupleId) {
            throw new Error('상대방은 이미 다른 사람과 연결되어 있습니다.');
        }

        const coupleRef = doc(db, 'couples', `${partnerUid}_${myUid}`);
        transaction.set(coupleRef, {
            members: [partnerUid, myUid],
            createdAt: serverTimestamp(),
        });

        transaction.update(myRef, { coupleId: coupleRef.id });
        transaction.update(partnerRef, { coupleId: coupleRef.id });

        return coupleRef.id;
    }).then(async (coupleId) => {
        // 트랜잭션 밖에서 사용된 초대코드 삭제 (재사용 방지)
        await deleteDoc(codeRef);
        return coupleId;
    });
}
