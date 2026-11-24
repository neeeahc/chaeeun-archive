/* W05-B 워드마크형 · sig.js v2.1 — 무의존 classic script (file:// 더블클릭으로도 동작)
   레퍼런스 Paul Kalkbrenner 의 동작을 옮긴다. 타이밍 출처는 EXTRACTION.md §3.
   1) my-style.css 의 --my-* 를 읽어 <html> 클래스와 색 면 토큰을 만든다 (학생은 CSS 한 파일만 고친다)
   2) 이름을 둘로 갈라 사이에 이미지 칸을 끼운다 → 폰트 로드 후 실제 폭을 재서 크기를 맞춘다(긴 이름은 두 줄 계단)
   3) 인트로: 화면을 덮은 사진이 1.4초 동안 이름 사이 칸으로 줄어들고, 이름 두 쪽이 양옆에서 모인다(총 3초)
   4) 칸 속 사진은 1초마다 통째로 바뀐다(사진 2장 이상일 때. 1장이면 고정, 0장이면 포인트 색 면 하나)
   5) 내 한 문장은 격자선 위에 어절 계단으로 놓이고, 스크롤에 따라 옆으로 흐른다(스크롤을 가로채지 않는다)
   6) 이유 표(투어 일정 표): 행 등장·호버·사진 시차 / 7) 근거 사진 갤러리 스택: 스크롤하면 한 장씩(sticky, 가로채지 않음)
   ※ 원 사이트의 픽셀 디졸브 전환(섹션 끝 네모 조각)과 사진을 확대 조각으로 쪼개는 표현은 교수 지시로 넣지 않는다.
     색 면은 섹션 경계에서 그냥 바뀐다(원 사이트의 투어·영상 아카이브 경계와 같은 방식). */
