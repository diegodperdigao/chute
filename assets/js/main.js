(() => {
  'use strict';

  // URL do Web App do Google Apps Script (integracoes/apps-script/Code.gs), que grava a
  // inscrição na planilha e repassa ao CRM. Veja integracoes/README.md.
  // Ao atualizar o script, use "Gerenciar implantações → Nova versão" para manter esta URL.
  const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzViCpmeA9a69q8GTKRrIOjSbnHH6FoY1tUW2ENQ4GgRqputI61p_JrVgnMKyYOxVJX/exec';

  // Pixel da Meta exclusivo do Chute. Vazio = pixel desligado.
  // PageView na visita (único evento padrão); LeadAfiliado + o evento da faixa de seguidores,
  // ambos personalizados, só quando a inscrição é salva. "Até 10 mil" dispara só o LeadAfiliado.
  const META_PIXEL_ID = '1113780724748958';

  // Faixas de seguidores da etapa 2: definem o tier e, a partir de 10 mil, um evento próprio no pixel.
  const FAIXAS = {
    'ate_10k':   { evento: '',                       tier: 6 },
    '10k_50k':   { evento: 'LeadAfiliado_10k_50k',   tier: 5 },
    '50k_100k':  { evento: 'LeadAfiliado_50k_100k',  tier: 4 },
    '100k_300k': { evento: 'LeadAfiliado_100k_300k', tier: 3 },
    '300k_1M':   { evento: 'LeadAfiliado_300k_1M',   tier: 2 },
    '1M_mais':   { evento: 'LeadAfiliado_1M_mais',   tier: 1 },
  };

  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- pixel ---------- */
  if (META_PIXEL_ID) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
  }

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
    { step: 1, name: 'nome', err: 'e-nome', check: f => f.nome.value.trim().length >= 2 || 'Conta pra gente seu nome.' },
    { step: 1, name: 'email', err: 'e-email', check: f => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()) || 'Confira o e-mail.' },
    { step: 1, name: 'whatsapp', err: 'e-whats', check: f => /^\d{10,11}$/.test(f.whatsapp.value.replace(/\D/g, '')) || 'Informe o WhatsApp com DDD.' },
    { step: 2, name: 'tipo', err: 'e-tipo', check: f => !!f.tipo.value || 'Escolha o que melhor descreve você.' },
    { step: 2, name: 'perfil', err: 'e-perfil', check: f => f.perfil.value.trim().length >= 2 || 'Informe seu @ ou o link do canal.' },
    { step: 2, name: 'seguidores', err: 'e-seguidores', check: f => !!FAIXAS[f.seguidores.value] || 'Escolha quantos seguidores você tem.' },
    { step: 2, name: 'aceite', err: 'e-aceite', check: f => f.aceite.checked || 'Confirme que tem 18 anos ou mais e aceita os termos.' },
  ];

  // only: nome de um campo; step: número da etapa; sem nada: formulário inteiro
  function validate(only, step) {
    let firstBad = null;
    for (const r of RULES) {
      if (only && only !== r.name) continue;
      if (step && step !== r.step) continue;
      const res = r.check(form.elements);
      const ok = res === true;
      const errEl = document.getElementById(r.err);
      errEl.textContent = ok ? '' : res;
      errEl.closest('.field').classList.toggle('has-error', !ok);
      const el = form.elements[r.name];
      const target = el instanceof RadioNodeList ? el[0] : el; // radio groups: flag/focus the first option
      target.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstBad) firstBad = target;
    }
    return firstBad;
  }

  /* ---------- etapas ---------- */
  const steps = form.querySelectorAll('.step');
  const dots = form.querySelectorAll('.progress li');
  function goTo(n) {
    steps.forEach(st => {
      const on = +st.dataset.step === n;
      st.hidden = !on;
      st.classList.toggle('is-back', on && n === 1);
    });
    dots.forEach(d => {
      const k = +d.dataset.dot;
      d.classList.toggle('is-on', k === n);
      d.classList.toggle('is-done', k < n);
    });
    const first = form.querySelector(`.step[data-step="${n}"] input:not([type="hidden"])`);
    if (first) first.focus({ preventScroll: true });
  }
  $('#f-next').addEventListener('click', () => {
    const bad = validate(null, 1);
    if (bad) { bad.focus(); return; }
    goTo(2);
  });
  $('#f-back').addEventListener('click', () => goTo(1));
  // Enter nos campos da etapa 1 avança em vez de enviar
  form.querySelector('.step[data-step="1"]').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); $('#f-next').click(); }
  });

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

  // id da tentativa: o mesmo em todas as repetições, para o Apps Script não gravar duas vezes
  const novoId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
  let envioId = novoId();

  // envia com tempo limite; em falha de rede ou servidor ocupado tenta de novo (até 3 vezes)
  async function enviar(payload) {
    const esperas = [0, 1500, 4000];
    let ultimo;
    for (const espera of esperas) {
      if (espera) await new Promise(r => setTimeout(r, espera));
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
          signal: ctrl.signal,
        });
        const out = res.ok ? await res.json().catch(() => ({})) : {};
        if (out.ok) return out;
        // dado recusado pelo script: repetir não adianta
        if (out.erro) throw Object.assign(new Error(out.erro), { final: true });
        ultimo = new Error('HTTP ' + res.status);
      } catch (err) {
        if (err.final) throw err;
        ultimo = err;
      } finally {
        clearTimeout(timer);
      }
    }
    throw ultimo;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submit.getAttribute('aria-busy') === 'true') return;
    status.textContent = '';
    const bad1 = validate(null, 1);
    if (bad1) { goTo(1); bad1.focus(); return; }
    const bad = validate(null, 2);
    if (bad) { bad.focus(); return; }

    const f = form.elements;
    const faixa = FAIXAS[f.seguidores.value];
    const payload = {
      nome: f.nome.value.trim(),
      email: f.email.value.trim(),
      whatsapp: f.whatsapp.value.replace(/\D/g, ''),
      tipo: f.tipo.value,
      perfil: f.perfil.value.trim(),
      seguidores: f.seguidores.value,
      tier: faixa.tier,
      aceite_termos: true,
      empresa: f.empresa.value, // honeypot: real people leave it empty
      origem: location.href.split('#')[0],
      enviado_em: new Date().toISOString(),
      envio_id: envioId,
      ...utm(),
    };

    const label = submit.querySelector('.btn__label');
    submit.setAttribute('aria-busy', 'true');
    label.textContent = 'Enviando…';
    try {
      if (FORM_ENDPOINT) {
        await enviar(payload);
      } else {
        console.warn('[Chute] FORM_ENDPOINT vazio: inscrição não foi salva.', payload);
        await new Promise(r => setTimeout(r, 600));
      }
      if (META_PIXEL_ID && window.fbq) {
        fbq('trackCustom', 'LeadAfiliado', { tier: faixa.tier });
        if (faixa.evento) fbq('trackCustom', faixa.evento, { tier: faixa.tier });
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
