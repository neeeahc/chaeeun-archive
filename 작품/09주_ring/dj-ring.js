/* [커스텀] 근거 사진 — etienne.studio 첫 화면 3D 링 (4주 site_etienne/script.js의 링을 옮김)
   스크롤하면 천천히 한 바퀴 돌고, 마우스를 따라 부드럽게 기운다. 가로로 긴 타원 위에 사진을 놓는다 */
(function () {
  var ring = document.getElementById('dj-ring');
  if (!ring) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var section = ring.closest('.dj-ring-section');
  var cards = [].slice.call(ring.children);
  var step = 360 / cards.length;
  var SCROLL_TURN = 360;     // 섹션 끝까지 내리면 한 바퀴
  var idle = 0, spin = 0;
  var target = { x: 0, y: 0 }, now = { x: 0, y: 0 };

  addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    target.x = (e.clientX / innerWidth) * 2 - 1;
    target.y = (e.clientY / innerHeight) * 2 - 1;
  });
  document.documentElement.addEventListener('pointerleave', function () { target.x = 0; target.y = 0; });

  function frame() {
    var wide = Math.min(innerWidth * 0.44, 980);
    var deep = wide * 0.5;
    var total = Math.max(1, section.offsetHeight - innerHeight);
    var progress = Math.min(Math.max(-section.getBoundingClientRect().top / total, 0), 1);
    var k = reduce ? 1 : 0.035;
    spin += (progress * SCROLL_TURN - spin) * k;
    now.x += (target.x - now.x) * k;
    now.y += (target.y - now.y) * k;
    if (!reduce) idle += 0.015;
    var tiltX = now.y * -10, tiltZ = now.x * 3;
    var turn = spin + idle + now.x * 16;
    ring.style.transform = 'translateZ(' + (-deep) + 'px) rotateX(' + tiltX + 'deg) rotateZ(' + tiltZ + 'deg)';
    cards.forEach(function (c, i) {
      var a = ((i * step - turn) * Math.PI) / 180;
      var x = Math.sin(a) * wide, z = Math.cos(a) * deep;
      var face = (Math.atan2(Math.sin(a) * deep, Math.cos(a) * wide) * 180) / Math.PI;
      c.style.transform = 'translate3d(' + x + 'px, 0, ' + z + 'px) rotateY(' + face + 'deg)';
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ── [커스텀] 호버: 마블링처럼 일그러지고 흐려진다 (학생이 준 마블링 참고 이미지)
     SVG 난류(feTurbulence) → 변위(feDisplacementMap). 올려 둔 동안 무늬가 천천히 흐른다 ── */
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  /* 낮은 주파수 = 크고 느슨한 곡선(마블링). 2겹만 겹쳐 잔주름 대신 굵은 물결 */
  svg.innerHTML = '<filter id="dj-warp" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.004 0.009" numOctaves="2" seed="7" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.appendChild(svg);
  var turb = svg.querySelector('feTurbulence'), disp = svg.querySelector('feDisplacementMap');
  /* 인터랙션 — 스프링으로 움직인다
     ① 올리면 바로 일그러지지 않고 0.25초 머뭇거린 뒤, 1.4초에 걸쳐 녹아내리듯 점점 커진다
     ② 올려 둔 채 마우스를 움직이면 그 빠르기만큼 물결이 출렁인다
     ③ 떠나면 튕기듯 몇 번 흔들리다가 원래 사진으로 돌아온다 */
  var PEAK = 150, KICK = 2.2, MAXV = 900;
  var w = 0, v = 0, t0 = 0, hovered = null, enterAt = 0, over = false, last = null, phase = 0;
  function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3); }
  function warpLoop(t) {
    var target = over ? PEAK * ease((t - enterAt - 250) / 1400) : 0;
    var stiff = over ? 0.035 : 0.09, damp = over ? 0.16 : 0.1;   // 떠날 때는 덜 눌러 흔들림이 남는다
    v += (target - w) * stiff - v * damp;
    w += v;
    if (reduce) { w = target; v = 0; }
    disp.setAttribute('scale', w.toFixed(1));
    phase += 0.004 + Math.min(Math.abs(v), 30) * 0.0006;           // 출렁일수록 무늬가 빨리 흐른다
    turb.setAttribute('baseFrequency', (0.004 + Math.sin(phase * 1.3) * .0015).toFixed(5) + ' ' + (0.009 + Math.cos(phase) * .003).toFixed(5));
    if (hovered) hovered.style.setProperty('--dj-melt', Math.min(Math.abs(w) / PEAK, 1).toFixed(3));
    if (!over && Math.abs(w) < .4 && Math.abs(v) < .4) {
      w = v = 0; disp.setAttribute('scale', 0);
      if (hovered) { hovered.classList.remove('is-warp'); hovered.style.removeProperty('--dj-melt'); hovered = null; }
      t0 = 0; return;
    }
    t0 = requestAnimationFrame(warpLoop);
  }
  function kick() { if (!t0) t0 = requestAnimationFrame(warpLoop); }
  cards.forEach(function (c) {
    c.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (hovered && hovered !== c) { hovered.classList.remove('is-warp'); hovered.style.removeProperty('--dj-melt'); w = v = 0; }
      hovered = c; c.classList.add('is-warp'); over = true; enterAt = performance.now(); last = null; kick();
    });
    c.addEventListener('pointermove', function (e) {
      if (!over || hovered !== c) return;
      if (last) { var sp = Math.hypot(e.clientX - last.x, e.clientY - last.y); v += Math.min(sp * KICK, MAXV) * .02 * (Math.random() < .5 ? -1 : 1); }
      last = { x: e.clientX, y: e.clientY };
    });
    c.addEventListener('pointerleave', function () { if (hovered === c) { over = false; v -= 6; kick(); } });
  });
  function warpOff() { over = false; kick(); }

  /* ── [커스텀] 클릭: 팝업 크게 보기 — 페이지는 그대로 두고 화면의 90% 창을 띄운다. 뒤는 흐리게
     글자 규칙은 readymag Photo Portfolio(designs/6017708/4): 대문자 · 지금 사진만 파랑 · 사진 위 ‹ › 화살표
     사진은 창 가운데 크게 · 오른쪽 절반을 누르면 다음, 왼쪽 절반은 이전 · ← → 키 · Esc·바깥 클릭 닫기 ── */
  var uniq = [];
  cards.forEach(function (c) {
    var img = c.querySelector('img'), src = img.getAttribute('src');
    if (uniq.every(function (u) { return u.src !== src; })) uniq.push({ src: src, name: c.getAttribute('data-name') || '' });
  });
  var N = uniq.length, cur = 0, lastFocus = null;
  function two(n) { return ('0' + n).slice(-2); }
  var box = document.createElement('div');
  box.className = 'dj-lb'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '근거 사진 크게 보기'); box.hidden = true;
  box.innerHTML =
    '<div class="dj-lb-back"></div>' +
    '<div class="dj-lb-panel">' +
      '<div class="dj-lb-top"><p class="dj-lb-count"></p><button class="dj-lb-close" type="button">Close</button></div>' +
      '<div class="dj-lb-stage"><img class="dj-lb-img" alt=""><span class="dj-lb-arrow" aria-hidden="true"></span></div>' +
      '<ol class="dj-lb-list">' + uniq.map(function (u, i) { return '<li><button type="button" data-i="' + i + '">' + two(i + 1) + (u.name ? ' ' + u.name : '') + '</button></li>'; }).join('') + '</ol>' +
    '</div>';
  document.body.appendChild(box);
  box.querySelector('.dj-lb-back').addEventListener('click', function () { close(); });
  var bImg = box.querySelector('.dj-lb-img'), stage = box.querySelector('.dj-lb-stage'), arrow = box.querySelector('.dj-lb-arrow');
  var list = [].slice.call(box.querySelectorAll('.dj-lb-list button')), count = box.querySelector('.dj-lb-count');
  /* 넘김 인터랙션 — 지금 사진은 가는 방향으로 밀리며 흐려져 사라지고(0.22초),
     다음 사진은 반대편에서 살짝 기울어진 채 흐릿하게 들어와 제자리에서 선명해진다(0.55초). 번호 줄도 같은 방향으로 굴러 바뀐다 */
  var token = 0, EASE_IN = 'cubic-bezier(.55, 0, .8, .2)', EASE_OUT = 'cubic-bezier(.2, .8, .2, 1)';
  function label() {
    list.forEach(function (b, k) { b.classList.toggle('is-on', k === cur); b.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
    count.textContent = two(cur + 1) + ' / ' + two(N) + (uniq[cur].name ? ' — ' + uniq[cur].name : '');
  }
  function show(i, dir) {
    var next = (i + N) % N;
    if (next === cur && !box.hidden && dir) return;
    cur = next;
    var my = ++token, src = uniq[cur].src, alt = '근거 사진 ' + two(cur + 1);
    if (!dir || reduce || !bImg.animate || box.hidden) { bImg.src = src; bImg.alt = alt; label(); return; }
    var pre = new Image(); pre.src = src;
    var ready = pre.decode ? pre.decode().catch(function () {}) : Promise.resolve();
    var out = bImg.animate([
      { transform: 'none', opacity: 1, filter: 'blur(0px)' },
      { transform: 'translateX(' + (-dir * 90) + 'px) scale(.96) rotate(' + (-dir * 1.5) + 'deg)', opacity: 0, filter: 'blur(10px)' }
    ], { duration: 220, easing: EASE_IN, fill: 'forwards' });
    count.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-60%)', opacity: 0 }], { duration: 180, easing: EASE_IN, fill: 'forwards' });
    Promise.all([out.finished.catch(function () {}), ready]).then(function () {
      if (my !== token) return;                         // 그 사이 또 넘겼으면 마지막 것만 보인다
      bImg.src = src; bImg.alt = alt; label();
      out.cancel();
      bImg.animate([
        { transform: 'translateX(' + (dir * 120) + 'px) scale(1.04) rotate(' + (dir * 2) + 'deg)', opacity: 0, filter: 'blur(14px)' },
        { transform: 'none', opacity: 1, filter: 'blur(0px)' }
      ], { duration: 550, easing: EASE_OUT });
      count.animate([{ transform: 'translateY(60%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, easing: EASE_OUT, fill: 'forwards' });
    });
  }
  function open(i) {
    lastFocus = document.activeElement; warpOff();
    show(i); box.hidden = false; document.documentElement.classList.add('dj-lb-open');
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('is-in'); }); });
    box.querySelector('.dj-lb-close').focus({ preventScroll: true });
  }
  function close() { return; /* 12주 갤러리 복사본: 팝업을 닫지 않고 늘 켜 둔다 */
  }
  function closeOrig() {
    box.classList.remove('is-in'); document.documentElement.classList.remove('dj-lb-open');
    setTimeout(function () { if (!box.classList.contains('is-in')) box.hidden = true; }, reduce ? 0 : 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  cards.forEach(function (c, i) {
    c.setAttribute('tabindex', c.getAttribute('aria-hidden') ? '-1' : '0');
    c.setAttribute('role', 'button');
    c.addEventListener('click', function () { open(i % N); });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i % N); } });
  });
  box.querySelector('.dj-lb-close').addEventListener('click', close);
  list.forEach(function (b) { b.addEventListener('click', function () { var k = +b.getAttribute('data-i'); show(k, k > cur ? 1 : -1); }); });
  function side(e) { var r = bImg.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? -1 : 1; }
  stage.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect(), d = side(e);
    arrow.textContent = d < 0 ? '‹' : '›';
    arrow.style.left = (e.clientX - r.left) + 'px'; arrow.style.top = (e.clientY - r.top) + 'px';
    stage.classList.add('is-hover');
  });
  stage.addEventListener('pointerleave', function () { stage.classList.remove('is-hover'); });
  stage.addEventListener('click', function (e) { var d = side(e); show(cur + d, d); });
  stage.addEventListener('mousedown', function (e) { e.preventDefault(); });   // 연달아 눌러도 사진이 선택(어둡게 덮임)되지 않게
  bImg.draggable = false;
  /* 12주 갤러리 복사본: 링 화면 없이 처음부터 크게 보기 창을 연다 */
  open(0);
  document.addEventListener('keydown', function (e) {
    if (box.hidden || !box.classList.contains('is-in')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(cur + 1, 1);
    else if (e.key === 'ArrowLeft') show(cur - 1, -1);
  });
})();
