'use strict';
const VAPID_PUBLIC_KEY = 'BKRcCt73LtT3UqdX6_OpKD6ENbFwakXlTeRI0_fdruxYQUlb7khb0a9BJyepyW3uAdbb-61Ri0RSkZwIkW9kmAs';

function setStatus(msg, ok) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status' + (ok ? ' ok' : '');
}
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    setStatus('이 브라우저는 웹 푸시를 지원하지 않습니다.'); return;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { setStatus('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.'); return; }
    const reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
    if (res.ok) setStatus('✅ 알림 구독 완료! 이제 이 기기로 알림을 받을 수 있습니다.', true);
    else setStatus('구독 저장에 실패했습니다 (HTTP ' + res.status + ').');
  } catch (e) {
    setStatus('오류가 발생했습니다: ' + e.message);
  }
}
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function(){}); }
document.getElementById('btnEnable').addEventListener('click', enablePush);
