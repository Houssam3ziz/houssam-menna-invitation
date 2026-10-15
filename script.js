/* ============================================================
   EDIT YOUR WEDDING DETAILS HERE
   ============================================================ */
const CONFIG = {
  date: '2026-12-16T19:00:00+02:00',        // wedding date & time (Cairo time)
  endTime: '12:00 AM',                       // shown next to the start time
  groomParents: '',                          // e.g. 'Son of Mr & Mrs Ahmed Ali'
  brideParents: '',                          // e.g. 'Daughter of Mr & Mrs Mohamed Hassan'
  city: 'CAIRO',
  venue: 'Egyptian Shooting Club — Katameya',
  venueAddress: 'Ring Road, opposite Modern Academy, Katameya',
  mapQuery: 'نادي الصيد القطامية',           // what Google Maps should search for
  api: '/api',                               // Vercel Functions (see /api). No secrets here.
  uploads: { maxFiles: 10, maxEdge: 2048, quality: 0.85, maxBytes: 4 * 1024 * 1024 },
  timeline: [
    { time: '7:00 pm',  label: 'Guest Arrival &<br>Welcome Drinks', icon: 'assets/icon-arch.webp' },
    { time: '8:00 pm',  label: 'Zaffa &<br>Bride Entrance',          icon: 'assets/icon-bride.webp' },
    { time: '9:30 pm',  label: 'Dinner<br>is Served',                icon: 'assets/icon-dinner.webp' },
    { time: '11:00 pm', label: 'Cake Cutting &<br>Let the Fun Begin', icon: 'assets/icon-cake.svg' },
  ],
};

/* ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const wedding = new Date(CONFIG.date);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- fill content ---------- */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const cairo = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'numeric', year: 'numeric', weekday: 'long' })
  .formatToParts(wedding).reduce((a, p) => (a[p.type] = p.value, a), {});
