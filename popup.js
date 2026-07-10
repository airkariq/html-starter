'use strict';

function showErr(msg) {
  const e = document.getElementById('err');
  e.textContent = msg;
  e.style.display = 'block';
}

async function start(mode) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) { showErr('활성 탭을 찾을 수 없습니다.'); return; }

  const url = tab.url || '';
  if (/^(chrome|edge|about|chrome-extension|https:\/\/chrome\.google\.com\/webstore|https:\/\/chromewebstore\.google\.com)/.test(url)) {
    showErr('이 페이지에서는 사용할 수 없습니다. 일반 웹페이지에서 사용하세요.');
    return;
  }

  try {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['selector.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'TG_START', mode });
    window.close();
  } catch (e) {
    showErr('이 페이지에서 시작할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도하세요.');
  }
}

document.getElementById('btnRegion').addEventListener('click', () => start('region'));
document.getElementById('btnElement').addEventListener('click', () => start('element'));