(function () {
  var R = document.documentElement;
  var CS = getComputedStyle(R);
  function my(k, d) { var v = CS.getPropertyValue(k).trim().replace(/["']/g, ''); return v || d; }
  function pick(v, list, d) { return list.indexOf(v) > -1 ? v : d; }
  var TYPE = pick(my('--my-type', 'sans'), ['sans', 'serif', 'mono', 'hand'], 'sans');
  var MOTION = +pick(my('--my-motion', '1'), ['0', '1', '2'], '1');
  var DENS = +pick(my('--my-density', '1'), ['0', '1', '2'], '1');
  var IMG = pick(my('--my-image', 'native'), ['native', 'original', 'mono', 'tint'], 'native');
  var SPLIT = my('--kb-split', 'auto');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) MOTION = 0;
  R.classList.add('js', 't-' + TYPE, 'm' + MOTION, 'd' + DENS, 'i-' + IMG);
  if (MOTION > 0) R.classList.add('kb-pre');

  /* ── 색 면: --my-bg · --my-point 에서 다섯 면을 만든다 (레퍼런스: 흰 · 회색 · 연두 · 검정 · 주황) ── */
  var cvs = document.createElement('canvas').getContext('2d');
  function rgb(s) {
    if (!s || s === 'none') return null;
    cvs.fillStyle = '#010203'; cvs.fillStyle = s;
    var f = cvs.fillStyle;
    if (f === '#010203' && s.toLowerCase() !== '#010203') return null;
    if (f[0] === '#') return [parseInt(f.substr(1, 2), 16), parseInt(f.substr(3, 2), 16), parseInt(f.substr(5, 2), 16)];
    var m = f.match(/[\d.]+/g); return m ? [+m[0], +m[1], +m[2]] : null;
  }
  function mix(a, b, t) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }); }
  function lum(c) { return c.map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce(function (s, v, i) { return s + v * [.2126, .7152, .0722][i]; }, 0); }
  function con(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function css(c) { return 'rgb(' + c.join(',') + ')'; }
  var WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  var BG = rgb(my('--my-bg', '#FFFFFF')) || WHITE;
  var PT = rgb(my('--my-point', 'none'));
  var light = lum(BG) > .4;
  var INK = light ? BLACK : mix(BG, WHITE, .92);
  var P = { bg: BG, ink: INK, mid: mix(BG, INK, .227) };
  if (PT) {
    P.point = PT;
    P.soft = lum(PT) > .55 ? mix(PT, BLACK, .12) : mix(PT, WHITE, .45);
  } else {
    P.soft = mix(BG, INK, .1);
    P.point = mix(BG, INK, .45);
  }
  /* 인접 면 겹침 방지: 순서 bg → mid → soft → ink → point → bg. 대비 1.3 미만이고 RGB 거리 70 미만이면 파생 면을 옮긴다 */
  function far(a, b) { var d = Math.sqrt(a.reduce(function (s, v, i) { return s + (v - b[i]) * (v - b[i]); }, 0)); return con(a, b) >= 1.3 || d >= 70; }
  var ADJ = [];
  if (!far(P.ink, P.point) || !far(P.ink, P.soft)) {       /* 짙은 바탕 + 밝은 포인트: 뒤집힌 먹이 포인트와 겹친다 → 먹을 바탕보다 짙게 */
    P.ink = light ? mix(BG, BLACK, .9) : mix(BG, BLACK, .55); ADJ.push('면 겹침 보정: 먹 면 → 바탕보다 짙게');
  }
  if (!far(P.soft, P.mid) || !far(P.soft, P.ink) || !far(P.soft, P.point)) {
    var alt = [mix(P.point, BG, .5), mix(P.point, BLACK, .3), mix(P.point, WHITE, .7)];
    for (var ai = 0; ai < alt.length; ai++) if (far(alt[ai], P.mid) && far(alt[ai], P.ink) && far(alt[ai], P.point)) { P.soft = alt[ai]; break; }
    ADJ.push('면 겹침 보정: 옅은 면 → 다른 섞음');
  }
  if (!far(P.point, P.bg)) ADJ.push('면 겹침: 포인트 면과 바탕(출처 면)이 비슷합니다 — 포인트 색을 바꿀 수 있습니다');
  if (ADJ.length) { R.setAttribute('data-kb-report', ADJ.join(' / ')); if (window.console) console.info('W05-B 보고: ' + ADJ.join(' / ')); }
  function onColor(c, pref) {
    var list = pref.concat([BLACK, WHITE]), best = list[0];
    for (var i = 0; i < list.length; i++) { if (con(c, list[i]) >= 4.5) return list[i]; if (con(c, list[i]) > con(c, best)) best = list[i]; }
    return best;
  }
  function dimColor(on, plane) { // 흐린 글자: 62%에서 시작해 대비 4.5:1 이 될 때까지 진하게
    for (var t = .38; t >= 0; t -= .04) { var d = mix(on, plane, t); if (con(d, plane) >= 4.5) return d; }
    return on;
  }
  var ON = {
    bg: onColor(P.bg, [INK]), mid: onColor(P.mid, [INK, BG]), soft: onColor(P.soft, [INK, BG]),
    ink: onColor(P.ink, [BG]), point: onColor(P.point, [INK, BG])
  };
  Object.keys(P).forEach(function (k) {
    R.style.setProperty('--kb-' + k, css(P[k]));
    R.style.setProperty('--kb-on-' + k, css(ON[k]));
    R.style.setProperty('--kb-dim-' + k, css(dimColor(ON[k], P[k])));
  });
  R.style.setProperty('--kb-tint', css(PT || P.mid));
  var dimCss = document.createElement('style');
  dimCss.textContent = ['bg', 'mid', 'soft', 'ink', 'point'].map(function (k) { return '[data-plane="' + k + '"]{--kb-dim:var(--kb-dim-' + k + ')}'; }).join('') + '.kb-nav{--kb-dim:var(--kb-dim-bg)}';
  document.head.appendChild(dimCss);

  /* ── 공용 ── */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var EASE = 'cubic-bezier(.625,.05,0,1)';

  var NAME = '', wm, slot, hold, wa, wb, pieces = [], canTwo = false;
  var grid = null;

  /* ── 이름 가르기: 띄어쓰기 자리 > 성 뒤 (2·3글자 → 1글자 뒤, 4글자 → 2글자 뒤, 5글자+ → 가운데) ── */
  function splitName(name) {
    var ch = Array.from(name), i;
    if (/^\d+$/.test(SPLIT)) {
      var n = +SPLIT, seen = 0;
      for (i = 0; i < ch.length && seen < n; i++) if (ch[i] !== ' ') seen++;
      return { a: ch.slice(0, i).join('').trim(), b: ch.slice(i).join('').trim(), space: false };
    }
    var sp = name.indexOf(' ');
    if (sp > 0) return { a: name.slice(0, sp), b: name.slice(sp + 1).trim(), space: true };
    var n2 = ch.length;
    i = /[가-힣]/.test(name) ? (n2 <= 3 ? 1 : n2 === 4 ? 2 : Math.floor(n2 / 2)) : Math.max(1, Math.floor(n2 / 2));
    return { a: ch.slice(0, i).join(''), b: ch.slice(i).join(''), space: false };
  }

  function buildName() {
    wm = $('.kb-wm'); if (!wm) return;
    NAME = wm.textContent.replace(/\s+/g, ' ').trim();
    var s = splitName(NAME);
    canTwo = s.space;
    wm.setAttribute('aria-label', NAME);
    wm.innerHTML = '<span class="kb-wm-in" aria-hidden="true"><span class="kb-wm-a">' + esc(s.a) + '</span><span class="kb-line2">' +
      '<span class="kb-slot"><span class="kb-hold"></span></span><span class="kb-wm-b">' + esc(s.b) + '</span></span></span>';
    slot = $('.kb-slot', wm); hold = $('.kb-hold', wm); wa = $('.kb-wm-a', wm); wb = $('.kb-wm-b', wm);
    /* 칸 속 사진: 이유 사진을 통째로 순환(레퍼런스 data-image-cycle — 로더 사진 6장을 통째로 교체). 0장이면 포인트 면 하나 */
    var heroSrc = $$('.kb-hero-src img');  /* [커스텀] 첫 화면 전용 사진이 있으면 그걸 쓴다 */
    var imgs = (heroSrc.length ? heroSrc : $$('.kb-card img')).map(function (i) { return i.getAttribute('src'); });
    if (!imgs.length) imgs = [null];
    imgs.forEach(function (src, i) {
      var d = el('span', 'kb-piece');
      d.setAttribute('data-s', i === 0 ? 'active' : 'not');
      if (src) d.innerHTML = '<img src="' + esc(src) + '" alt="">';
      else d.classList.add('kb-piece--plane');
      hold.appendChild(d);
    });
    pieces = $$('.kb-piece', hold);
  }

  function buildParts() {
    /* 표시(동그라미): 영문 이름 머리글자, 없으면 한글 첫 글자 */
    var en = $('.kb-en'), ini = '';
    if (en && en.textContent.trim()) ini = en.textContent.trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
    else ini = Array.from(NAME)[0] || '';
    /* 출처 끝줄: 표시 + 제목(이름 — 주제명, 기계 규칙) */
    var src = $('.kb-src');
    if (src && !$('.kb-src-end', src)) {
      var end = el('div', 'kb-src-end');
      end.innerHTML = '<span class="kb-mark" aria-hidden="true"></span><span>' + esc(document.title) + '</span>';
      src.appendChild(end);
    }
    $$('.kb-mark').forEach(function (m) { m.textContent = ini; });
    /* 이퀄라이저 막대 7개 */
    $$('.kb-eq').forEach(function (q) { for (var i = 0; i < 7; i++) q.appendChild(el('i')); });
    /* 투어 표 오른쪽 위 1:1 사진 — 첫 근거 사진을 복제(장식, 읽기 도구는 건너뜀). 사진이 없으면 두지 않는다 */
    var tour = $('.kb-tour'), first = $('.kb-card img, .kb-fig img');
    if (tour && first && !$('.kb-tour-fig', tour)) {
      var tf = el('figure', 'kb-tour-fig'); tf.setAttribute('aria-hidden', 'true');
      tf.innerHTML = '<img src="' + esc(first.getAttribute('src')) + '" alt="">';
      tour.insertBefore(tf, $('.kb-table', tour));
    }
    $$('.kb-rows .kb-row').forEach(function (r, i) { r.style.setProperty('--r', i); });
    /* 상단 바 글자 굴림용 쪼개기 */
    function chars(a) {
      var t = a.textContent.trim(); if (!t) return;
      var host = a.closest('a,button'); if (host && host !== a && !host.getAttribute('aria-label')) host.setAttribute('aria-label', host.textContent.replace(/\s+/g, ' ').trim());
      if (a.matches('a,button')) a.setAttribute('aria-label', t);
      a.innerHTML = Array.from(t).map(function (c, i) { return '<span class="kb-ch" aria-hidden="true" style="--i:' + i + '">' + esc(c) + '</span>'; }).join('');
    }
    $$('.kb-links a, .kb-cta > span').forEach(chars);
    /* 행의 근거 라벨은 굴림 대상이지만 행 전체가 링크라 aria-label 을 행 텍스트로 둔다 */
    $$('.kb-ev').forEach(function (e) {
      var t = e.textContent.trim();
      e.innerHTML = Array.from(t).map(function (c, i) { return '<span class="kb-ch" style="--i:' + i + '">' + esc(c) + '</span>'; }).join('');
    });
    var menu = $('.kb-menu');
    if (menu) menu.addEventListener('click', function () {
      var o = R.classList.toggle('kb-open'); menu.setAttribute('aria-expanded', o ? 'true' : 'false');
      menu.setAttribute('aria-label', o ? '메뉴 닫기' : '메뉴 열기');
    });
    $$('.kb-links a').forEach(function (a) { a.addEventListener('click', function () { R.classList.remove('kb-open'); if (menu) menu.setAttribute('aria-expanded', 'false'); }); });
    /* 격자 문장이 켜지면 원문 문단은 화면에서만 숨긴다(읽기 도구는 원문을 읽는다) */
    if ($('.kb-say')) R.classList.add('kb-grid-on');
  }

  /* ── 이름 맞춤: 폰트 로드 후 실제 폭을 잰다 ── */
  function fitName() {
    if (!wm) return;
    var hero = wm.closest('.kb-hero'), vw = R.clientWidth, vh = window.innerHeight;
    var u = parseFloat(getComputedStyle(document.body).fontSize);
    var pad = u * .625, W = hero.clientWidth - pad * 2;
    var mob = vw < 768;
    var ref = u * (mob ? 3 : vw < 992 ? 10 : 12.5);                  /* 레퍼런스 .h-d 크기 */
    var cap = ref * (mob ? 1.7 : 1.4) * [.85, 1, 1.15][DENS];          /* 한글 보정: 음절이 적어 가로 질량을 채우려 키운다 */
    var target = W * (mob ? .94 : .8);                                 /* 레퍼런스 폭 비율 78% · 모바일 92% */
    var hMax = vh * (mob ? .34 : .44);
    var inn = $('.kb-wm-in', wm);
    /* 폭 = 윗줄 끝과 둘째 줄(들여쓰기·칸 포함) 끝 중 더 먼 쪽. transform 영향 없는 offset 값으로 잰다 */
    function ext() {
      var r = Math.max(wa.offsetLeft + wa.offsetWidth, wb.offsetLeft + wb.offsetWidth, slot.offsetLeft + slot.offsetWidth);
      return { w: r - Math.min(wa.offsetLeft, slot.offsetLeft), h: inn.offsetHeight };
    }
    wm.style.setProperty('--kb-wm-size', '100px');
    wm.classList.remove('is-two');
    var b1 = ext();
    var s = 300;  /* [12주 갤러리 복사본] 사진 칸을 빼서 비는 만큼 230 → 300px로 키움. [커스텀] 로고 230px — 화면이 좁으면 아래 검증이 폭에 맞춰 줄인다 */
    if (false && canTwo) {
      wm.classList.add('is-two');
      var b2 = ext();
      var s2 = Math.min(target / b2.w * 100, cap, hMax / b2.h * 100);
      if (s2 > s * 1.3) s = s2; else wm.classList.remove('is-two');
    }
    /* 검증: 실제 렌더 폭이 칸을 넘으면 넘친 만큼 줄인다 */
    for (var k = 0; k < 4; k++) {
      wm.style.setProperty('--kb-wm-size', s.toFixed(2) + 'px');
      var e = ext(); if (e.w <= W - 2) break;
      s *= (W - 2) / e.w * .99;
    }
    wm.style.setProperty('--kb-wm-size', s.toFixed(2) + 'px');
    return s;
  }

  /* ── 격자 문장 (.exp-*): 행 4줄, 어절은 세로선에 붙고 다음 줄은 한 칸 오른쪽에서 시작 ── */
  function buildGrid() {
    var wrap = $('.kb-say-wrap'), say = wrap && $('.kb-say', wrap);
    if (!say) return;
    var old = $('.kb-grid', wrap); if (old) old.remove();
    var words = say.textContent.trim().split(/\s+/);
    var vw = R.clientWidth, u = parseFloat(getComputedStyle(document.body).fontSize);
    var mob = vw < 768, mult = mob ? .3 : vw < 992 ? .4 : 1;
    var nameSize = parseFloat(wm && wm.style.getPropertyValue('--kb-wm-size')) || 999;
    var pad = u * .625;
    var probe = el('span', 'kb-w'); probe.style.visibility = 'hidden'; probe.style.left = '-9999px'; wrap.appendChild(probe);
    /* [커스텀] 문장이 화면 폭 100%를 채우도록 글자 크기를 맞춘다(1920 기준, 폰은 8줄) */
    var FS = 30, rows = mob ? 8 : 4, L;
    for (var tries = 0; tries < 12; tries++) {
      var fs = FS, g = fs / 12.5;
      var col = (mob ? 36 : 35) * g, rowH = Math.max((mob ? 13 : 10) * g, fs * 1.04) * (DENS === 0 ? 1.15 : 1), dot = 0, gap = .75 * g;  /* [커스텀] 어절 앞 점 없음 */
      probe.style.fontSize = fs + 'px';
      var ws = words.map(function (w) { probe.textContent = w; return probe.getBoundingClientRect().width; });
      var total = ws.reduce(function (a, b) { return a + b + dot + gap * 3; }, 0), per = total / rows, acc = 0, r = 0;
      var lx = function (c) { return pad + col / 2 + c * col; };
      var items = [], rowStart = 0, lastEnd = -1e9, maxEnd = 0, maxC = 0, cur = 0;
      for (var i = 0; i < words.length; i++) {
        var need = ws[i] + dot + gap * 3;
        if (i > 0 && r < rows - 1 && acc + need / 2 > per * (r + 1)) { r++; rowStart++; lastEnd = -1e9; cur = rowStart; }
        var c = Math.max(cur, i === 0 ? 0 : cur);
        while (lx(c) - dot / 2 - gap < lastEnd + gap * 2) c++;
        var x = lx(c), end = x + dot / 2 + gap + ws[i];
        items.push({ w: words[i], r: r, c: c, x: x }); lastEnd = end; cur = c + 1; acc += need;
        if (end > maxEnd) maxEnd = end; if (c > maxC) maxC = c;
      }
      var S = Math.max(0, maxEnd + pad * 2 - vw);
      L = { g: g, fs: fs, col: col, rowH: rowH, dot: dot, gap: gap, items: items, rows: r + 1, S: S, maxC: maxC, maxEnd: maxEnd, lx: lx };
      var fit = (vw - pad * 2) / maxEnd;
      if (fit > .99 && fit < 1.005) break;
      FS *= fit;
    }
    probe.remove();
    var G = el('div', 'kb-grid'); G.setAttribute('aria-hidden', 'true');
    G.style.height = (L.rows * L.rowH) + 'px';
    G.style.setProperty('--kb-lab', Math.max(10, u * .875) + 'px');
    var rowsEl = el('div', 'kb-grid-rows');
    for (var ri = 0; ri < L.rows; ri++) { var hr = el('i'); hr.style.top = (ri * L.rowH) + 'px'; rowsEl.appendChild(hr); }
    var track = el('div', 'kb-track'), wtrack = el('div', 'kb-track kb-track-w');
    var speed = MOTION === 2 ? .45 : .55, reach = vw * 1.5;
    for (var c = 0; L.lx(c) < L.maxEnd + reach; c++) {
      var v = el('i', 'kb-vline'); v.style.left = L.lx(c) + 'px'; track.appendChild(v);
      var lab = el('span', 'kb-clab', ('0' + (c + 1)).slice(-2)); lab.style.left = (L.lx(c) + 4) + 'px'; track.appendChild(lab);
    }
    L.items.forEach(function (it) {
      var w = el('span', 'kb-w');
      w.style.cssText = 'left:' + (it.x - L.dot / 2) + 'px;top:' + (it.r * L.rowH) + 'px;height:' + L.rowH + 'px;font-size:' + L.fs + 'px;gap:' + L.gap + 'px';
      w.innerHTML = '<i style="width:' + L.dot + 'px"></i><span>' + esc(it.w) + '</span>';
      wtrack.appendChild(w);
    });
    var cover = el('div', 'kb-cover'); cover.style.width = (L.col / 2 + L.g * 2) + 'px';
    G.appendChild(track); G.appendChild(cover); G.appendChild(rowsEl); G.appendChild(wtrack);
    wrap.appendChild(G);
    grid = { wrap: wrap, tracks: [track, wtrack], S: L.S, speed: speed };
  }


  /* ── 갤러리 스택 (.dropping-stack 의 모양·넘김 동작) — 교수 지시로 버튼 대신 스크롤로 한 장씩 ──
     보이는 장수 4 · 깊이 f마다 z -35em · y -(윗여백/3 + 10em) · 원근 100em (원본 실측)
     섹션 안쪽(.kb-gal-pin)을 sticky 로 화면에 붙이고, 사진 한 장당 80vh 를 스크롤하면 맨 앞 사진이
     아래로 200% 떨어지며 사라지고 뒤 사진이 한 칸 앞으로 온다(원본 넘김과 같은 키). 스크롤을 가로채지 않는다 —
     진행도는 스크롤 위치에서 읽기만 하고, 한 장 구간의 가운데 50%에서만 넘어간다(앞뒤 25%는 멈춤). 역스크롤이면 되돌아온다.
     1장 = sticky 없이 고정 · 0장 = 섹션 삭제 · 움직임 0 = 구간 가운데에서 사진만 바뀜 */
  var ST = null, SEG = .8;
  function buildStack() {
    var box = $('.kb-stack'); if (!box) return;
    var sec = box.closest('section'), cards = $$('.kb-card', box), n = cards.length;
    if (!n) { if (sec) sec.remove(); return; }
    var list = el('div', 'kb-stack-list'); box.insertBefore(list, cards[0]);
    cards.forEach(function (c) { list.appendChild(c); });
    var two = function (v) { return ('0' + v).slice(-2); };
    var ctl = el('div', 'kb-stack-ctl');
    ctl.innerHTML = '<p class="kb-count"><span class="kb-count-n"><b>01</b></span>/' + two(n) + '</p>';
    box.appendChild(ctl);
    var pin = el('div', 'kb-gal-pin'); sec.insertBefore(pin, sec.firstChild);
    $$(':scope > .kb-label, :scope > .kb-stack', sec).forEach(function (x) { pin.appendChild(x); });
    var spacer = null;
    if (n > 1) { sec.classList.add('is-scroll'); spacer = el('div', 'kb-gal-run'); spacer.setAttribute('aria-hidden', 'true'); spacer.style.height = ((n - 1) * SEG * 100) + 'svh'; sec.appendChild(spacer); }
    else box.classList.add('is-single');
    box.classList.add('is-on');
    ST = { sec: sec, pin: pin, box: box, list: list, items: cards, n: n, cnt: $('.kb-count-n', ctl), k: -1 };
    function u() { return parseFloat(getComputedStyle(document.body).fontSize); }
    function pos(f) {
      var pad = parseFloat(getComputedStyle(box).paddingTop) || 0;
      return 'translate3d(0,' + (-(pad / 3 + 10 * u()) * f).toFixed(2) + 'px,' + (-35 * u() * f).toFixed(2) + 'px)';
    }
    function osmo(t) { /* 넘김 곡선(가운데가 빠르고 양 끝이 느림) — 스크롤 진행을 사진 위치로 옮길 때만 쓴다 */ return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function progress() {
      if (n < 2) return 0;
      var r = sec.getBoundingClientRect(), pt = parseFloat(getComputedStyle(sec).paddingTop) || 0;
      var run = spacer.offsetHeight || 1;
      return clamp(-(r.top + pt) / run, 0, 1) * (n - 1);
    }
    function paint(k) {
      ST.k = k;
      cards.forEach(function (c, i) {
        var rel = i - k, st = c.style;
        if (rel <= -1 || rel >= 4) { st.opacity = 0; st.zIndex = 0; st.transform = pos(Math.max(0, rel)); return; }
        if (rel < 0) {                                   /* 떨어지는 앞장 — yPercent 0 → 200, 넘김 40~60% 구간에서 투명 */
          var d = -rel; st.zIndex = 2000;
          st.transform = 'translate3d(0,' + (d * 200).toFixed(2) + '%,0)';
          st.opacity = (1 - clamp((d - .4) / .2, 0, 1)).toFixed(3);
          return;
        }
        st.zIndex = 999 - Math.floor(rel); st.transform = pos(rel);
        st.opacity = rel > 3 ? (4 - rel).toFixed(3) : 1;  /* 새 뒷장은 투명 → 1 */
      });
      var front = clamp(Math.round(k), 0, n - 1), b = $('b', ST.cnt), v = two(front + 1);
      if (b.textContent !== v) b.textContent = v;
    }
    ST.update = function () {
      var s = progress(), i = Math.floor(s), f = s - i, k;
      if (i >= n - 1) { i = n - 1; f = 0; }
      if (MOTION === 0) k = i + (f >= .5 ? 1 : 0);
      else k = i + osmo(clamp((f - .25) / .5, 0, 1));
      if (Math.abs(k - ST.k) > .0005) paint(k);
    };
    ST.lay = function () { ST.k = -1; ST.update(); };
    /* 표의 "사진" 칸 → 그 사진이 맨 앞에 선 스크롤 위치로 */
    $$('a.kb-row-in[data-photo]').forEach(function (a) { a.addEventListener('click', function (e) {
      var i = clamp(+a.getAttribute('data-photo') - 1, 0, n - 1);
      e.preventDefault();
      var pt = parseFloat(getComputedStyle(sec).paddingTop) || 0;
      var y = sec.getBoundingClientRect().top + window.scrollY + pt + (n > 1 ? spacer.offsetHeight * i / (n - 1) : 0);
      window.scrollTo({ top: Math.round(y), behavior: MOTION > 0 ? 'smooth' : 'auto' });
      if (history.replaceState) history.replaceState(null, '', '#gal');
    }); });
    ST.lay();
  }

  /* ── 투어 표 행 등장(reveal-group) · 사진 시차 ── */
  function setupReveal() {
    var t = $('.kb-rows'); if (!t || MOTION === 0 || !('IntersectionObserver' in window)) return;
    R.classList.add('kb-reveal');
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); $$('.kb-row', t).forEach(function (r) { r.classList.add('is-in'); }); } }, { rootMargin: '0px 0px -20% 0px' });
    io.observe(t);
  }

  /* ── 스크롤: 읽기만 하고 transform/opacity 만 바꾼다 ── */
  var lastY = 0, ticking = false;
  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight;
    if (!R.classList.contains('kb-open')) {
      if (y > 50 && y - lastY > 10) { R.classList.add('kb-down'); lastY = y; }
      else if (lastY - y > 10 || y <= 50) { R.classList.remove('kb-down'); lastY = y; }
    }
    if (grid && MOTION > 0) {
      var rc = grid.wrap.getBoundingClientRect();
      /* 레퍼런스는 통과 구간 전체(0~1)에 선형. 한 문장은 끝까지 읽혀야 해서 20%~(20+speed)% 구간에 몰아 준다 */
      var p = clamp(((vh - rc.top) / (vh + rc.height) - .2) / grid.speed, 0, 1);
      var tf = 'translate3d(' + (-grid.S * p).toFixed(1) + 'px,0,0)';
      grid.tracks.forEach(function (t) { t.style.transform = tf; });
    }
    if (ST) ST.update();
    var tfig = MOTION > 0 && $('.kb-tour-fig img');
    if (tfig) {                                               /* 원본 data-parallax: yPercent -12 → 8 (top bottom → bottom top) */
      var fr = tfig.parentNode.getBoundingClientRect(), pp = clamp((vh - fr.top) / (vh + fr.height), 0, 1);
      tfig.style.transform = 'translate3d(0,' + (-12 + 20 * pp).toFixed(2) * .5 + '%,0)';
    }
    ticking = false;
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }

  /* ── 사진 순환 (data-image-cycle="1" → 1000ms, 사진 통째로) ── */
  var cycT = null, cycI = 0;
  function startCycle() {
    if (MOTION === 0 || pieces.length < 2 || cycT) return;
    var ms = MOTION === 2 ? 300 : 450;  /* [커스텀] 사진 넘김 1초 → 0.45초 */
    function step() {
      var prev = pieces[cycI]; cycI = (cycI + 1) % pieces.length;
      prev.setAttribute('data-s', 'prev');
      (function (p) { setTimeout(function () { if (p.getAttribute('data-s') === 'prev') p.setAttribute('data-s', 'not'); }, ms); })(prev);
      pieces[cycI].setAttribute('data-s', 'active');
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !cycT) cycT = setInterval(step, ms);
        else if (!en[0].isIntersecting) { clearInterval(cycT); cycT = null; }
      }).observe(slot);
    } else cycT = setInterval(step, ms);
  }

  /* ── 이퀄라이저: 막대마다 .12~.4초 간격으로 높이 .1~1 ── */
  function startEq() {
    $$('.kb-eq i').forEach(function (b, i) {
      if (MOTION === 0) { b.style.setProperty('--h', [.6, .35, .7, .9, .55, .3, .75][i % 7]); return; }
      (function go() {
        var d = (.12 + Math.random() * .28) / (MOTION === 2 ? 1.5 : 1);
        b.style.setProperty('--d', d.toFixed(2) + 's'); b.style.setProperty('--h', (.1 + Math.random() * .9).toFixed(2));
        setTimeout(go, d * 1000);
      })();
    });
  }

  /* ── 인트로 (레퍼런스 home-hero 타임라인 그대로, 총 3.0초) ── */
  function intro() {
    if (true /* 12주 갤러리 복사본: 시작 모션 없이 바로 타이틀 — 검정 화면이 걷히고 로고에 레드가 차오르는 색 전환만 남긴다 */ || MOTION === 0 || !slot || window.scrollY > 10 || !hold.animate) { R.classList.remove('kb-pre'); R.classList.add('kb-fadein'); setTimeout(function () { R.classList.add('kb-color'); }, 700); startCycle(); return; }
    var vw = R.clientWidth, vh = window.innerHeight, mob = vw < 768;
    var sr = slot.getBoundingClientRect(), sw = sr.width, sh = sr.height;
    var W0 = vw * (mob ? 1.2 : 1.05), H0 = vh * (mob ? 1 : 1.05);
    var x0 = -sr.left - (W0 - vw) / 2, y0 = -sr.top - (H0 - vh) / 2, x1 = vw * (mob ? .17 : .15);
    var D = 3000, t = function (s) { return s * 1000 / D; };
    var box = function (w, h, x, y) { return { width: w + 'px', height: h + 'px', transform: 'translate(' + x + 'px,' + y + 'px)' }; };
    var k0 = box(W0, H0, x0, y0), k1 = box(sw, sh, x1, 0), k2 = box(sw, sh, 0, 0);
    hold.animate([
      Object.assign({ offset: 0, easing: 'linear' }, k0),
      Object.assign({ offset: t(.6), easing: EASE }, k0),        /* .6s 부터 1.4s 동안 칸으로 줄어든다 */
      Object.assign({ offset: t(2.0), easing: EASE }, k1),
      Object.assign({ offset: 1 }, k2)
    ], { duration: D });
    /* 레퍼런스 xPercent(-180→78 / 120→30)는 Paul·Kalkbrenner 폭에 맞춘 값이다. 실측 결과는
       "왼쪽 단어는 화면 밖 왼쪽, 오른쪽 단어는 오른쪽 끝에 한 조각 → 세 덩어리가 함께 약 15vw 오른쪽에 모였다가 제자리"
       — 한글 이름은 폭이 제각각이라 그 결과를 px 로 옮긴다 */
    var ra = wa.getBoundingClientRect(), rb = wb.getBoundingClientRect();
    var A0 = -(ra.right + vw * .02), B0 = vw * .96 - rb.left;
    [[wa, A0], [wb, B0]].forEach(function (w) {
      w[0].animate([
        { offset: 0, transform: 'translateX(' + w[1] + 'px)', easing: 'linear' },
        { offset: t(.8), transform: 'translateX(' + w[1] + 'px)', easing: EASE },  /* .8s 부터 1.2s */
        { offset: t(2.0), transform: 'translateX(' + x1 + 'px)', easing: EASE },
        { offset: 1, transform: 'translateX(0)' }
      ], { duration: D });
    });
    var nav = $('.kb-nav');
    if (nav) nav.animate([
      { offset: 0, transform: 'translateY(-200%)' }, { offset: t(2.0), transform: 'translateY(-200%)', easing: EASE }, { offset: 1, transform: 'translateY(0)' }
    ], { duration: D });
    R.classList.remove('kb-pre');
    setTimeout(function () { R.classList.add('kb-color'); }, 2000);  /* [커스텀] 로고가 모이는 순간 흑백 → 원래 색 */
    setTimeout(startCycle, D);
  }

  function evWrap() { $$('.kb-ev').forEach(function (e) { e.classList.remove('is-wrap'); var ch = e.querySelector('.kb-ch'); if (ch && e.offsetHeight > ch.offsetHeight * 1.5) e.classList.add('is-wrap'); }); }
  function layout() { fitName(); buildGrid(); evWrap(); if (ST) ST.lay(); onScroll(); }

  document.addEventListener('DOMContentLoaded', function () {
    buildName(); buildParts(); buildStack(); setupReveal(); layout(); startEq();
    var started = false, done = false;
    function go() { if (started) return; started = true; layout();
      /* 레퍼런스처럼 0~0.9초는 검정 로더 — 폰트가 빨리 와도 0.9초 전에는 시작하지 않는다 */
      var wait = 0;
      setTimeout(function () { intro(); setTimeout(function () { done = true; }, 3100); }, wait); }
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go); setTimeout(go, 1500); } else go();
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () {
      if (!started) return; if (done) layout(); else setTimeout(function () { layout(); }, 3200);
    });
    window.addEventListener('scroll', req, { passive: true });
    var rt, w0 = R.clientWidth;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { if (R.clientWidth !== w0) { w0 = R.clientWidth; layout(); } else onScroll(); }, 150);
    });
    window.addEventListener('load', function () { if (!started) return; if (done) layout(); else { buildGrid(); onScroll(); } });
  });
})();
