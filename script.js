/* ============================================================
   EDIT YOUR WEDDING DETAILS HERE
   ============================================================ */
const CONFIG = {
  date: '2026-12-16T19:00:00+02:00',        // wedding date & time (Cairo time)
  groomParents: '',                          // e.g. 'Son of Mr & Mrs Ahmed Ali'
  brideParents: '',                          // e.g. 'Daughter of Mr & Mrs Mohamed Hassan'
  city: 'CAIRO',
  venue: 'Grand Ballroom, Cairo, Egypt',
  mapQuery: 'Cairo, Egypt',                  // what Google Maps should search for
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

const stages = [['s-glow', 0], ['s-foil', 450], ['s-open', 2300], ['s-part', 3500]];
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
  }, 4200);
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
let revealed = 0;
document.querySelectorAll('.scratch-card canvas').forEach(cv => {
  const ctx = cv.getContext('2d');
  let drawing = false, done = false, moves = 0, last = null;

  function paint() {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.scale(dpr, dpr);
    const w = r.width, h = r.height;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f6e6b4'); g.addColorStop(.3, '#d7b36a'); g.addColorStop(.5, '#f8e9bd');
    g.addColorStop(.72, '#c89d52'); g.addColorStop(1, '#ecd395');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // foil grain
    for (let i = 0; i < w * h / 6; i++) {
      ctx.fillStyle = `rgba(${Math.random() > .5 ? '255,255,255' : '120,85,30'},${Math.random() * .12})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    // sheen
    const s = ctx.createLinearGradient(0, h, w, 0);
    s.addColorStop(.35, 'rgba(255,255,255,0)'); s.addColorStop(.5, 'rgba(255,255,255,.45)'); s.addColorStop(.65, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦', w / 2, h / 2);
  }
  requestAnimationFrame(paint);

  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function scratch(p) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 30;
    ctx.beginPath();
    if (last) { ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill();
    last = p;
    if (++moves % 8 === 0) check();
  }
  function check() {
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let clear = 0;
    for (let i = 3; i < d.length; i += 16) if (d[i] === 0) clear++;
    if (clear / (d.length / 16) > .45) finish();
  }
  function finish() {
    if (done) return; done = true; cv.classList.add('done');
    burst(cv.getBoundingClientRect(), 18);
    if (++revealed === 3) { $('#dWeekday').classList.add('shown'); burst($('.scratch-row').getBoundingClientRect(), 60); }
  }
  cv.addEventListener('pointerdown', e => { drawing = true; last = null; cv.setPointerCapture(e.pointerId); scratch(pos(e)); });
  cv.addEventListener('pointermove', e => { if (drawing) scratch(pos(e)); });
  ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { drawing = false; last = null; check(); }));
});

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
