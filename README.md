# 커플 메타버스 (1단계: 로그인 + 커플 매칭 + 기본 아바타 이동)

## 1. Firebase 프로젝트 준비
1. https://console.firebase.google.com 에서 프로젝트 생성
2. **Authentication** → 로그인 방법에서 "이메일/비밀번호" 활성화
3. **Firestore Database** 생성 (테스트 모드로 시작 가능)
4. 프로젝트 설정 → "내 앱" → 웹 앱 추가 → SDK 설정 값 복사

## 2. 로컬 설정
```bash
npm install
cp .env.example .env
# .env 파일에 Firebase 콘솔에서 복사한 값 붙여넣기
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 3. 동작 흐름
1. 회원가입 → 자동으로 6자리 초대코드 생성 (Firestore `users/{uid}`, `inviteCodes/{code}`)
2. 매칭 화면에서 내 코드를 상대에게 공유하거나, 상대 코드 입력
3. 코드 입력 시 `couples/{coupleId}` 문서 생성 + 양쪽 `users` 문서에 `coupleId` 기록
4. 두 사람 다 `coupleId`가 생기면 자동으로 "우리 방"(Phaser 게임 화면)으로 전환
5. 방향키/WASD로 내 아바타(파란 원) 이동 → 위치가 100ms 간격으로 Firestore에 저장
6. 상대방 화면에서는 분홍 원이 실시간으로 같은 위치를 따라 움직임

## 4. Firestore 보안 규칙 (테스트 모드 이후 꼭 설정)
콘솔의 Firestore → 규칙 탭에 아래 내용을 참고해 작성하세요 (그대로 복사해도 되지만, 프로젝트가 커지면 다시 검토 필요):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /inviteCodes/{code} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow delete: if request.auth != null;
    }
    match /couples/{coupleId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
    }
    match /couples/{coupleId}/positions/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 5. 다음 단계 (2개월차 예정)
- [ ] 아바타를 원 대신 스프라이트 이미지로 교체 + 옷/외형 커스터마이징
- [ ] 방 꾸미기: 가구 오브젝트를 Firestore에 저장하고 배치
- [ ] 사진 업로드 (Firebase Storage) 후 방 안에 액자로 전시
- [ ] 텍스트 채팅 (Firestore 실시간 구독)
- [ ] (여유 있으면) 유튜브 동시 시청, 음성 채팅

## 6. 3개월차 예정
- [ ] AI 데이트 코스 추천 (OpenAI API 연동)
- [ ] Vercel 배포
- [ ] 데모 영상/스크린샷 정리한 포트폴리오용 README 보강