$('#dDay').textContent = cairo.day;
$('#dMonth').textContent = MONTHS[cairo.month - 1];
$('#dYear').textContent = cairo.year;
$('#dWeekday').textContent = cairo.weekday;
$('#footDate').textContent = `${cairo.day} · ${MONTHS[cairo.month - 1]} · ${cairo.year}`;
const startTime = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }).format(wedding);
$('#dTime').textContent = startTime;
$('#dFull').textContent = `${cairo.weekday}, ${cairo.day} ${MONTHS[cairo.month - 1]} ${cairo.year} · ${startTime}`;
$('#venueAddr').textContent = CONFIG.venueAddress;
$('#venueTime').textContent = `${cairo.weekday} · ${startTime} – ${CONFIG.endTime}`;
$('#groomParents').textContent = CONFIG.groomParents;
$('#brideParents').textContent = CONFIG.brideParents;
$('#city').textContent = CONFIG.city;
$('#venue').textContent = CONFIG.venue;
$('#mapFrame').src = `https://maps.google.com/maps?q=${encodeURIComponent(CONFIG.mapQuery)}&z=14&output=embed`;
$('#openMaps').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapQuery)}`;

$('#timeline').innerHTML = CONFIG.timeline.map((t, i) => `
  <div class="t-item ${i % 2 ? 'flip' : ''}">
    <div class="t-icon reveal"><img src="${t.icon}" alt="" loading="lazy"></div>
    <div class="t-text reveal"><p class="t-time">${t.time}</p><p class="t-label">${t.label}</p></div>
  </div>`).join('');

/* ---------- timeline: dot that travels with scroll ---------- */
const tl = $('#timeline');
tl.insertAdjacentHTML('beforeend', '<div class="t-progress"></div><div class="t-dot"></div>');
const tDot = $('.t-dot', tl), tProg = $('.t-progress', tl), tItems = [...tl.querySelectorAll('.t-item')];
let tTicking = false;
function trackTimeline() {
  tTicking = false;
  const r = tl.getBoundingClientRect();
  const y = Math.min(r.height, Math.max(0, innerHeight * 0.55 - r.top));   // follows the middle of the screen
  tDot.style.top = y + 'px';
  tProg.style.height = y + 'px';
  tl.classList.toggle('active', y > 0 && y < r.height);
  tItems.forEach(it => it.classList.toggle('passed', it.offsetTop + it.offsetHeight / 2 <= y));
}
const tRequest = () => { if (!tTicking) { tTicking = true; requestAnimationFrame(trackTimeline); } };
addEventListener('scroll', tRequest, { passive: true });
addEventListener('resize', tRequest);
trackTimeline();

/* ---------- envelope ---------- */
const env = $('#envelope');
const sp = $('.sparkles');
for (let i = 0; i < 34; i++) {
  const s = document.createElement('i');
  if (i % 4 === 0) s.className = 'star';
  s.style.left = Math.random() * 100 + '%';
  s.style.top = Math.random() * 100 + '%';
  s.style.setProperty('--s', (2 + Math.random() * 3).toFixed(1) + 'px');
  s.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
  s.style.animationDuration = (2 + Math.random() * 2.5).toFixed(2) + 's';
  sp.appendChild(s);
}

const audio = $('#music');
const musicBtn = $('#musicBtn');
let hasMusic = false;
audio.addEventListener('canplay', () => { hasMusic = true; }, { once: true });
musicBtn.addEventListener('click', () => {
  if (audio.paused) { audio.play(); musicBtn.classList.remove('paused'); }
  else { audio.pause(); musicBtn.classList.add('paused'); }
});

const stages = REDUCED ? [['s-glow', 0], ['s-part', 50]] : [['s-glow', 0], ['s-foil', 450], ['s-open', 2300], ['s-part', 3500]];
function openEnvelope() {
  if (env.classList.contains('s-glow')) return;
  audio.play().then(() => { musicBtn.hidden = false; }).catch(() => { if (hasMusic) { musicBtn.hidden = false; musicBtn.classList.add('paused'); } });
  window.scrollTo(0, 0);
  stages.forEach(([c, t]) => setTimeout(() => env.classList.add(c), t));
  setTimeout(() => {
    document.body.classList.remove('locked');
    document.body.classList.add('opened');
    env.classList.add('gone');
    startHero();
  }, REDUCED ? 300 : 4200);
}
env.addEventListener('click', openEnvelope);

/* ---------- living hero ---------- */
// If assets/hero.mp4 exists it plays; otherwise the animated still is used.
const heroVideo = $('.hero-video');
fetch('assets/hero.mp4', { method: 'HEAD' }).then(r => {
  if (!r.ok) return;
  heroVideo.src = 'assets/hero.mp4';
  heroVideo.addEventListener('playing', () => heroVideo.classList.add('ready'), { once: true });
}).catch(() => {});

function startHero() {
  if (heroVideo.src) heroVideo.play().catch(() => {});
  if (REDUCED) return;   // no particle loop for guests who asked for less motion
  const cv = $('.motes'), ctx = cv.getContext('2d');
  let W, H, dpr;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const motes = Array.from({ length: 46 }, () => ({ x: rnd(0, 1), y: rnd(0, 1), r: rnd(.6, 2.4), v: rnd(.00012, .0005), a: rnd(0, 6.28), w: rnd(.3, 1) }));
  const petals = Array.from({ length: 9 }, () => ({ x: rnd(0, 1), y: rnd(-1, 0), s: rnd(5, 9), v: rnd(.0006, .0012), a: rnd(0, 6.28), rot: rnd(0, 6.28) }));
  let visible = true;
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe($('.hero'));
  (function frame(t) {
    requestAnimationFrame(frame);
    if (!visible) return;
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.y -= m.v; m.a += .01; if (m.y < -.02) { m.y = 1.02; m.x = rnd(0, 1); }
      const x = (m.x + Math.sin(m.a) * .01) * W, y = m.y * H;
      const tw = .45 + .55 * Math.sin(t / 600 * m.w + m.a);
      const g = ctx.createRadialGradient(x, y, 0, x, y, m.r * 4);
      g.addColorStop(0, `rgba(255,246,215,${.9 * tw})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, m.r * 4, 0, 6.28); ctx.fill();
    }
    for (const p of petals) {
      p.y += p.v; p.a += .015; p.rot += .02; if (p.y > 1.05) { p.y = -.05; p.x = rnd(0, 1); }
      const x = (p.x + Math.sin(p.a) * .04) * W, y = p.y * H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(1, .55 + .45 * Math.sin(p.a * 2));
      ctx.fillStyle = 'rgba(255,251,242,.92)'; ctx.shadowColor = 'rgba(150,120,70,.25)'; ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .62, 0, 0, 6.28); ctx.fill(); ctx.restore();
    }
  })(0);
}

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: .18 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------- scratch cards ---------- */
// Coverage is measured on a coarse grid in JS, so scratching never stalls
// on getImageData. Rich foil + inset rules make the cards obvious on ivory.
const scratchCards = [...document.querySelectorAll('.scratch-card canvas')];
let revealed = 0;
const GRID = 14;

