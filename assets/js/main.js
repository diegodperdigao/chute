(() => {
  'use strict';

  // Links de destino. Troque aqui quando os endereços definitivos estiverem prontos.
  const LINKS = {
    app: 'https://chute.com.br',
    parceiro: 'https://chute.com.br', // TODO: link do contato comercial para parceiros
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  $$('[data-link]').forEach(a => {
    const href = LINKS[a.dataset.link];
    if (href) a.href = href;
  });

  /* ---------- marquees ---------- */
  function fillTrack(track, attr, minItems) {
    const items = track.dataset[attr].split('|');
    let set = [];
    while (set.length < minItems) set = set.concat(items);
    const html = set.map(t => `<span>${t}</span>`).join('');
    track.innerHTML = html + html; // duplicated half makes the -50% loop seamless
  }
  $$('[data-ticker]').forEach(t => fillTrack(t, 'ticker', 20));
  $$('[data-leagues]').forEach(t => fillTrack(t, 'leagues', 10));

  /* ---------- scroll progress + current nav item ---------- */
  const bar = $('.progress span');
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    bar.style.setProperty('--p', p.toFixed(4));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav__links a');
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) navIO.observe(s); });

  /* ---------- hero: spotlight + parallax ---------- */
  const hero = $('.hero');
  const stage = $('.hero__stage');
  $$('.parallax').forEach(el => el.style.setProperty('--depth', el.dataset.depth || 0));
  if (hero && finePointer && !reduced) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      hero.style.setProperty('--sx', (x * 100).toFixed(1) + '%');
      hero.style.setProperty('--sy', (y * 100).toFixed(1) + '%');
      stage.style.setProperty('--mx', ((x - .5) * 2).toFixed(3));
      stage.style.setProperty('--my', ((y - .5) * 2).toFixed(3));
    });
    hero.addEventListener('pointerleave', () => {
      stage.style.setProperty('--mx', 0);
      stage.style.setProperty('--my', 0);
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.translate = `${dx * .18}px ${dy * .28}px`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
    });
  }

  /* ---------- 3D tilt ---------- */
  if (finePointer && !reduced) {
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- confetti ---------- */
  const canvas = $('.confetti');
  const ctx = canvas.getContext('2d');
  let parts = [];
  let raf = 0;
  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  addEventListener('resize', sizeCanvas);
  function burst(x, y) {
    if (reduced) return;
    const colors = ['#F2FD41', '#C996F9', '#F7F6F2', '#F2FD41'];
    for (let i = 0; i < 120; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 9;
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
        w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
        r: Math.random() * Math.PI, vr: (Math.random() - .5) * .4,
        c: colors[i % colors.length], life: 1,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= .008;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  /* ---------- demo: Mais ou Menos ---------- */
  const ATHLETES = [
    { first: 'Almeida Gabriel', last: 'Barbosa', line: 2.5, stat: 'Finalizações', unit: 'finalizações', shirt: 'white' },
    { first: 'Yuri', last: 'Alberto', line: 1.5, stat: 'Finalizações no gol', unit: 'finalizações no gol', shirt: 'white' },
    { first: 'André', last: 'Silva', line: 3.5, stat: 'Finalizações', unit: 'finalizações', shirt: 'red' },
    { first: 'Alan', last: 'Franco', line: 1.5, stat: 'Faltas cometidas', unit: 'faltas cometidas', shirt: 'black' },
    { first: '', last: 'Pedro', line: 2.5, stat: 'Finalizações', unit: 'finalizações', shirt: 'stripes' },
  ];
  const SHIRTS = {
    white: ['#F4F4F0', '#151515'],
    red: ['#C8262B', '#151515'],
    black: ['#1D1D1B', '#F4F4F0'],
    stripes: ['url(#stripes)', '#151515'],
  };
  const pick = $('#pick');
  const el = {
    first: $('#pick-first'), last: $('#pick-last'), line: $('#pick-line'), stat: $('#pick-stat'),
    shirt: $('#pick-shirt'), live: $('#pick-live'), minute: $('#pick-minute'), bar: $('#pick-bar'),
    count: $('#pick-count'), countLabel: $('#pick-count-label'), btns: $('#pick-btns'),
    result: $('#pick-result'), verdict: $('#pick-verdict'), next: $('#pick-next'),
    hits: $('#score-hits'), plays: $('#score-plays'),
  };
  let idx = 0, hits = 0, plays = 0, running = false;
  const fmt = n => String(n).replace('.', ',');

  function loadAthlete(i) {
    const a = ATHLETES[i];
    el.first.textContent = a.first;
    el.first.hidden = !a.first;
    el.last.textContent = a.last;
    el.line.textContent = fmt(a.line);
    el.stat.textContent = a.stat;
    el.countLabel.textContent = a.unit;
    const [body, collar] = SHIRTS[a.shirt];
    el.shirt.style.setProperty('--shirt', body);
    el.shirt.style.setProperty('--collar', collar);
    el.live.hidden = true;
    el.result.hidden = true;
    pick.dataset.state = 'idle';
    $$('.pick__btn', pick).forEach(b => { b.disabled = false; b.classList.remove('is-picked'); });
  }

  function poisson(lambda) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }

  function play(choice, btn) {
    if (running) return;
    running = true;
    const a = ATHLETES[idx];
    $$('.pick__btn', pick).forEach(b => { b.disabled = true; });
    btn.classList.add('is-picked');
    pick.dataset.state = 'live';
    el.live.hidden = false;

    const total = poisson(a.line + .05);
    const events = Array.from({ length: total }, () => 1 + Math.random() * 89).sort((x, y) => x - y);
    const duration = reduced ? 300 : 3200;
    const t0 = performance.now();
    let shown = 0;
    el.count.textContent = '0';

    const step = now => {
      const k = Math.min(1, (now - t0) / duration);
      const minute = Math.round(k * 90);
      el.minute.textContent = minute + "'";
      el.bar.style.width = (k * 100) + '%';
      while (shown < events.length && events[shown] <= minute) {
        shown++;
        el.count.textContent = shown;
        el.count.classList.remove('bump'); void el.count.offsetWidth; el.count.classList.add('bump');
      }
      if (k < 1) return requestAnimationFrame(step);
      finish(choice, total, a);
    };
    requestAnimationFrame(step);
  }

  function finish(choice, total, a) {
    const won = choice === 'mais' ? total > a.line : total < a.line;
    plays++;
    if (won) hits++;
    el.plays.textContent = plays;
    el.hits.textContent = hits;
    pick.dataset.state = won ? 'win' : 'lose';
    el.verdict.textContent = won ? 'Acertou o chute!' : 'Não foi dessa vez';
    el.result.hidden = false;
    if (won) {
      const r = pick.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 3);
    } else if (!reduced) {
      pick.classList.remove('is-shake'); void pick.offsetWidth; pick.classList.add('is-shake');
    }
    running = false;
    el.next.focus({ preventScroll: true });
  }

  el.btns.addEventListener('click', e => {
    const b = e.target.closest('[data-choice]');
    if (b && !b.disabled) play(b.dataset.choice, b);
  });
  el.next.addEventListener('click', () => {
    idx = (idx + 1) % ATHLETES.length;
    loadAthlete(idx);
  });
  loadAthlete(0);

  /* ---------- steps: scroll-synced phone highlight ---------- */
  const steps = $$('.step');
  const hl = $('#phone-hl');
  const activate = n => {
    steps.forEach(s => s.classList.toggle('is-active', s.dataset.step === n));
    hl.dataset.step = n;
  };
  const stepIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) activate(e.target.dataset.step); });
  }, { rootMargin: '-42% 0px -42% 0px' });
  steps.forEach(s => {
    stepIO.observe(s);
    s.addEventListener('click', () => activate(s.dataset.step));
  });

  /* ---------- formats switch ---------- */
  const formats = $('.formats');
  const board = $('#format-board');
  $$('.switch [data-format]').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.format;
      formats.dataset.format = f;
      board.dataset.format = f;
      $$('.switch [data-format]').forEach(b => b.setAttribute('aria-selected', String(b === btn)));
      $$('.formats__desc').forEach(p => { p.hidden = p.dataset.for !== f; });
    });
  });
  formats.dataset.format = 'cravada';

  /* ---------- markets ---------- */
  const MARKETS = {
    futebol: {
      label: 'Brasileirão A e B, Premier League, Champions, Bundesliga, Serie A, Ligue 1 e MLS',
      items: ['Finalizações', 'Finalizações no gol', 'Passes', 'Gols', 'Assistências', 'Cartões'],
      color: 'var(--volt)',
    },
    basquete: {
      label: 'NBA',
      items: ['Pontos', 'Rebotes', 'Assistências', 'Bolas de 3', 'Pts + Reb + Ast'],
      color: 'var(--lilac)',
    },
  };
  const grid = $('#markets-grid');
  const label = $('#markets-label');
  const arrows = '<span class="market__arrows" aria-hidden="true"><i><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></i><i><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg></i></span>';
  function renderMarkets(sport) {
    const m = MARKETS[sport];
    label.textContent = m.label;
    grid.innerHTML = m.items.map((t, i) =>
      `<li class="market" style="--i:${i};--mk:${m.color}"><p>${t}</p>${arrows}</li>`).join('');
  }
  $$('.markets__tabs [data-sport]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.markets__tabs [data-sport]').forEach(b => b.setAttribute('aria-selected', String(b === btn)));
      renderMarkets(btn.dataset.sport);
    });
  });
  renderMarkets('futebol');

  /* ---------- resenha: activity toasts ---------- */
  const toasts = $('#toasts');
  const MSGS = [['+1', 'copiou a escalação'], ['♥', 'curtiu'], ['…', 'comentou'], ['+1', 'copiou a escalação'], ['→', 'começou a seguir']];
  let toastTimer = 0;
  function spawnToast() {
    const [ic, txt] = MSGS[Math.floor(Math.random() * MSGS.length)];
    const t = document.createElement('span');
    t.className = 'toast';
    t.innerHTML = `<i>${ic}</i>${txt}`;
    t.style.left = (4 + Math.random() * 52) + '%';
    t.style.top = (8 + Math.random() * 76) + '%';
    toasts.appendChild(t);
    t.addEventListener('animationend', () => t.remove());
  }
  if (!reduced) {
    new IntersectionObserver(([e]) => {
      clearInterval(toastTimer);
      if (e.isIntersecting) { spawnToast(); toastTimer = setInterval(spawnToast, 1100); }
    }).observe($('.resenha__art'));
  }

  /* ---------- count-up ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      if (reduced) return;
      const to = +e.target.dataset.to;
      const t0 = performance.now();
      const run = now => {
        const k = Math.min(1, (now - t0) / 1400);
        e.target.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    });
  }, { threshold: .6 });
  $$('.countup').forEach(n => countIO.observe(n));
})();
