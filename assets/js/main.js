(() => {
  'use strict';

  // Para onde as inscrições são enviadas (POST com JSON).
  // TODO: definir o destino (planilha, CRM, Supabase, webhook...). Enquanto estiver vazio,
  // o formulário só simula o envio e as inscrições NÃO são salvas.
  const FORM_ENDPOINT = '';

  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- marquees ---------- */
  const fill = (track, list, min) => {
    let set = [];
    while (set.length < min) set = set.concat(list.split('|'));
    const html = set.map(t => `<span>${t}</span>`).join('');
    track.innerHTML = html + html; // duplicated half makes the -50% loop seamless
  };
  document.querySelectorAll('[data-ticker]').forEach(t => fill(t, t.dataset.ticker, 14));

  /* ---------- cursor spotlight ---------- */
  const bg = $('.bg');
  if (matchMedia('(pointer: fine)').matches && !reduced) {
    $('.stage').addEventListener('pointermove', e => {
      const r = bg.getBoundingClientRect();
      bg.style.setProperty('--sx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      bg.style.setProperty('--sy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }

  /* ---------- magnetic button ---------- */
  if (matchMedia('(pointer: fine)').matches && !reduced) {
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.translate = `${(e.clientX - r.left - r.width / 2) * .18}px ${(e.clientY - r.top - r.height / 2) * .28}px`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
    });
  }

  /* ---------- confetti ---------- */
  const canvas = $('.confetti');
  const ctx = canvas.getContext('2d');
  let parts = [], raf = 0;
  const sizeCanvas = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  sizeCanvas();
  addEventListener('resize', sizeCanvas);
  function burst(x, y) {
    if (reduced) return;
    const colors = ['#F2FD41', '#C996F9', '#0E0E0D'];
    for (let i = 0; i < 130; i++) {
      const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 10;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 7, w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
        r: Math.random() * Math.PI, vr: (Math.random() - .5) * .4, c: colors[i % 3], life: 1 });
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
  }

  /* ---------- form ---------- */
  const form = $('#lead-form');
  const done = $('#lead-done');
  const submit = $('#f-submit');
  const status = $('#f-status');
  const whats = $('#f-whats');

  // (11) 91234-5678 mask
  whats.addEventListener('input', () => {
    const d = whats.value.replace(/\D/g, '').slice(0, 11);
    let out = d;
    if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) out = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    whats.value = out;
  });

  const RULES = [
    { name: 'nome', err: 'e-nome', check: f => f.nome.value.trim().length >= 2 || 'Conta pra gente seu nome.' },
    { name: 'email', err: 'e-email', check: f => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()) || 'Confira o e-mail.' },
    { name: 'whatsapp', err: 'e-whats', check: f => /^\d{10,11}$/.test(f.whatsapp.value.replace(/\D/g, '')) || 'Informe o WhatsApp com DDD.' },
    { name: 'perfil', err: 'e-perfil', check: f => f.perfil.value.trim().length >= 2 || 'Informe seu @ ou o link do canal.' },
    { name: 'aceite', err: 'e-aceite', check: f => f.aceite.checked || 'Confirme que tem 18 anos ou mais e aceita os termos.' },
  ];

  function validate(only) {
    let firstBad = null;
    for (const r of RULES) {
      if (only && only !== r.name) continue;
      const res = r.check(form.elements);
      const ok = res === true;
      const errEl = document.getElementById(r.err);
      errEl.textContent = ok ? '' : res;
      errEl.closest('.field').classList.toggle('has-error', !ok);
      form.elements[r.name].setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstBad) firstBad = form.elements[r.name];
    }
    return firstBad;
  }

  // re-validate a field as soon as it is fixed
  form.addEventListener('input', e => {
    if (e.target.closest('.field')?.classList.contains('has-error')) validate(e.target.name);
  });

  /* ---------- terms dialog ---------- */
  const terms = $('#termos');
  const aceite = $('#f-aceite');
  document.querySelectorAll('.terms-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault(); // keep the label from toggling the checkbox
      if (terms.showModal) terms.showModal(); else terms.setAttribute('open', '');
    });
  });
  const closeTerms = () => (terms.close ? terms.close() : terms.removeAttribute('open'));
  terms.querySelector('[data-close]').addEventListener('click', closeTerms);
  terms.querySelector('[data-accept]').addEventListener('click', () => {
    aceite.checked = true;
    validate('aceite');
    closeTerms();
    aceite.focus({ preventScroll: true });
  });
  terms.addEventListener('click', e => { if (e.target === terms) closeTerms(); });

  function utm() {
    const out = {};
    try {
      const q = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'].forEach(k => { if (q.get(k)) out[k] = q.get(k); });
    } catch (_) { /* no query string available */ }
    return out;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.textContent = '';
    const bad = validate();
    if (bad) { bad.focus(); return; }

    const f = form.elements;
    const payload = {
      nome: f.nome.value.trim(),
      email: f.email.value.trim(),
      whatsapp: f.whatsapp.value.replace(/\D/g, ''),
      perfil: f.perfil.value.trim(),
      aceite_termos: true,
      origem: location.href.split('#')[0],
      enviado_em: new Date().toISOString(),
      ...utm(),
    };

    const label = submit.querySelector('.btn__label');
    submit.setAttribute('aria-busy', 'true');
    label.textContent = 'Enviando…';
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } else {
        console.warn('[Chute] FORM_ENDPOINT vazio: inscrição não foi salva.', payload);
        await new Promise(r => setTimeout(r, 600));
      }
      $('#done-name').textContent = payload.nome.split(' ')[0];
      form.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      $('.hero__form').classList.add('is-done');
      const r = done.getBoundingClientRect();
      burst(r.left + 60, r.top + 40);
    } catch (err) {
      status.textContent = 'Não conseguimos enviar agora. Confira sua conexão e tente de novo.';
    } finally {
      submit.removeAttribute('aria-busy');
      label.textContent = 'Enviar inscrição';
    }
  });
})();
