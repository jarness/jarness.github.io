// Vent til DOM er klar (stabilitet på iOS)
document.addEventListener('DOMContentLoaded', () => {

  /* ===========================
     Smooth scroll (Lenis)
  =========================== */
  const lenis = window.Lenis ? new Lenis({ smooth: true, lerp: 0.08 }) : null;

  /* ===========================
     GSAP + ScrollTrigger sync
     (kritisk fix på iPhone)
  =========================== */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Synk Lenis med ScrollTrigger
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => {
        lenis.raf(t * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  } else {
    // Fallback RAF hvis GSAP mangler
    function raf(time){ lenis && lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ===========================
     Anchor smooth scroll
  =========================== */
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id = a.getAttribute('href');
      if(id.length > 1){
        e.preventDefault();
        const el = document.querySelector(id);
        if(!el) return;
        if(lenis) lenis.scrollTo(el, { offset: -8 });
        else el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* ===========================
     Sticky nav show/hide
  =========================== */
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero');
  const navObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){ nav.classList.remove('show'); }
      else { nav.classList.add('show'); }
    });
  }, { rootMargin: '-60px 0px 0px 0px' });
  navObserver.observe(hero);

  /* ===========================
     Parallax på billedet
  =========================== */
  if (window.gsap && window.ScrollTrigger) {
    gsap.to('.hero-img', {
      scale: 0.965,
      y: 18,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ===========================
     Reveal af sektioner (fail-safe)
  =========================== */
  const reveals = document.querySelectorAll('[data-reveal]');
  // KUN skjul dem hvis JS kører
  reveals.forEach(el => el.classList.add('hidden'));

  function mountReveals(){
    if (window.gsap && window.ScrollTrigger) {
      reveals.forEach(el=>{
        gsap.fromTo(el,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 94%',    // lidt tidligere på mobil
              once: true,
              invalidateOnRefresh: true
            },
            onStart: ()=> el.classList.remove('hidden')
          }
        );
      });
      // Ekstra: tving et refresh lige efter mount
      setTimeout(()=> ScrollTrigger.refresh(), 50);
    } else {
      const io = new IntersectionObserver((entries, obs)=>{
        entries.forEach(en=>{
          if(en.isIntersecting){
            en.target.classList.remove('hidden');
            obs.unobserve(en.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
      reveals.forEach(el=> io.observe(el));
    }
  }
  mountReveals();

  // Fail-safe: hvis intet har fjernet .hidden efter 2000ms, så vis
  setTimeout(()=> {
    reveals.forEach(el => el.classList.remove('hidden'));
  }, 2000);

  /* ===========================
     Tving refresh når layout er klar
     (fonts + hero-billede + vinduets load)
  =========================== */
  const heroImg = document.querySelector('.hero-img');
  function doRefresh(){ if (window.ScrollTrigger) ScrollTrigger.refresh(); }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(doRefresh).catch(()=>{});
  }
  if (heroImg && !heroImg.complete) {
    heroImg.addEventListener('load', doRefresh, { once:true });
    heroImg.addEventListener('error', doRefresh, { once:true });
  }
  window.addEventListener('load', () => {
    doRefresh();
    // Nogle iOS-versioner kræver endnu en refresh efter en frame
    setTimeout(doRefresh, 120);
  }, { once:true });

  /* ===========================
     Hearts canvas
  =========================== */
  (function hearts(){
    const c = document.getElementById('hearts');
    const ctx = c.getContext('2d');
    let W,H, DPR = window.devicePixelRatio || 1;
    const hearts = [];
    const R = (a,b)=> a + Math.random()*(b-a);

    function resize(){
      const parent = c.parentElement;
      W = c.clientWidth = parent.clientWidth;
      H = c.clientHeight = parent.clientHeight;
      c.width = W * DPR; c.height = H * DPR;
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    window.addEventListener('resize', resize, { passive:true });
    resize();

    function makeHeart(initial=false){
      const yStart = initial ? R(-20, H+20) : H + R(10, 120);
      return { x: R(0, W), y: yStart, size: R(10, 20), speed: R(22, 40), drift: R(-14, 14), alpha: R(.28, .6) };
    }

    const COUNT = 36;
    for(let i=0;i<COUNT;i++) hearts.push(makeHeart(true));

    function drawHeart(x,y,s,a){
      ctx.save(); ctx.translate(x,y); ctx.scale(s/14, s/14); ctx.globalAlpha = a; ctx.fillStyle = '#002eff';
      ctx.beginPath(); ctx.moveTo(0,5);
      ctx.bezierCurveTo(-8,-6, -14,4, 0,16);
      ctx.bezierCurveTo(14,4, 8,-6, 0,5);
      ctx.fill(); ctx.restore();
    }

    let last=performance.now();
    function tick(ts){
      const dt = Math.min(32, ts - last); last = ts;
      ctx.clearRect(0,0,W,H);
      for(const h of hearts){
        h.y -= (h.speed * dt/1000);
        h.x += h.drift * dt/5000;
        drawHeart(h.x, h.y, h.size, h.alpha);
        if(h.y < -24) Object.assign(h, makeHeart(false), { y: H + 24, x: R(0,W) });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ===========================
     Countdown
  =========================== */
  const target = new Date('Jan 10, 2026 13:00:00').getTime();
  const ids = ['days','hours','minutes','seconds'];
  const prev = { days:null, hours:null, minutes:null, seconds:null };

  function updateCountdown(){
    const now = Date.now();
    let diff = Math.max(0, target - now);

    const d = Math.floor(diff / (1000*60*60*24)); diff -= d*(1000*60*60*24);
    const h = Math.floor(diff / (1000*60*60));     diff -= h*(1000*60*60);
    const m = Math.floor(diff / (1000*60));        diff -= m*(1000*60);
    const s = Math.floor(diff / 1000);

    const map = { days:d, hours:h, minutes:m, seconds:s };
    ids.forEach(id=>{
      const el = document.getElementById(id);
      const val = map[id];
      if (prev[id] !== val){
        el.textContent = val;
        el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
        prev[id] = val;
      }
    });
    if(target - now <= 0){
      const strip = document.querySelector('.countdown-strip');
      if (strip) strip.innerHTML = '<p style="font-weight:700;font-size:1.2rem;margin:0">Vi er gift! 💍</p>';
      clearInterval(timer);
    }
  }
  const timer = setInterval(updateCountdown, 1000);
  updateCountdown();

}); // DOMContentLoaded
