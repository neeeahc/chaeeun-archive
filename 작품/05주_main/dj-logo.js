/* [커스텀] 로고 호버 — 마우스를 부드럽게 따라오며 글자가 액체처럼 녹아 일렁이고, 지나간 자리엔 꼬리처럼 남았다가 서서히 굳는다
   · 모양: 학생의 8주 작업처럼 글자 획 자체가 끈적하게 아래로 녹아 늘어진다 — 붓 자리에서 생긴 방울이 천천히 내려가며 글자를 끌고 내려가
           줄기는 가늘어지고 끝이 맺힌다(이전 핏방울 그림은 교체). 마우스가 떠나면 버터 스퀴시처럼 서서히 제자리로
   · 움직임: 학생이 말한 'Press & Move처럼 자연스럽게 따라오는 느낌' — 원 같은 경계 없이
       ① 붓: 커서를 바로 쫓지 않고 스프링으로 살짝 늦게 따라가는 점(붓)이 지나간 길에 '녹는 정도'를 칠한다
       ② 녹는 정도 지도: 매 프레임 조금씩 번지고(퍼짐) 조금씩 사라진다(굳음) → 꼬리가 생기고 가장자리는 부드럽다
       ③ 그리기(WebGL): 녹는 정도만큼 낮은 주파수 노이즈로 글자를 크게 휘게 하고 함께 흐리게 한다.
          노이즈는 시간에 따라 천천히 흘러서 멈춰 있어도 일렁인다
   · [추가] 로고를 클릭한 채 끌면 무게감 있게 천천히 늘어나고(민감도 낮음), 놓으면 출렁임 없이 버터 스퀴시처럼 서서히 제자리로
   · Safari·Chrome 모두 WebGL로 같은 결과. 효과가 남아 있는 동안만 캔버스, 다 굳으면 원래 글자(HTML)로 돌아간다 */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var CELL = 4;          // 녹는 정도 지도 한 칸(px)
  var BRUSH_MIN = 18;    // 처음 녹는 폭(붓 반지름, px) — 2초 동안은 이 폭 그대로 좁게
  var BRUSH_MAX = 150;   // 2초가 지나면 이만큼까지 넓어진다
  var WAIT = 2;          // 좁게 머무는 시간(초)
  var GROW = 6;          // 머문 시간이 이만큼(초)이 되면 최대 폭 — 2초~6초 사이에 넓어진다
  var FADE = 0.992;      // 굳는 속도(1에 가까울수록 천천히 굳는다)
  var SPREAD = 0.12;     // 번지는 정도
  var PUSH = 150;        // 일그러짐 세기(px) — 근거 사진 호버와 같은 값
  var FOLLOW = 0.035;    // 붓이 커서를 따라가는 속도(작을수록 더 늦게) — 아주 천천히
  var PAD = 320;         // 로고 바깥 여유(px) — 피가 길게 흘러내릴 자리

  var wm, hero, cvs, gl, prog, texText, texH, texD, loc = {};
  /* [추가] 클릭&드래그 — 액체괴물(슬라임)처럼 잡아 늘리면 늘어나고, 놓으면 출렁이며 제자리로 */
  var GRAB_R = 90;       // 잡히는 범위(반지름, px)
  var MAXD = 220;        // 최대로 늘어나는 거리(px)
  var RETURN = 0.016;    // 놓았을 때 돌아오는 빠르기 — 출렁임 없이 버터 스퀴시처럼 서서히(매 프레임 남은 늘어남의 1.6%씩, 3초쯤에 거의 원래대로)
  var HEAVY = 0.12;      // 무게감: 잡은 자리가 마우스를 따라가는 빠르기(작을수록 묵직하게 늦게)
  var STRETCH = 0.5;     // 민감도: 마우스가 움직인 거리 중 실제로 늘어나는 비율
  var dx_, dy_, vx_, vy_, dbytes, dragging = false, gx0 = 0, gy0 = 0, gtx = 0, gty = 0;
  /* [호버] 녹아 늘어지는 방울(학생 8주 작업 '성실한 나라의 앨리스' 참고) — 붓 자리에서 생겨 천천히 아래로 내려가며 지나간 길의 글자를 끌고 내려간다
     → 글자 획이 끈적하게 늘어나 가늘어지고 끝이 맺힌다. 2초 뒤부터는 방울이 굵어진다 */
  var drips = [], spawnT = 0;
  /* [호버] 핏줄기 — 학생 8주 작업 녹화(0.2초 간격으로 뜯어 잰 값)를 그대로 따른다
     ① 0~0.6초: 글자 밑단에서 피가 확 늘어진다(길이 180~320px, 처음엔 끝에 방울이 맺혔다가 늘어나며 사라짐)
     ② 0.6~1.2초: 길게 늘어진 채 실처럼 가늘어진다  ③ 1.2~1.6초: 줄이 끊기며 위로 말려 올라가
     ④ 짧고 뾰족한 고드름(18~40px)만 남는다 — 호버하는 동안 유지, 호버가 끝나면 0.8초에 걸쳐 쏙 들어가 원래 글자로
     모양은 셰이더에서 직접 그린다: 위는 획만큼 두껍고 밑단과 둥글게 이어지며(필렛) 아래로 갈수록 실처럼 가늘어진다 */
  var DMAX = 16;         // 동시에 그릴 수 있는 핏줄기 수
  var DRIP_GAP = .3;    // 커서가 글자 위를 지날 때 새 핏줄기가 생기는 최소 간격(초) — 반응을 빠르게
  var dripT = 0, dripU = new Float32Array(DMAX * 4), dripB = new Float32Array(DMAX), dripS = new Float32Array(DMAX);
  /* [추가] 학생 녹화 2('리스' 글자) 참고 — 줄이 끊기면 아랫부분이 떨어져 바닥에 툭 떨어지고 번진다(핏자국).
     호버가 끝나도 바로 들어가지 않고, 밑단에 타원 물방울로 매달렸다가(표면 장력) 쏙 빨려 들어간다 */
  var FMAX = 8, falls = [], splats = [], fallU = new Float32Array(FMAX * 4), splU = new Float32Array(FMAX * 4);
  var GRAV = 2600;       // 떨어지는 가속도(px/초²)
  var FLOOR_GAP = 30;    // 바닥선 — 캔버스 맨 아래에서 이만큼 위

  var textA = null, textAW = 0;   // 글자 그림의 투명도(방울이 글자 밑단에서만 생기게 찾는 용도)
  var W = 0, H = 0, gw = 0, gh = 0, field, tmp, bytes, dpr = 1, ready0 = false;
  var raf = 0, inside = false, tx = 0, ty = 0, bx = 0, by = 0, lbx = 0, lby = 0, color = '', t0 = 0, dwell = 0, lastNow = 0;

  function build() {
    wm = document.querySelector('.kb-wm'); hero = wm && wm.closest('.kb-hero');
    if (!wm || cvs) return;
    cvs = document.createElement('canvas');
    cvs.className = 'dj-wave'; cvs.setAttribute('aria-hidden', 'true');
    gl = cvs.getContext('webgl', { premultipliedAlpha: true, alpha: true }) || cvs.getContext('experimental-webgl');
    if (!gl) { cvs = null; return; }
    wm.appendChild(cvs);
    setupGL();
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', function () { inside = false; });
    wm.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (!ready0) layout();
      var b = wm.getBoundingClientRect(); gx0 = gtx = e.clientX - b.left + PAD; gy0 = gty = e.clientY - b.top + PAD;
      dragging = true; wm.classList.add('is-grab');
      try { wm.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
      if (!raf) start();
    });
    wm.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var b = wm.getBoundingClientRect(); gtx = e.clientX - b.left + PAD; gty = e.clientY - b.top + PAD;   // 목표만 기억 — 실제로 늘리는 건 loop에서 묵직하게
    });
    function release() { dragging = false; wm.classList.remove('is-grab'); }
    wm.addEventListener('pointerup', release); wm.addEventListener('pointercancel', release); wm.addEventListener('lostpointercapture', release);
    addEventListener('resize', function () { ready0 = false; setTimeout(function () { layout(); kick(); }, 200); });
    hero.addEventListener('pointerover', function (e) { if (e.target.closest && e.target.closest('.dj-alb')) kick(); });   // 앨범 호버 색 바뀜도 캔버스에 그린다
    hero.addEventListener('pointerout', function (e) { if (e.target.closest && e.target.closest('.dj-alb')) kick(); });
    layout(); start();                                                         // 처음부터 캔버스로 그려 두어 늘 같은 모습
  }

  function setupGL() {
    var vs = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }';
    var fs = [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',   // 픽셀 좌표가 커서 정밀도가 낮으면 테두리가 계단지게 보인다
      'varying vec2 vUv; vec2 uv0(){ return vUv; } uniform sampler2D uText; uniform sampler2D uH; uniform vec2 uPush; uniform vec2 uAsp; uniform float uT; uniform vec2 uRes; uniform sampler2D uD; uniform vec2 uDmax; uniform vec4 uDrip[16]; uniform float uBulb[16]; uniform float uStr[16]; uniform vec3 uCol; uniform vec4 uFall[8]; uniform vec4 uSplat[8];',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }',
      'float fbm2(vec2 p){ return (noise(p) * .667 + noise(p * 2.03 + 7.1) * .333); }',
      'void main(){',
      '  vec2 dd = (texture2D(uD, uv0()).rg - .5) * 2. * uDmax;',                 // 잡아 늘린 만큼 이 자리 그림을 끌어온다
      '  vec2 uv = uv0() - dd;',
      '  vec2 p = vUv * uRes;',
      // CC Smear(에펙) 그대로 — 커서가 닿은 밑단(From)을 아래(To)로 끌어당긴다. 가운데일수록 많이, 반지름 밖은 그대로(종 모양 감쇠)
      //   → 위는 넓고 아래로 갈수록 둥글게 모이는 통통한 깔때기 모양으로 글자가 늘어진다
      '  vec4 c0 = texture2D(uText, uv);',
      '  float sm = 0.;',
      // 물방울 드립(학생 참고 사진: 시럽·잉크·물방울) — 밑단과 넓게 이어진 목 → 실처럼 가는 줄기 → 끝에 맺힌 눈물방울
      '  for (int i = 0; i < 16; i++) {',
      '    vec4 k = uDrip[i]; if (k.w <= .5) continue;',                            // x · 밑단 y · 목 폭 · 줄기 길이
      '    float b = uBulb[i], st = uStr[i];',                                         // 끝 방울 반지름 · 줄기 굵기(반)
      '    float dx = abs(p.x - k.x); if (dx > k.z * 1.6 + 4.) continue;',
      '    float dy = p.y - k.y; if (dy < -20. || dy > k.w + b * 2.6) continue;',
      '    float yb = min(p.y, k.y);',                                               // 그 위에 글자가 있는 만큼(비스듬한 밑단도 이어 붙인다)
      '    float w = 0.;',
      '    for (int j = 0; j < 7; j++) { float yy = yb - 2. - float(j) * 3.; w = max(w, texture2D(uText, vec2(p.x, yy) / uRes).a * (1. - float(j) / 9.)); }',
      '    w = smoothstep(.1, .8, w);',
      '    float hw = st + (k.z - st) * exp(-max(dy, 0.) / (k.z * .55));',          // 목: 밑단에서 넓게 시작해 빠르게 가늘어진다
      '    float ds = dx - hw;',                                                      // 목은 늘 좌우 대칭으로 둥글게(글자 모양에 따라 잘리지 않게)
      '    ds = max(ds, dy - (k.w - b * .6));',                                       // 줄기는 방울 위에서 끝난다
      '    float db = length(vec2(dx, (dy - k.w) / 1.3)) - b;',                       // 끝의 눈물방울(아래로 살짝 길쭉)
      '    float h = clamp(.5 + .5 * (db - ds) / (b * .9), 0., 1.);',
      '    float dd2 = mix(db, ds, h) - b * .9 * h * (1. - h);',                       // 줄기와 방울을 부드럽게 이어 눈물 모양
      '    float fill = smoothstep(.7, -.7, dd2) * smoothstep(-1.5, 0., dy);',
      '    fill *= mix(w, 1., smoothstep(2., 12., dy));',                               // 시작 부분은 바로 위에 글자가 있는 곳에만 — 글자 밖·빈 곳으로 삐져나온 조각이 보이지 않게
      // (밑단 위쪽을 네모나게 메우던 '다리'는 뺐다 — 각진 사각형으로 보였음. 대신 방울을 밑단보다 6px 안쪽에서 시작한다)
      '    sm = max(sm, fill);',
      '  }',
      '  if (sm > c0.a) c0 = vec4(uCol * sm, sm);',
      '  float d = 0.;',
      '  for (int j = 0; j < 8; j++) {',                                           // 떨어지는 방울 — 둥근 물방울(빨라질수록 살짝 길쭉)
      '    vec4 f = uFall[j]; if (f.z <= .3) continue;',
      '    float df = length(vec2(p.x - f.x, (p.y - f.y) / f.w)) - f.z;',
      '    d = max(d, smoothstep(.5, -.5, df));',
      '  }',
      '  for (int j = 0; j < 8; j++) {',                                           // 바닥 핏자국: 납작하게 퍼진 웅덩이 + 튄 방울 두 개
      '    vec4 g = uSplat[j]; if (g.z <= .5) continue;',                            // x · 바닥 y · 반지름 · 진하기
      '    float pd = length(vec2((p.x - g.x) / g.z, (p.y - g.y) / (g.z * .22)));',
      '    float sp = smoothstep(1.05, .95, pd) * step(g.y - g.z * .22, p.y);',
      '    sp = max(sp, smoothstep(g.z * .16 + .8, g.z * .16 - .8, length(p - vec2(g.x - g.z * 1.25, g.y - g.z * .35))));',
      '    sp = max(sp, smoothstep(g.z * .11 + .8, g.z * .11 - .8, length(p - vec2(g.x + g.z * 1.4, g.y - g.z * .55))));',
      '    d = max(d, sp * g.w);',
      '  }',
      '  vec4 o = c0 + vec4(uCol * d, d) * (1. - c0.a);',                           // 글자 뒤에 핏줄기를 겹친다(색이 탁해지지 않게)
      '  gl_FragColor = o; return;',
      '}'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && window.console) console.warn('dj-logo shader', gl.getShaderInfoLog(s)); return s; }
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var ap = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
    ['uText', 'uH', 'uPush', 'uAsp', 'uT', 'uRes', 'uD', 'uDmax', 'uDrip', 'uBulb', 'uStr', 'uCol', 'uFall', 'uSplat'].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(loc.uText, 0); gl.uniform1i(loc.uH, 1); gl.uniform1i(loc.uD, 2);
    texText = mkTex(); texH = mkTex(); texD = mkTex();
  }
  function mkTex() {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /* 캔버스 크기·지도·글자 그림을 지금 로고에 맞춘다 */
  function layout() {
    var b = wm.getBoundingClientRect();
    W = Math.ceil(b.width + PAD * 2); H = Math.ceil(b.height + PAD * 2);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    cvs.style.width = W + 'px'; cvs.style.height = H + 'px'; cvs.style.left = -PAD + 'px'; cvs.style.top = -PAD + 'px';
    gl.viewport(0, 0, cvs.width, cvs.height);
    gw = Math.ceil(W / CELL); gh = Math.ceil(H / CELL);
    field = new Float32Array(gw * gh); tmp = new Float32Array(gw * gh); bytes = new Uint8Array(gw * gh);
    dx_ = new Float32Array(gw * gh); dy_ = new Float32Array(gw * gh); vx_ = new Float32Array(gw * gh); vy_ = new Float32Array(gw * gh);
    dbytes = new Uint8Array(gw * gh * 4);
    gl.uniform2f(loc.uDmax, MAXD / W, MAXD / H);
    gl.uniform2f(loc.uPush, PUSH / W, PUSH / H);
    gl.uniform2f(loc.uRes, W, H);
    gl.uniform2f(loc.uAsp, W / H, 1);
    drawText();
    ready0 = true;
  }
  function drawText() {
    var c = document.createElement('canvas'); c.width = cvs.width; c.height = cvs.height;
    var x = c.getContext('2d'); x.scale(dpr, dpr);
    var base = wm.getBoundingClientRect();
    color = getComputedStyle(hero).getPropertyValue('--dj-logo').trim() || '#B0141C';
    var cc = document.createElement('canvas').getContext('2d'); cc.fillStyle = color; cc.fillRect(0, 0, 1, 1); var px = cc.getImageData(0, 0, 1, 1).data;
    gl.uniform3f(loc.uCol, px[0] / 255, px[1] / 255, px[2] / 255);
    x.fillStyle = color;
    ['.kb-wm-a', '.kb-wm-b'].forEach(function (sel) {
      var el = wm.querySelector(sel); if (!el) return;
      var cs = getComputedStyle(el), r = el.getBoundingClientRect(), txt = el.textContent;
      x.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = x.measureText(txt), fsz = parseFloat(cs.fontSize);
      var asc = m.fontBoundingBoxAscent || fsz * .8, desc = m.fontBoundingBoxDescent || fsz * .2;
      var yy = (r.top - base.top) + (r.height - (asc + desc)) / 2 + asc + PAD;
      var xx = (r.left - base.left) + PAD, ls = parseFloat(cs.letterSpacing) || 0;
      if ('letterSpacing' in x) { x.letterSpacing = ls + 'px'; x.fillText(txt, xx, yy); x.letterSpacing = '0px'; }
      else Array.from(txt).forEach(function (ch) { x.fillText(ch, xx, yy); xx += x.measureText(ch).width + ls; });
    });
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texText);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    try { var im = x.getImageData(0, 0, c.width, c.height); textAW = c.width; textA = new Uint8Array(c.width * c.height); for (var ai = 0; ai < textA.length; ai++) textA[ai] = im.data[ai * 4 + 3]; } catch (er) { textA = null; }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }

  function onMove(e) {
    if (e.pointerType === 'touch' || !cvs) return;
    if (!ready0) layout();
    var b = wm.getBoundingClientRect();
    var x = e.clientX - b.left + PAD, y = e.clientY - b.top + PAD;
    var inBox = x >= PAD && y >= PAD && x <= W - PAD && y <= H - PAD;   // 로고 상자 안에서만 호버로 본다(주변 빈 곳은 제외)
    if (inBox && !inside) { if (!raf) { bx = lbx = x; by = lby = y; } }   // 처음 들어오면 붓을 그 자리에서 시작
    inside = inBox; tx = x; ty = y;
    if (inside) spawnDrip(x, y);                                              // 글자 위를 지나는 즉시 피가 맺힌다
    if (inside && !raf) start();
  }
  /* 붓 자국 하나 — 가장자리가 부드러운 둥근 점 */
  function dab(x, y, f, br) {
    var R = br / CELL, cx = x / CELL, cy = y / CELL;
    var x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(gw - 1, Math.ceil(cx + R));
    var y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(gh - 1, Math.ceil(cy + R));
    for (var j = y0; j <= y1; j++) for (var i = x0; i <= x1; i++) {
      var d = ((i - cx) * (i - cx) + (j - cy) * (j - cy)) / (R * R); if (d > 1) continue;
      var k = j * gw + i, v = field[k] + f * (1 - d) * (1 - d);
      field[k] = v > 1 ? 1 : v;
    }
  }
  /* 잡은 자리 주변을 끌어당긴다 — 가운데일수록 많이, 가장자리는 부드럽게 */
  function pull(x, y, mx, my, rad) {
    var R = (rad || GRAB_R) / CELL, cx = x / CELL, cy = y / CELL;
    var x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(gw - 1, Math.ceil(cx + R));
    var y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(gh - 1, Math.ceil(cy + R));
    for (var j = y0; j <= y1; j++) for (var i = x0; i <= x1; i++) {
      var d = ((i - cx) * (i - cx) + (j - cy) * (j - cy)) / (R * R); if (d > 1) continue;
      var k = j * gw + i, w = (1 - d) * (1 - d);
      dx_[k] = Math.max(-MAXD, Math.min(MAXD, dx_[k] + mx * w)); dy_[k] = Math.max(-MAXD, Math.min(MAXD, dy_[k] + my * w));
      vx_[k] = vy_[k] = 0;
    }
  }
  /* 붓 아래쪽에서 글자의 밑단(글자 → 빈 곳으로 바뀌는 자리)을 찾는다. 없으면 -1 */
  function onInk(x, y) {
    if (!textA) return false;
    var X = Math.round(x * dpr), Y = Math.round(y * dpr); if (X < 0 || Y < 0 || X >= textAW) return false;
    return (textA[Y * textAW + X] || 0) > 128;
  }
  /* 커서 아래 획의 두께(가로로 이어진 글자 폭) */
  function inkRun(x, y) {
    if (!textA) return 0;
    var n = 0, a;
    for (var i = 0; i < 80; i++) { a = textA[Math.round(y * dpr) * textAW + Math.round((x + i) * dpr)] || 0; if (a < 128) break; n++; }
    for (i = 1; i < 80; i++) { a = textA[Math.round(y * dpr) * textAW + Math.round((x - i) * dpr)] || 0; if (a < 128) break; n++; }
    return n;
  }
  function spawnDrip(x, y) {
    var now = performance.now() / 1000;
    if (now - dripT < DRIP_GAP || !onInk(x, y)) return;
    var edge = bottomEdge(x, y); if (edge < 0) return;
    for (var gy = 2; gy < 30; gy += 3) if (onInk(x, edge + gy)) return;               // 글자 속 빈 구멍 말고, 바깥 밑단에서만
    for (var i = 0; i < drips.length; i++) if (!drips[i].leaving && Math.abs(drips[i].x - x) < 26 && Math.abs(drips[i].y - edge) < 40) return;   // 같은 자리에 겹쳐 생기지 않게
    if (drips.length >= DMAX) drips.shift();
    dripT = now;
    // 방울은 획의 '가운데'에서, 획 폭 안쪽으로만 — 글자 밖이나 글자 속 빈 곳으로 삐져나오지 않게
    var ey = edge - 8, lft = 0, rgt = 0, al;
    for (; rgt < 90; rgt++) { al = textA[Math.round(ey * dpr) * textAW + Math.round((x + rgt) * dpr)] || 0; if (al < 128) break; }
    for (; lft < 90; lft++) { al = textA[Math.round(ey * dpr) * textAW + Math.round((x - lft) * dpr)] || 0; if (al < 128) break; }
    var run = lft + rgt; if (run < 14) return;                                        // 너무 가는 획에서는 만들지 않는다
    x = x + (rgt - lft) / 2;                                                          // 획 가운데로
    var R = Math.max(5, Math.min(18, run / 2 - 4, run * .22 + 4));                    // 목 폭(반) — 획 폭의 절반보다 작게
    var st = 2 + Math.random() * 1.8;                                                 // 실처럼 가는 줄기(반 굵기 2~3.8px)
    var reach = Math.min(55 + Math.random() * 130, H - edge - 40);                    // 줄기마다 다른 길이
    var live = 0; for (var q = 0; q < drips.length; q++) if (!drips[q].leaving) live++;
    if (live >= 6) for (q = 0; q < drips.length; q++) if (!drips[q].leaving) { drips[q].leaving = true; break; }
    drips.push({ x: x, y: edge - 3, R: R, st: Math.min(st, R * .6), max: reach + 3, L: 0, B: 0, age: 0, out: 0 });
  }
  function bottomEdge(x, y) {
    if (!textA) return -1;
    var X = Math.round(x * dpr); if (X < 0 || X >= textAW) return -1;
    var rows = textA.length / textAW, inInk = false;
    for (var yy = Math.max(0, y - 20); yy < Math.min(H - 2, y + 260); yy += 1) {
      var a = textA[Math.round(yy * dpr) * textAW + X] || 0;
      if (a > 128) inInk = true; else if (inInk) return yy;
    }
    return -1;
  }
  /* 스머지 — 방울 자리에 '출발점에서 여기까지 내려온 거리'를 칠한다. 그러면 이 자리에는 출발점의 글자가 보여서 획이 길게 늘어난다 */
  function smudge(x, y, tdx, tdy, rad) {
    var R = rad / CELL, cx = x / CELL, cy = y / CELL;
    var x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(gw - 1, Math.ceil(cx + R));
    var y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(gh - 1, Math.ceil(cy + R));
    for (var j = y0; j <= y1; j++) for (var i = x0; i <= x1; i++) {
      var d = ((i - cx) * (i - cx) + (j - cy) * (j - cy)) / (R * R); if (d > 1) continue;
      var k = j * gw + i, w = (1 - d) * (1 - d);
      dx_[k] += (tdx - dx_[k]) * w; dy_[k] += (Math.min(MAXD, tdy) - dy_[k]) * w;
    }
  }
  var colorT = 0;
  function kick() { if (!raf) start(); }
  function start() { wm.classList.add('is-wave'); t0 = t0 || performance.now(); raf = requestAnimationFrame(loop); }
  function loop(now) {
    var c = getComputedStyle(hero).getPropertyValue('--dj-logo').trim();
    if (c && c !== color) { drawText(); colorT = now || performance.now(); }   // 앨범 호버로 로고 색이 바뀌면 다시 그린다
    // ① 붓이 커서를 스프링처럼 늦게 따라가며 지나간 길을 칠한다
    var dt = lastNow ? Math.min(.05, ((now || 0) - lastNow) / 1000) : .016; lastNow = now || 0;
    dwell = inside ? Math.min(GROW, dwell + dt) : Math.max(0, dwell - dt * 3);   // 머문 시간(떠나면 빨리 줄어든다)
    var g = Math.max(0, Math.min(1, (dwell - WAIT) / (GROW - WAIT))), br = BRUSH_MIN + (BRUSH_MAX - BRUSH_MIN) * (g * g * (3 - 2 * g));   // 2초까지 좁게, 그 뒤 점점 넓게
    if (inside) {
      bx += (tx - bx) * FOLLOW; by += (ty - by) * FOLLOW;
      var dx = bx - lbx, dy = by - lby, dist = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(dist / (CELL * 1.5)));
      var f = .005 + Math.min(dist, 40) * .0015;              // 민감도 낮춤(학생 요청): 칠하는 양 약 1/3, 마우스 빠르기에 덜 반응
      // (예전 마블링·녹는 정도 칠하기는 쓰지 않는다 — 호버 모양은 핏줄기만)
      lbx = bx; lby = by;
    }
    // 물방울 시간표 — 줄기가 늘어남(약 1.2초, 빠르게 출발해 끝에서 아주 천천히 = 키프레임 속도 10/90) · 끝 방울이 점점 커짐
    //   → 무거워진 방울이 떨어져 나가고(바닥 핏자국) 줄기는 짧게 줄어 새 방울이 맺힘
    //   → 호버가 끝나면 0.5초 잔여감 뒤 1.2초에 걸쳐 쏙 들어가 원래 글자로
    function eo(t) { return 1 - Math.pow(1 - t, 3); }
    function ease1090(t) { return 1 - Math.pow(1 - t, 4.2); }
    function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    for (var di = drips.length - 1; di >= 0; di--) {
      var dp = drips[di]; dp.age += dt;
      var g1 = ease1090(Math.min(1, dp.age / 1.25)), L = dp.max * g1, B = dp.st * (1.6 + 1.6 * g1);
      if (dp.age > 2.4) {
        if (!dp.dropped) { dp.dropped = true; if (falls.length >= FMAX) falls.shift(); falls.push({ x: dp.x, y: dp.y + dp.max, r: B, v: 40 }); }
        var r4 = eo(Math.min(1, (dp.age - 2.4) / .6)); L = dp.max * (1 - .45 * r4); B = dp.st * (1.6 + 1.4 * r4);   // 짧아진 줄기 끝에 새 방울
      }
      if (!inside && !dragging) dp.leaving = true;
      if (dp.leaving) {
        dp.out += dt;
        if (dp.out > .5) { var k3 = eio(Math.min(1, (dp.out - .5) / 1.2)); L *= 1 - k3; B *= 1 - k3 * .9; if (k3 >= 1) { drips.splice(di, 1); continue; } }
      }
      dp.L = L; dp.B = B;
    }
    dripU.fill(0); dripB.fill(0); dripS.fill(1);
    for (var dj = 0; dj < drips.length && dj < DMAX; dj++) { var q2 = drips[dj]; dripU.set([q2.x, q2.y, q2.R, Math.max(.6, q2.L)], dj * 4); dripB[dj] = Math.max(.5, q2.B); dripS[dj] = q2.st; }
    gl.uniform4fv(loc.uDrip, dripU); gl.uniform1fv(loc.uBulb, dripB); gl.uniform1fv(loc.uStr, dripS);
    // 떨어지는 조각 — 중력으로 빨라지며 바닥에 닿으면 핏자국이 된다
    var floorY = Math.min(H - FLOOR_GAP, innerHeight - cvs.getBoundingClientRect().top - 28);   // 바닥선 — 화면 아래쪽(보이는 곳)에 맞춘다
    for (var fi = falls.length - 1; fi >= 0; fi--) {
      var fp = falls[fi]; fp.v += GRAV * dt; fp.y += fp.v * dt;
      if (fp.y + fp.r >= floorY) { if (splats.length >= FMAX) splats.shift(); splats.push({ x: fp.x, r: 0, R: 8 + fp.r * 2.6, age: 0 }); falls.splice(fi, 1); }   // 바닥에 톡 떨어져 번진다
    }
    for (var si = splats.length - 1; si >= 0; si--) {
      var sp2 = splats[si]; sp2.age += dt; sp2.r = sp2.R * eo(Math.min(1, sp2.age / .25));
      sp2.a = sp2.age < 1.4 ? 1 : Math.max(0, 1 - (sp2.age - 1.4) / .9);       // 잠깐 남았다가 스며들 듯 사라진다
      if (sp2.a <= 0) splats.splice(si, 1);
    }
    fallU.fill(0); splU.fill(0);
    for (var fj = 0; fj < falls.length; fj++) { var f2 = falls[fj]; fallU.set([f2.x, f2.y, f2.r, 1 + Math.min(.5, f2.v / 2400)], fj * 4); }
    for (var sj = 0; sj < splats.length; sj++) { var g2 = splats[sj]; splU.set([g2.x, floorY, Math.max(.6, g2.r), g2.a], sj * 4); }
    gl.uniform4fv(loc.uFall, fallU); gl.uniform4fv(loc.uSplat, splU);
    // ② 번지고 굳는다
    var e = 0;
    for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
      var k = y * gw + x, v = field[k];
      var avg = (field[x > 0 ? k - 1 : k] + field[x < gw - 1 ? k + 1 : k] + field[y > 0 ? k - gw : k] + field[y < gh - 1 ? k + gw : k]) * .25;
      v = (v + (avg - v) * SPREAD) * FADE;
      tmp[k] = v; e += v; bytes[k] = v * 255;
    }
    var t = field; field = tmp; tmp = t;
    // ②-1 잡은 자리가 마우스를 묵직하게 늦게 따라가며, 움직인 거리의 절반만큼만 늘린다
    if (dragging) {
      var nx2 = gx0 + (gtx - gx0) * HEAVY, ny2 = gy0 + (gty - gy0) * HEAVY;
      if (Math.abs(nx2 - gx0) + Math.abs(ny2 - gy0) > .05) pull(gx0, gy0, (nx2 - gx0) * STRETCH, (ny2 - gy0) * STRETCH);
      gx0 = nx2; gy0 = ny2;
    }
    // ②-2 잡아 늘린 모양: 잡고 있는 동안은 유지, 놓으면 출렁임 없이 서서히 제자리로(버터 스퀴시). 이웃과 섞여 끈적하게 이어진다
    var de = 0;
    for (var y2 = 0; y2 < gh; y2++) for (var x2 = 0; x2 < gw; x2++) {
      var q = y2 * gw + x2;
      var ax = (dx_[x2 > 0 ? q - 1 : q] + dx_[x2 < gw - 1 ? q + 1 : q] + dx_[y2 > 0 ? q - gw : q] + dx_[y2 < gh - 1 ? q + gw : q]) * .25;
      var ay = (dy_[x2 > 0 ? q - 1 : q] + dy_[x2 < gw - 1 ? q + 1 : q] + dy_[y2 > 0 ? q - gw : q] + dy_[y2 < gh - 1 ? q + gw : q]) * .25;
      var mixK = dragging ? .08 : .006; dx_[q] += (ax - dx_[q]) * mixK; dy_[q] += (ay - dy_[q]) * mixK;   // 드래그 때만 끈적하게 섞고, 녹아 늘어지는 줄기는 번지지 않게
      if (!dragging && !inside && !drips.length) { dx_[q] -= dx_[q] * RETURN; dy_[q] -= dy_[q] * RETURN; }   // 마우스가 떠나면 되튀지 않고 천천히 제자리로
      de += Math.abs(dx_[q]) + Math.abs(dy_[q]);
      dbytes[q * 4] = 128 + dx_[q] / MAXD * 127; dbytes[q * 4 + 1] = 128 + dy_[q] / MAXD * 127; dbytes[q * 4 + 3] = 255;
    }
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texD);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gw, gh, 0, gl.RGBA, gl.UNSIGNED_BYTE, dbytes);
    // ③ 그린다
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texH);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gw, gh, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bytes);
    gl.uniform1f(loc.uT, ((now || performance.now()) - t0) / 1000);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!inside && !dragging && !drips.length && !falls.length && !splats.length && de / (gw * gh) < .02 && (now || 0) - colorT > 1300) {   // 핏줄기가 다 들어가고 드래그 변형도 풀리면   // 다 굳고 출렁임도 멎으면 멈추고 원래 글자로
      field.fill(0);   // 캔버스 그림은 그대로 둔다(HTML 글자와 번갈아 보이면 위치가 어긋나 툭 튄다)
      dx_.fill(0); dy_.fill(0); vx_.fill(0); vy_.fill(0); raf = 0; return;
    }
    raf = requestAnimationFrame(loop);
  }

  /* 로고가 완성된 뒤(html.kb-color + 인트로 3초) 만든다 */
  function ready() { setTimeout(build, 1400); }
  if (document.documentElement.classList.contains('kb-color')) ready();
  else new MutationObserver(function (m, o) { if (document.documentElement.classList.contains('kb-color')) { o.disconnect(); ready(); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
