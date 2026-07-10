'use strict';

// 중복 주입 방지
if (!window.__tgLoaded) {
  window.__tgLoaded = true;

  const NS = '__tg_';
  let mode = 'region';
  let active = false;
  let overlay = null, hint = null, selBox = null, dragStart = null, curEl = null, panel = null;

  function el(tag, cls, css) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    return n;
  }
  function hintEl(t) {
    const h = el('div', NS + 'hint');
    h.textContent = t;
    document.documentElement.appendChild(h);
    return h;
  }

  function teardownSelect() {
    [overlay, hint, selBox].forEach((n) => { if (n && n.parentNode) n.parentNode.removeChild(n); });
    overlay = hint = selBox = dragStart = curEl = null;
    document.removeEventListener('mousemove', onMoveEl, true);
    document.removeEventListener('click', onClickEl, true);
    document.removeEventListener('mousedown', onDown, true);
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseup', onUp, true);
    active = false;
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); if (panel) closePanel(); else { teardownSelect(); document.removeEventListener('keydown', onKey, true); } }
  }

  // ── 요소 모드 ──
  function onMoveEl(e) {
    const t = document.elementFromPoint(e.clientX, e.clientY);
    if (!t || t === curEl || t === overlay || t === hint) return;
    curEl = t;
    const r = t.getBoundingClientRect();
    Object.assign(overlay.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }
  function onClickEl(e) {
    if (!curEl) return;
    e.preventDefault(); e.stopPropagation();
    const text = (curEl.innerText || curEl.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    teardownSelect();
    showResult(text);
  }

  // ── 영역 모드 ──
  function onDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart = { x: e.clientX, y: e.clientY };
    Object.assign(selBox.style, { display: 'block', left: e.clientX + 'px', top: e.clientY + 'px', width: '0px', height: '0px' });
  }
  function onMove(e) {
    if (!dragStart) return;
    const x = Math.min(e.clientX, dragStart.x), y = Math.min(e.clientY, dragStart.y);
    const w = Math.abs(e.clientX - dragStart.x), h = Math.abs(e.clientY - dragStart.y);
    Object.assign(selBox.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  }
  function onUp(e) {
    if (!dragStart) return;
    const x = Math.min(e.clientX, dragStart.x), y = Math.min(e.clientY, dragStart.y);
    const w = Math.abs(e.clientX - dragStart.x), h = Math.abs(e.clientY - dragStart.y);
    dragStart = null;
    if (w < 4 || h < 4) { teardownSelect(); document.removeEventListener('keydown', onKey, true); return; }
    const rect = { left: x, top: y, right: x + w, bottom: y + h };
    teardownSelect();               // 우리 UI 먼저 제거 후 추출 (자기 텍스트 배제)
    const text = extractTextInRect(rect);
    showResult(text);
  }

  function intersects(a, r) {
    return !(a.right < r.left || a.left > r.right || a.bottom < r.top || a.top > r.bottom);
  }

  function extractTextInRect(rect) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const items = [];
    let node;
    while ((node = walker.nextNode())) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = range.getClientRects();
      let best = null;
      for (const rc of rects) { if (intersects(rc, rect)) { best = rc; break; } }
      if (best) items.push({ text: node.nodeValue.replace(/\s+/g, ' ').trim(), top: Math.round(best.top), left: Math.round(best.left) });
    }
    items.sort((a, b) => (a.top - b.top) || (a.left - b.left));
    let out = '', lastTop = null;
    for (const it of items) {
      if (lastTop === null) out = it.text;
      else if (Math.abs(it.top - lastTop) <= 6) out += ' ' + it.text;
      else out += '\n' + it.text;
      lastTop = it.top;
    }
    return out.trim();
  }

  // ── 결과 패널 ──
  function showResult(text) {
    if (panel) closePanel();
    text = text || '';
    panel = el('div', NS + 'panel');

    const head = el('div', NS + 'phead');
    const title = el('div', NS + 'ptitle'); title.textContent = '추출된 텍스트';
    const count = el('div', NS + 'pcount'); count.textContent = text.length + '자';
    head.appendChild(title); head.appendChild(count);

    const ta = el('textarea', NS + 'pta');
    ta.value = text; ta.spellcheck = false;
    ta.addEventListener('input', () => { count.textContent = ta.value.length + '자'; });

    const row = el('div', NS + 'prow');
    const bCopy = el('button', NS + 'pbtn ' + NS + 'pprimary'); bCopy.textContent = '📋 복사';
    const bSave = el('button', NS + 'pbtn'); bSave.textContent = '⬇ TXT 저장';
    const bClose = el('button', NS + 'pbtn'); bClose.textContent = '닫기';
    bCopy.addEventListener('click', () => copyText(ta.value, bCopy));
    bSave.addEventListener('click', () => saveTxt(ta.value));
    bClose.addEventListener('click', closePanel);
    row.appendChild(bCopy); row.appendChild(bSave); row.appendChild(bClose);

    panel.appendChild(head);
    if (!text) {
      const empty = el('div', NS + 'pempty');
      empty.textContent = '이 영역에서 추출된 텍스트가 없습니다. (이미지 속 글자는 이 도구로 추출되지 않습니다)';
      panel.appendChild(empty);
    }
    panel.appendChild(ta);
    panel.appendChild(row);
    document.documentElement.appendChild(panel);
    document.addEventListener('keydown', onKey, true);
    ta.focus(); ta.select();
  }
  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    document.removeEventListener('keydown', onKey, true);
  }

  function copyText(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = '✓ 복사됨'; setTimeout(() => { btn.textContent = o; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fb(text, done));
    else fb(text, done);
  }
  function fb(text, done) {
    const t = el('textarea', '', 'position:fixed;opacity:0;');
    t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(t);
  }
  function saveTxt(text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = el('a'); a.href = URL.createObjectURL(blob);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const base = (document.title || 'text').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 40) || 'text';
    a.download = base + '_' + ts + '.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  function begin(m) {
    if (active) teardownSelect();
    if (panel) closePanel();
    active = true; mode = m;
    document.addEventListener('keydown', onKey, true);
    if (mode === 'element') {
      overlay = el('div', NS + 'hl', 'display:none');
      document.documentElement.appendChild(overlay);
      hint = hintEl('텍스트를 추출할 요소에 마우스를 올리고 클릭 · ESC 취소');
      document.addEventListener('mousemove', onMoveEl, true);
      document.addEventListener('click', onClickEl, true);
    } else {
      overlay = el('div', NS + 'dim');
      document.documentElement.appendChild(overlay);
      selBox = el('div', NS + 'sel', 'display:none');
      document.documentElement.appendChild(selBox);
      hint = hintEl('텍스트를 추출할 영역을 드래그 · ESC 취소');
      document.addEventListener('mousedown', onDown, true);
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'TG_START') begin(msg.mode);
  });
}