function paintFoil(cv, ctx) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!r.width) return;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  const w = r.width, h = r.height;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#a87a2c'); g.addColorStop(.28, '#e2c27a'); g.addColorStop(.48, '#f7e6b2');
  g.addColorStop(.68, '#c2944a'); g.addColorStop(1, '#8f6a33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // foil grain (seeded so every card looks the same)
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < w * h / 7; i++) {
    ctx.fillStyle = rnd() > .5 ? `rgba(255,250,230,${rnd() * .22})` : `rgba(90,62,20,${rnd() * .18})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
  // diagonal sheen
  const s = ctx.createLinearGradient(0, h, w, 0);
  s.addColorStop(.38, 'rgba(255,255,255,0)'); s.addColorStop(.5, 'rgba(255,255,255,.42)'); s.addColorStop(.62, 'rgba(255,255,255,0)');
  ctx.fillStyle = s; ctx.fillRect(0, 0, w, h);
  // double inset rule
  ctx.strokeStyle = 'rgba(255,248,225,.85)'; ctx.lineWidth = 1; ctx.strokeRect(5.5, 5.5, w - 11, h - 11);
  ctx.strokeStyle = 'rgba(110,78,28,.45)'; ctx.lineWidth = .8; ctx.strokeRect(8.5, 8.5, w - 17, h - 17);
  // hint glyph
  ctx.fillStyle = 'rgba(255,250,236,.95)'; ctx.font = '600 15px Cinzel, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(90,62,20,.55)'; ctx.shadowBlur = 3;
  ctx.fillText('✦', w / 2, h / 2);
  ctx.shadowBlur = 0;
}

scratchCards.forEach(cv => {
  const ctx = cv.getContext('2d');
  const card = cv.parentElement;
  let drawing = false, last = null;
  const grid = new Uint8Array(GRID * GRID);
  let cleared = 0;
  cv._done = false;

  const paint = () => { if (!cv._done) paintFoil(cv, ctx); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(paint));
  let lastW = 0;
  new ResizeObserver(([e]) => { const w = e.contentRect.width; if (!cleared && Math.abs(w - lastW) > 1) { lastW = w; paint(); } }).observe(cv);

  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
  function mark(x, y, w, h, rad) {
    const cw = w / GRID, ch = h / GRID;
    for (let r = Math.max(0, Math.floor((y - rad) / ch)); r <= Math.min(GRID - 1, Math.floor((y + rad) / ch)); r++)
      for (let c = Math.max(0, Math.floor((x - rad) / cw)); c <= Math.min(GRID - 1, Math.floor((x + rad) / cw)); c++)
        if (((c + .5) * cw - x) ** 2 + ((r + .5) * ch - y) ** 2 <= rad * rad && !grid[r * GRID + c]) { grid[r * GRID + c] = 1; cleared++; }
  }
  function scratch(p) {
    if (cv._done) return;
    const rad = Math.max(14, Math.min(p.w, p.h) * .16);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = rad * 2;
    const from = last || p;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(p.x + .01, p.y); ctx.stroke(); ctx.stroke();
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / (rad / 2)));
    for (let i = 0; i <= steps; i++) mark(from.x + (p.x - from.x) * i / steps, from.y + (p.y - from.y) * i / steps, p.w, p.h, rad);
    last = p;
    if (cleared / (GRID * GRID) > .5) finish(cv);
  }
  cv.addEventListener('pointerdown', e => { drawing = true; last = null; card.classList.add('scratching'); cv.setPointerCapture(e.pointerId); scratch(pos(e)); });
  cv.addEventListener('pointermove', e => {
    if (!drawing) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (evs.length ? evs : [e]).forEach(ev => scratch(pos(ev)));
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => cv.addEventListener(t, () => { drawing = false; last = null; card.classList.remove('scratching'); }));
});

function finish(cv, quiet = false) {
  if (cv._done) return;
  cv._done = true;
  cv.classList.add('done');
  cv.parentElement.classList.add('revealed');
  if (!quiet && !REDUCED) burst(cv.getBoundingClientRect(), 16);
  if (++revealed === scratchCards.length) {
    $('#dWeekday').classList.add('shown');
    $('#dFull').classList.add('shown');
    $('#revealAll').hidden = true;
    if (!REDUCED) setTimeout(() => burst($('#scratchPanel').getBoundingClientRect(), 60), quiet ? 0 : 250);
    navigator.vibrate?.(12);
  }
}
$('#revealAll').addEventListener('click', () => scratchCards.forEach((cv, i) => setTimeout(() => finish(cv, true), REDUCED ? 0 : i * 160)));

function burst(r, n) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    c.style.left = x + 'px'; c.style.top = y + 'px';
    document.body.appendChild(c);
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
    c.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v + 80}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => c.remove();
  }
}

/* ---------- countdown ---------- */
const pad = (n, l = 2) => String(Math.max(0, n)).padStart(l, '0');
function tick() {
  let diff = Math.max(0, wedding - Date.now()) / 1000;
  const d = Math.floor(diff / 86400); diff -= d * 86400;
  const h = Math.floor(diff / 3600); diff -= h * 3600;
  const m = Math.floor(diff / 60); const s = Math.floor(diff - m * 60);
  $('#cdD').textContent = pad(d, 3); $('#cdH').textContent = pad(h);
  $('#cdM').textContent = pad(m); $('#cdS').textContent = pad(s);
}
tick(); setInterval(tick, 1000);


/* ============================================================
   GUEST PHOTOS — upload, gallery, lightbox
   Backend: /api/photos (Vercel Function → Vercel Blob). The browser never
   sees a storage key; it only POSTs a re-encoded JPEG.
   ============================================================ */
const api = (path, init) => fetch(CONFIG.api + path, init).then(async r => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'HTTP ' + r.status);
  return r.json();
});

/** Draw an image into a canvas at most `edge` px on its long side. */
function scaled(src, edge) {
  const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
  const k = Math.min(1, edge / Math.max(w0, h0));
  const cv = document.createElement('canvas');
  cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
  const c = cv.getContext('2d');
  c.imageSmoothingQuality = 'high';
  c.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}
const toJpeg = (cv, q) => new Promise(res => cv.toBlob(res, 'image/jpeg', q));

/** Resize + re-encode to JPEG (drops EXIF incl. GPS) and make a grid thumbnail. */
async function prepareImage(file) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    const url = URL.createObjectURL(file);
    try { src = new Image(); src.src = url; await src.decode(); }
    catch { throw new Error('unreadable'); }
    finally { URL.revokeObjectURL(url); }
  }
  const big = scaled(src, CONFIG.uploads.maxEdge);
  let full = await toJpeg(big, CONFIG.uploads.quality);
  if (full && full.size > CONFIG.uploads.maxBytes) full = await toJpeg(big, .7);
  const thumb = await toJpeg(scaled(big, 520), .78);
  src.close?.();
  if (!full || full.size > CONFIG.uploads.maxBytes) throw new Error('too-large');
  return { full, thumb };
}

function sendPhoto({ full, thumb }, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('photo', full, 'photo.jpg');
    if (thumb) form.append('thumb', thumb, 'thumb.jpg');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', CONFIG.api + '/photos');
    xhr.timeout = 90_000;
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(Math.round(e.loaded / e.total * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('bad-response')); } }
      else reject(new Error(xhr.status === 429 ? 'rate-limited' : 'HTTP ' + xhr.status));
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.ontimeout = () => reject(new Error('timeout'));
    xhr.send(form);
  });
}

const queueEl = $('#queue'), uploadBtn = $('#uploadBtn'), statusEl = $('#uploadStatus');
let queue = [];

function renderQueue() {
  queueEl.innerHTML = '';
  queue.forEach((q, i) => {
    const li = document.createElement('li');
    li.className = `q-item is-${q.state}`;
    li.style.setProperty('--i', i);
    li.innerHTML = `<img alt=""><span class="q-bar"><i style="width:${q.progress}%"></i></span><span class="q-badge"></span>`;
    li.querySelector('img').src = q.preview;
    const badge = li.querySelector('.q-badge');
    if (q.state === 'done') badge.textContent = '✓';
    else if (q.state === 'error') badge.textContent = '!';
    else if (q.state === 'uploading') badge.textContent = q.progress + '%';
    if (q.state === 'queued' || q.state === 'error') {
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'q-remove'; rm.setAttribute('aria-label', 'Remove photo'); rm.textContent = '×';
      rm.onclick = () => { URL.revokeObjectURL(q.preview); queue = queue.filter(x => x !== q); renderQueue(); };
      li.appendChild(rm);
    }
    queueEl.appendChild(li);
  });
  const pending = queue.filter(q => q.state === 'queued' || q.state === 'error').length;
  uploadBtn.hidden = pending === 0;
  uploadBtn.textContent = queue.some(q => q.state === 'error') ? 'Try again' : `Upload ${pending} photo${pending === 1 ? '' : 's'}`;
}

$('#photoInput').addEventListener('change', e => {
  statusEl.textContent = ''; statusEl.className = 'upload-status';
  const files = [...e.target.files].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
  const room = CONFIG.uploads.maxFiles - queue.filter(q => q.state !== 'done').length;
  if (files.length > room) { statusEl.textContent = `You can add up to ${CONFIG.uploads.maxFiles} photos at a time.`; statusEl.classList.add('err'); }
  queue = queue.filter(q => q.state !== 'done');
  files.slice(0, Math.max(0, room)).forEach(f => queue.push({ file: f, preview: URL.createObjectURL(f), state: 'queued', progress: 0 }));
  e.target.value = '';
  renderQueue();
});

let uploading = false;
uploadBtn.addEventListener('click', async () => {
  if (uploading) return;            // no double submissions
  uploading = true;
  uploadBtn.disabled = true;
  statusEl.textContent = ''; statusEl.className = 'upload-status';
  let ok = 0, failed = 0;
  for (const q of queue.filter(x => x.state === 'queued' || x.state === 'error')) {
    q.state = 'uploading'; q.progress = 0; renderQueue();
    try {
      const blob = await prepareImage(q.file);
      const photo = await sendPhoto(blob, p => { q.progress = p; const bar = queueEl.children[queue.indexOf(q)]; if (bar) { bar.querySelector('.q-bar i').style.width = p + '%'; bar.querySelector('.q-badge').textContent = p + '%'; } });
      q.state = 'done'; ok++;
      addPhoto(photo);
    } catch (err) {
      q.state = 'error'; failed++;
      q.reason = err.message;
      console.warn('[upload]', err);
    }
    renderQueue();
  }
  uploadBtn.disabled = false;
  uploading = false;
  if (ok) {
    statusEl.innerHTML = `Thank you — ${ok} photo${ok === 1 ? '' : 's'} added to the gallery ♡ <a href="#gallery">View gallery</a>`;
    statusEl.classList.add('ok');
    if (!REDUCED) burst($('#uploader').getBoundingClientRect(), 28);
  }
  if (failed) {
    const why = queue.some(q => q.reason === 'unreadable') ? 'One of the files isn’t a photo we can read — try a JPG.'
      : queue.some(q => q.reason === 'rate-limited') ? 'That’s a lot of photos at once — please wait a few minutes.'
      : 'Check your connection and tap “Try again”.';
    statusEl.insertAdjacentHTML('beforeend', `${ok ? '<br>' : ''}${failed} photo${failed === 1 ? '' : 's'} could not be uploaded. ${why}`);
    statusEl.classList.add('err');
  }
});

/* ---- gallery ---- */
const PAGE = 12;
let photos = [], shown = PAGE;
const grid = $('#galleryGrid'), gState = $('#galleryState'), moreBtn = $('#galleryMore');

function setGalleryState(kind) {
  const msg = {
    loading: '<div class="g-skeleton">' + '<span></span>'.repeat(6) + '</div>',
    empty: '<p class="g-empty">No photos yet — be the first to share a moment ♡</p>',
    error: '<p class="g-error">We couldn’t load the photos right now.</p><button type="button" class="btn-outline" id="gRetry">Try again</button>',
  }[kind] || '';
  gState.innerHTML = msg;
  $('#gRetry')?.addEventListener('click', loadGallery);
}

function renderGallery() {
  const list = photos.slice(0, shown);
  grid.innerHTML = '';
  list.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'g-item';
    li.style.setProperty('--i', i % PAGE);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.setAttribute('aria-label', `Open photo ${i + 1} of ${photos.length}`);
    const img = document.createElement('img');
    img.src = p.thumb || p.url; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.onload = () => li.classList.add('loaded');
    btn.appendChild(img); btn.onclick = () => openLightbox(i);
    li.appendChild(btn); grid.appendChild(li);
  });
  requestAnimationFrame(() => grid.querySelectorAll('.g-item').forEach(el => galleryIO.observe(el)));
  moreBtn.hidden = photos.length <= shown;
  $('#galleryCount').textContent = photos.length ? `${photos.length} moment${photos.length === 1 ? '' : 's'} shared by our loved ones` : 'Shared by our loved ones';
  setGalleryState(photos.length ? '' : 'empty');
}
const galleryIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); galleryIO.unobserve(e.target); } }), { threshold: .1 });

function addPhoto(photo) {
  if (photos.some(p => p.url === photo.url)) return;
  photos.unshift(photo); renderGallery();
}

async function loadGallery() {
  if (!photos.length) setGalleryState('loading');
  try {
    const list = await api('/photos');
    const known = new Set(list.map(p => p.url));
    photos = [...photos.filter(p => !known.has(p.url)), ...list];   // keep just-uploaded ones the CDN hasn't caught up with
    renderGallery();
  } catch (err) {
    console.warn('[gallery]', err);
    if (!photos.length) setGalleryState('error');
  }
}
moreBtn.addEventListener('click', () => { shown += PAGE; renderGallery(); });
// Load when the guest approaches the section, not on first paint.
new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); loadGallery(); } }, { rootMargin: '600px' }).observe($('#gallery'));

/* ---- lightbox ---- */
const lb = $('#lightbox'), lbImg = $('#lbImg');
let lbIndex = 0, lastFocus = null;
function showLb(i, dir = 0) {
  lbIndex = (i + photos.length) % photos.length;
  lbImg.classList.remove('swap-l', 'swap-r'); void lbImg.offsetWidth;
  if (dir) lbImg.classList.add(dir > 0 ? 'swap-l' : 'swap-r');
  lbImg.src = photos[lbIndex].url;
  $('#lbCount').textContent = `${lbIndex + 1} / ${photos.length}`;
  const many = photos.length > 1;
  $('#lbPrev').hidden = !many; $('#lbNext').hidden = !many;
}
function openLightbox(i) {
  lastFocus = document.activeElement;
  showLb(i);
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add('open'));
  document.body.classList.add('lb-open');
  $('#lbClose').focus();
}
function closeLightbox() {
  lb.classList.remove('open');
  document.body.classList.remove('lb-open');
  setTimeout(() => { lb.hidden = true; }, REDUCED ? 0 : 320);
  lastFocus?.focus();
}
$('#lbClose').onclick = closeLightbox;
$('#lbPrev').onclick = () => showLb(lbIndex - 1, -1);
$('#lbNext').onclick = () => showLb(lbIndex + 1, 1);
lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-figure')) closeLightbox(); });
addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') showLb(lbIndex + 1, 1);
  if (e.key === 'ArrowLeft') showLb(lbIndex - 1, -1);
  if (e.key === 'Tab') {   // keep focus inside the dialog
    const f = [...lb.querySelectorAll('button:not([hidden])')];
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});
let touchX = null;
lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  if (touchX === null || photos.length < 2) return;
  const dx = e.changedTouches[0].clientX - touchX; touchX = null;
  if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
});

/* ============================================================
   MESSAGE BOARD — /api/guestbook
   ============================================================ */
const board = $('#board'), boardMore = $('#boardMore');
let wishes = [], wishesShown = 6;
const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function ago(iso) {
  const s = (new Date(iso) - Date.now()) / 1000;
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, sec] of units) if (Math.abs(s) >= sec) return rel.format(Math.round(s / sec), u);
  return 'just now';
}
function wishCard(w, fresh = false) {
  const el = document.createElement('article');
  el.className = 'note' + (fresh ? ' fresh' : '');
  const msg = document.createElement('p'); msg.className = 'note-msg'; msg.textContent = w.message || '';
  const by = document.createElement('p'); by.className = 'note-by';
  const name = document.createElement('b'); name.textContent = w.name;
  const when = document.createElement('time'); when.dateTime = w.createdAt; when.textContent = ago(w.createdAt);
  by.append('— ', name, ' · ', when);
  if (w.drawing) {
    const ink = document.createElement('img');
    ink.className = 'note-ink'; ink.src = w.drawing; ink.loading = 'lazy'; ink.decoding = 'async';
    ink.alt = `Handwritten message from ${w.name}`;
    el.classList.add('has-ink');
    el.append(ink);
  }
  if (w.message) el.append(msg);
  el.append(by);
  return el;
}
const noteIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); noteIO.unobserve(e.target); } }), { threshold: .15 });
function renderBoard() {
  board.innerHTML = '';
  if (!wishes.length) { board.innerHTML = '<p class="g-empty">Be the first to leave us a message ♡</p>'; boardMore.hidden = true; return; }
  wishes.slice(0, wishesShown).forEach((w, i) => { const c = wishCard(w, w._fresh); c.style.setProperty('--i', i % 6); board.appendChild(c); noteIO.observe(c); });
  boardMore.hidden = wishes.length <= wishesShown;
}
async function loadWishes() {
  board.innerHTML = '<div class="g-skeleton notes">' + '<span></span>'.repeat(3) + '</div>';
  try { wishes = await api('/guestbook'); renderBoard(); }
  catch (err) { console.warn('[wishes]', err); board.innerHTML = '<p class="g-error">Messages couldn’t load right now.</p>'; }
}
boardMore.onclick = () => { wishesShown += 6; renderBoard(); };
new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); loadWishes(); } }, { rootMargin: '600px' }).observe($('#wishes'));

/* ---- handwriting pad: finger, Apple Pencil, stylus or mouse ---- */
const ink = (() => {
  const pad = $('#inkPad'), cv = $('#inkCanvas'), ctx = cv.getContext('2d');
  const strokes = [];             // each: { color, pts: [[x, y, w], ...] } in 0..1 space
  let current = null, color = '#5e431a', W = 0, H = 0;

  function size() {
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  // Pressure/velocity-aware width: quick strokes thin out like a real nib.
  function drawStroke(c, st, w, h, scale = 1) {
    const p = st.pts, n = p.length;
    c.strokeStyle = c.fillStyle = st.color; c.lineCap = 'round'; c.lineJoin = 'round';
    if (n === 1) { c.beginPath(); c.arc(p[0][0] * w, p[0][1] * h, p[0][2] * scale / 2, 0, 7); c.fill(); return; }
    const mid = (a, b) => [(a[0] + b[0]) / 2 * w, (a[1] + b[1]) / 2 * h];
    // Midpoint quadratic smoothing, one segment at a time so width can vary.
    for (let i = 1; i < n; i++) {
      const from = i === 1 ? [p[0][0] * w, p[0][1] * h] : mid(p[i - 2], p[i - 1]);
      const to = i === n - 1 ? [p[i][0] * w, p[i][1] * h] : mid(p[i - 1], p[i]);
      c.lineWidth = p[i][2] * scale;
      c.beginPath(); c.moveTo(from[0], from[1]);
      c.quadraticCurveTo(p[i - 1][0] * w, p[i - 1][1] * h, to[0], to[1]);
      c.stroke();
    }
  }
  function redraw() { ctx.clearRect(0, 0, W, H); strokes.forEach(st => drawStroke(ctx, st, W, H)); }
  function sync() {
    const has = strokes.length > 0;
    $('#inkUndo').disabled = $('#inkClear').disabled = !has;
    pad.classList.toggle('has-ink', has);
  }
  function point(e) {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const last = current?.pts.at(-1);
    const speed = last ? Math.hypot((x - last[0]) * r.width, (y - last[1]) * r.height) : 0;
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : null;
    const base = pressure !== null ? 1.4 + pressure * 4.2 : Math.max(1.6, 3.6 - speed * .09);
    const wv = last ? last[2] * .6 + base * .4 : base;   // smooth width changes
    return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)), wv];
  }
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    current = { color, pts: [] };
    current.pts.push(point(e));
    strokes.push(current);
    redraw(); sync();
  });
  cv.addEventListener('pointermove', e => {
    if (!current) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (evs.length ? evs : [e]).forEach(ev => current.pts.push(point(ev)));
    // only the active stroke needs repainting
    ctx.clearRect(0, 0, W, H); strokes.forEach(st => drawStroke(ctx, st, W, H));
  });
  const end = () => { current = null; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => cv.addEventListener(t, end));
  $('#inkUndo').onclick = () => { strokes.pop(); redraw(); sync(); };
  $('#inkClear').onclick = () => { strokes.length = 0; redraw(); sync(); };
  document.querySelectorAll('.ink-color').forEach(b => b.addEventListener('click', () => {
    color = b.dataset.ink;
    document.querySelectorAll('.ink-color').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); });
  }));
  new ResizeObserver(size).observe(cv);

  return {
    get empty() { return strokes.length === 0; },
    clear() { strokes.length = 0; redraw(); sync(); },
    /** Transparent PNG of just the ink, cropped to what was drawn. */
    async toBlob() {
      const OUT_W = 1000, OUT_H = Math.round(OUT_W * (H / W || .6));
      const scale = OUT_W / (W || OUT_W);
      const off = document.createElement('canvas');
      off.width = OUT_W; off.height = OUT_H;
      const c = off.getContext('2d');
      strokes.forEach(st => drawStroke(c, st, OUT_W, OUT_H, scale));
      // crop to the ink's bounding box (+ margin) so cards stay compact
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      strokes.forEach(st => st.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
      const m = 24;
      const sx = Math.max(0, x0 * OUT_W - m), sy = Math.max(0, y0 * OUT_H - m);
      const sw = Math.min(OUT_W - sx, (x1 - x0) * OUT_W + m * 2), sh = Math.min(OUT_H - sy, (y1 - y0) * OUT_H + m * 2);
      const crop = document.createElement('canvas');
      crop.width = Math.max(1, Math.round(sw)); crop.height = Math.max(1, Math.round(sh));
      crop.getContext('2d').drawImage(off, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
      return new Promise(res => crop.toBlob(res, 'image/png'));
    },
  };
})();

/* ---- Type / Write-by-hand tabs ---- */
const tabs = [$('#tabType'), $('#tabInk')], panels = [$('#panelType'), $('#panelInk')];
function selectTab(i, focus = false) {
  tabs.forEach((t, k) => { const on = k === i; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; panels[k].hidden = !on; });
  $('.mode-tabs').dataset.active = i;
  if (focus) tabs[i].focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(i));
  t.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); selectTab(1 - i, true); } });
});

const wishMsg = $('#wishMsg'), wishStatus = $('#wishStatus');
const formShownAt = Date.now();
let sendingWish = false;
wishMsg.addEventListener('input', () => { $('#wishCount').textContent = `${wishMsg.value.length} / 300`; });
$('#wishForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (sendingWish) return;                                  // no double submissions
  const name = $('#wishName').value.trim(), message = wishMsg.value.trim();
  wishStatus.className = 'form-status';
  const fail = (text, el) => { wishStatus.textContent = text; wishStatus.classList.add('err'); el?.focus(); };
  if (!name) return fail('Please write your name.', $('#wishName'));
  if (ink.empty && message.length < 3) {
    if (!panels[0].hidden) return fail('Please write a few words — or switch to “Write by hand”.', wishMsg);
    return fail('Write or draw something on the pad first.', tabs[1]);
  }
  const btn = $('#wishSend'); sendingWish = true; btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const form = new FormData();
    form.append('name', name);
    form.append('message', message);
    form.append('website', $('#wishTrap').value);
    form.append('t', String(Date.now() - formShownAt));
    if (!ink.empty) form.append('drawing', await ink.toBlob(), 'message.png');
    const r = await fetch(CONFIG.api + '/guestbook', { method: 'POST', body: form });
    if (!r.ok) throw new Error(r.status === 429 ? 'rate-limited' : 'HTTP ' + r.status);
    const entry = await r.json();
    e.target.reset(); ink.clear(); $('#wishCount').textContent = '0 / 300';
    if (entry.pending) {
      wishStatus.textContent = 'Thank you ♡ Your message will appear on the board shortly.';
    } else {
      entry._fresh = true;
      wishes.unshift(entry); wishesShown = Math.max(wishesShown, 6); renderBoard();
      wishStatus.textContent = 'Thank you — your message is on our board ♡';
    }
    wishStatus.classList.add('ok');
    if (!REDUCED) burst(btn.getBoundingClientRect(), 24);
  } catch (err) {
    console.warn('[wish]', err);
    fail(err.message === 'rate-limited' ? 'Too many messages in a short time — please try again in a few minutes.' : 'Your message couldn’t be sent. Please check your connection and try again.');
  } finally { sendingWish = false; btn.disabled = false; btn.textContent = 'Send with love'; }
});

/* ============================================================
   CLOSING — the couple's monogram (ح over م) draws itself in
   ============================================================ */
fetch('assets/monogram.svg').then(r => r.text()).then(svg => {
  const wrap = $('#closingMonogram');
  wrap.innerHTML = svg;
  const path = wrap.querySelector('path.ink');
  if (path) { const len = Math.ceil(path.getTotalLength()); wrap.style.setProperty('--len', len); }
}).catch(() => {});
