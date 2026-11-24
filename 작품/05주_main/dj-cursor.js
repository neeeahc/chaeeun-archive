/* [12주 갤러리 복사본] 마우스 커서 — 빨간 원 몸통 + 작은 원 다리 6개 (선 없음)
   · 원래 쓰던 거미 그림(앨범 커버에서 따낸 것)은 저작권 때문에 빼고 원으로 다시 그렸다
   · 몸통은 커서를 살짝 늦게 따라오고(스프링), 다리 점은 움직이는 방향 양옆에 붙어 걸을 때 흔들린다
   · 링크·버튼·로고 위에서는 조금 커진다
   · 터치 기기와 '움직임 줄이기' 설정에서는 원래 커서를 그대로 쓴다 */
(function () {
  if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var RED = '#e1251b', BOX = 80, C = BOX / 2, BODY = 11, FOOT = 3.8, REACH = 25;
  var NS = 'http://www.w3.org/2000/svg';
  var el = document.createElement('div');
  el.className = 'dj-spider'; el.setAttribute('aria-hidden', 'true');
  el.style.width = BOX + 'px'; el.style.height = BOX + 'px'; el.style.filter = 'none';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', BOX); svg.setAttribute('height', BOX); svg.setAttribute('viewBox', '0 0 ' + BOX + ' ' + BOX);
  var feet = [];
  for (var i = 0; i < 6; i++) { var f = document.createElementNS(NS, 'circle'); f.setAttribute('r', FOOT); f.setAttribute('fill', RED); svg.appendChild(f); feet.push(f); }
  var body = document.createElementNS(NS, 'circle'); body.setAttribute('cx', C); body.setAttribute('cy', C); body.setAttribute('r', BODY); body.setAttribute('fill', RED); svg.appendChild(body);
  el.appendChild(svg);
  document.body.appendChild(el);
  document.documentElement.classList.add('dj-spider-on');

  var tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, vx = 0, vy = 0, ang = 0, shown = false, big = 0, bigTo = 0;
  addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!shown) { x = tx; y = ty; shown = true; el.classList.add('is-on'); }
    var t = e.target.closest && e.target.closest('a, button, [role="button"], .kb-wm');
    bigTo = t ? 1 : 0;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { el.classList.remove('is-on'); shown = false; });
  addEventListener('blur', function () { el.classList.remove('is-on'); shown = false; });

  (function loop(t) {
    t = t || 0;
    vx += (tx - x) * .12; vy += (ty - y) * .12; vx *= .7; vy *= .7;
    x += vx; y += vy;
    var sp = Math.min(Math.hypot(vx, vy), 6);
    if (sp > .4) { var a = Math.atan2(vy, vx), da = Math.atan2(Math.sin(a - ang), Math.cos(a - ang)); ang += da * .2; }
    for (var i = 0; i < 6; i++) {
      var side = i < 3 ? -1 : 1, k = i % 3;
      var fa = ang + side * (0.9 + k * 0.6) + Math.sin(t / 70 + i * 2) * 0.18 * sp;
      feet[i].setAttribute('cx', (C + Math.cos(fa) * REACH).toFixed(1));
      feet[i].setAttribute('cy', (C + Math.sin(fa) * REACH).toFixed(1));
    }
    big += (bigTo - big) * .15;
    el.style.transform = 'translate3d(' + (x - C).toFixed(1) + 'px,' + (y - C).toFixed(1) + 'px,0) scale(' + (1 + big * .35).toFixed(3) + ')';
    requestAnimationFrame(loop);
  })();
})();
