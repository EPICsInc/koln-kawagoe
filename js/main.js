/* ============================================================
   鉄板焼ケルン 川越 — main.js（共通の動き：ローダー・スクロール表示・フォーム）
   loader / smoke canvas / reveals / parallax / form validation
============================================================ */
(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------- loader */
  // ローダーはトップページのみ。下層ページ（コンセプト／お品書き）には無いので、
  // #loader が存在するときだけスクロールを止める。
  const loader = document.getElementById('loader');
  if (loader) document.body.classList.add('is-loading');

  const finishLoading = () => {
    if (loader && loader.classList.contains('is-done')) return;
    if (loader) loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-loaded');
  };
  window.addEventListener('load', () => {
    // ローダーの無いページは待たずに即表示
    setTimeout(finishLoading, (prefersReduced || !loader) ? 0 : 2600);
  });
  // フォールバック（回線遅延時も約4.8秒で必ず開く）
  setTimeout(finishLoading, 4800);

  /* ---------------------------------------------- header state */
  const header = document.getElementById('header');
  const fixedCta = document.getElementById('fixedCta');
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (fixedCta) fixedCta.classList.toggle('is-shown', y > window.innerHeight * 0.7);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- 未設定リンク（href="#"）は押しても何もしない（例：ご予約ボタン。URL設定後は自動で有効） ---- */
  document.querySelectorAll('a[href="#"]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });

  /* ---------------------------------------------- mobile menu */
  const menuToggle = document.getElementById('menuToggle');
  const gnav = document.getElementById('gnav');
  if (menuToggle && gnav) {
    const closeMenu = () => {
      menuToggle.classList.remove('is-open');
      gnav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };
    menuToggle.addEventListener('click', () => {
      const open = gnav.classList.toggle('is-open');
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    gnav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  }

  /* ---------------------------------------------- marquee (duplicate track) */
  const track = document.getElementById('marqueeTrack');
  if (track) {
    const span = track.querySelector('span');
    for (let i = 0; i < 3; i++) track.appendChild(span.cloneNode(true));
  }

  /* ---------------------------------------------- reveal on scroll */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal, .reveal-img').forEach(el => io.observe(el));

  /* ---------------------------------------------- parallax */
  const pxEls = [...document.querySelectorAll('[data-parallax]')];
  const pxBgs = [...document.querySelectorAll('[data-parallax-bg]')];
  if (!prefersReduced && (pxEls.length || pxBgs.length)) {
    let ticking = false;
    const parallax = () => {
      const vh = window.innerHeight;
      pxEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const depth = parseFloat(el.dataset.parallax) || 20;
        const progress = (r.top + r.height / 2 - vh / 2) / vh; // -0.5〜0.5
        el.style.transform = `translateY(${(-progress * depth).toFixed(2)}px)`;
      });
      pxBgs.forEach(el => {
        const parent = el.parentElement.getBoundingClientRect();
        if (parent.bottom < 0 || parent.top > vh) return;
        const progress = (parent.top + parent.height / 2 - vh / 2) / vh;
        el.style.transform = `translateY(${(progress * 60).toFixed(2)}px)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(parallax); ticking = true; }
    }, { passive: true });
    parallax();
  }

  /* ---------------------------------------------- smoke (CSSアニメーション) */
  // 描画はCSS（transform/opacity）に任せ、JSはヒーローが画面外に出たときに
  // アニメーションを止めるだけ。毎フレームのJS処理・canvas描画は行わない。
  const smoke = document.getElementById('heroSmoke');
  if (smoke) {
    const smokeIO = new IntersectionObserver(([e]) => {
      smoke.classList.toggle('is-paused', !e.isIntersecting);
    }, { threshold: 0 });
    smokeIO.observe(smoke);
  }

  /* ---------------------------------------------- contact form validation */
  const form = document.getElementById('contactForm');
  if (form) {
    const nameEl = document.getElementById('fName');
    const mailEl = document.getElementById('fEmail');
    const telEl  = document.getElementById('fTel');
    const bodyEl = document.getElementById('fBody');
    const submit = document.getElementById('submitBtn');
    const hint   = document.getElementById('formHint');

    const mailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const telOk  = v => v === '' || /^[0-9]+$/.test(v);

    const validators = [
      { el: nameEl, ok: () => nameEl.value.trim() !== '' },
      { el: mailEl, ok: () => mailOk(mailEl.value.trim()) },
      { el: telEl,  ok: () => telOk(telEl.value.trim()) },
      { el: bodyEl, ok: () => bodyEl.value.trim() !== '' },
    ];

    const setError = (el, show) =>
      el.closest('.form__row').classList.toggle('has-error', show);

    const refresh = () => {
      const allOk = validators.every(v => v.ok());
      submit.disabled = !allOk;
      return allOk;
    };

    validators.forEach(({ el, ok }) => {
      el.addEventListener('blur', () => setError(el, !ok()));
      el.addEventListener('input', () => {
        if (ok()) setError(el, false);
        refresh();
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let allOk = true;
      validators.forEach(({ el, ok }) => {
        const good = ok();
        setError(el, !good);
        if (!good) allOk = false;
      });
      if (!allOk) return;
      // ── mock送信（実装時はここでAPI/フォームサービスへPOST） ──
      form.reset();
      refresh();
      hint.textContent = '送信しました。担当者より折り返しご連絡いたします。（モック動作）';
      hint.classList.add('is-sent');
    });

    refresh();
  }
})();
