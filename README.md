# 나의 알림 — 나만의 웹푸시 앱

DataForge 푸시 빌더로 생성된 프로젝트입니다. 텔레그램 없이, 앱을 닫아도 웹 푸시 알림을 받습니다.

## 구성
- index.html / app.js / sw.js / style.css / manifest.json / icon-*.png — 수신 PWA (정적)
- api/subscribe.js — 브라우저 구독 정보를 Firestore에 저장 (서버리스)
- api/send.js — Firestore의 구독들에게 웹 푸시 발송 (서버리스, VAPID)

## 배포 순서
1. Firebase 프로젝트 생성 → Firestore Database 만들기(프로덕션 모드, 규칙은 기본 잠금 그대로).
   프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" → JSON 다운로드.
2. 이 폴더를 GitHub에 올리고 Vercel에서 Import → Deploy.
3. Vercel > Settings > Environment Variables 에 5개 등록:
   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, APP_KEY (빌더 "환경변수" 탭 값)
   FIREBASE_SERVICE_ACCOUNT (위 JSON을 한 줄로)
4. Redeploy.
5. 폰에서 배포 주소 접속 → (아이폰은) 홈 화면에 추가 → 열고 "알림 켜기".

## 다른 앱에서 알림 보내기
POST https://<배포주소>/api/send
  헤더: x-app-key: <APP_KEY>
  본문(JSON): { "title": "제목", "body": "내용", "url": "/" }

DataForge · https://dataforge.ai.kr/builder/push
