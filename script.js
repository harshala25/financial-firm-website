/* ===== STRAVIA — site scripts ===== */
document.documentElement.classList.add('js');

/* ---------- Footer year ----------
   Keeps the copyright year current so nobody has to edit seven files each January.
   The HTML still contains a real year, so it reads correctly with JavaScript off. */
document.addEventListener('DOMContentLoaded', () => {
  const y = String(new Date().getFullYear());
  document.querySelectorAll('.year').forEach(el => { el.textContent = y; });
});

/* ---------- Mobile menu ---------- */
function toggleMenu(){ document.querySelector('.mobile').classList.toggle('open'); }

/* ---------- Header: transparent over the hero, solid theme colour once scrolled ---------- */
(function initHeaderScroll(){
  const set = () => {
    const h = document.querySelector('header');
    if(h) h.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', set, {passive:true});
  document.addEventListener('DOMContentLoaded', set);
  set();
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Services accordion ---- */
  (function initServiceAccordion(){
    const setOpen = (block, open) => {
      block.classList.toggle('open', open);
      const r = block.querySelector('.svc-row');
      if(!r) return;
      r.setAttribute('aria-expanded', open ? 'true' : 'false');
      r.querySelector('.cx').innerHTML = open ? '&minus;' : '+';
    };
    document.querySelectorAll('.svc-block .svc-row').forEach(row => {
      row.addEventListener('click', () => {
        const block = row.closest('.svc-block');
        const willOpen = !block.classList.contains('open');
        // only one service open at a time
        document.querySelectorAll('.svc-block.open').forEach(b => { if(b !== block) setOpen(b, false); });
        setOpen(block, willOpen);
      });
    });
  })();

  /* ---- "Learn more" deep links: land on the right service block, not just the page ---- */
  (function initDeepLink(){
    const id = (location.hash || '').slice(1);
    if(!id) return;
    const target = document.getElementById(id);
    if(!target) return;
    // if the target is a collapsed accordion block, open it (and close the default one)
    if(target.classList.contains('svc-block')){
      document.querySelectorAll('.svc-block.open').forEach(b => {
        if(b === target) return;
        b.classList.remove('open');
        const r = b.querySelector('.svc-row');
        if(r){ r.setAttribute('aria-expanded','false'); r.querySelector('.cx').innerHTML = '+'; }
      });
      target.classList.add('open');
      const r = target.querySelector('.svc-row');
      if(r){ r.setAttribute('aria-expanded','true'); r.querySelector('.cx').innerHTML = '&minus;'; }
    }
    // the block starts hidden for the scroll-reveal — show it (and any revealing parents) first
    let el = target;
    while(el && el !== document.body){
      if(el.classList && el.classList.contains('reveal')){ el.style.transition='none'; el.style.opacity='1'; el.style.transform='none'; el.classList.add('in'); }
      el = el.parentElement;
    }
    setTimeout(() => {
      target.scrollIntoView({behavior:'smooth', block:'start'});
      target.classList.add('jump');
      setTimeout(() => target.classList.remove('jump'), 2400);
    }, 120);
  })();

  /* ---- "Ask AI for a summary": open the assistant with the question already asked ---- */
  (function initAskAI(){
    const btns = document.querySelectorAll('.ai-go');
    if(!btns.length) return;
    const site = location.protocol === 'file:' ? 'https://stravia.com' : location.origin + location.pathname.replace(/[^/]*$/, '');
    const q = 'Please read ' + site + ' and give me a short summary of Stravia Financial Consulting — '
            + 'what they do, their services, the industries they serve, how they work, and who they are a good fit for.';
    const e = encodeURIComponent(q);
    const URLS = {
      // no &hints=search — that flag made ChatGPT drop into web-search mode instead of
      // just taking the question, which is why the behaviour looked inconsistent
      chatgpt:    'https://chatgpt.com/?q=' + e,
      claude:     'https://claude.ai/new?q=' + e,
      perplexity: 'https://www.perplexity.ai/search?q=' + e,
      // Gemini accepts no prefill parameter, so we open it and paste the question from the clipboard
      gemini:     'https://gemini.google.com/app'
    };
    const toast = document.createElement('div');
    toast.className = 'ai-toast';
    document.body.appendChild(toast);
    let timer;
    const say = msg => {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove('show'), 4200);
    };

    btns.forEach(a => {
      const key = a.dataset.ai, name = a.textContent.trim();
      if(URLS[key]) a.href = URLS[key];
      a.title = 'Ask ' + name + ' to summarise Stravia';
      a.addEventListener('click', () => {
        // copy the question too: Gemini needs a paste, and it is a fallback everywhere else
        const copied = navigator.clipboard && navigator.clipboard.writeText(q);
        const note = key === 'gemini'
          ? 'Question copied — press Ctrl/Cmd + V in Gemini and hit enter.'
          : 'Opening ' + name + ' with the question ready. (Also copied, just in case.)';
        if(copied && copied.then) copied.then(() => say(note)).catch(() => {});
        else say(note);
      });
    });
  })();

  /* ---- Reliable hero video playback ----
     Browsers pause muted autoplay video in background tabs / Low Power Mode, and Safari
     then draws a ▶ overlay. So: keep retrying, and if it truly can't play, fade the video
     out so the hero's poster photo shows instead (never a paused video with a play button). */
  const hv = document.querySelector('.hero-video');
  if(hv){
    hv.muted = true; hv.defaultMuted = true;
    hv.setAttribute('muted',''); hv.setAttribute('playsinline',''); hv.removeAttribute('controls');
    const showVideo = () => { hv.style.opacity = '1'; };
    const showPoster = () => { hv.style.opacity = '0'; };   // reveals the hero background photo
    const tryPlay = () => {
      if(document.hidden) return;
      const p = hv.play();
      if(p && p.then) p.then(showVideo).catch(showPoster); else showVideo();
    };
    tryPlay();
    hv.addEventListener('loadeddata', tryPlay);
    hv.addEventListener('canplay', tryPlay);
    hv.addEventListener('playing', showVideo);
    // if it gets paused by the browser, try to resume shortly after; fall back to the photo
    hv.addEventListener('pause', () => setTimeout(() => { tryPlay(); if(hv.paused) showPoster(); }, 250));
    // retry on ANY user interaction (not once — keep recovering)
    ['click','touchstart','keydown','pointerdown','scroll','mousemove'].forEach(ev =>
      window.addEventListener(ev, tryPlay, {passive:true}));
    document.addEventListener('visibilitychange', () => { if(!document.hidden) tryPlay(); });
    // safety net: while the tab is visible, nudge it back into playing
    setInterval(() => { if(!document.hidden && hv.paused) tryPlay(); }, 2000);
  }

  /* ---- Reveal on scroll (bulletproof: never leaves content hidden) ---- */
  const reveals = document.querySelectorAll('.reveal');
  reveals.forEach(el => { const s=[...el.parentElement.children].filter(c=>c.classList.contains('reveal'));
    el.style.transitionDelay = Math.min(s.indexOf(el),5)*0.09 + 's'; });
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((es)=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }}),
      {threshold:0.1, rootMargin:'0px 0px -50px 0px'});
    reveals.forEach(el=>io.observe(el));
    setTimeout(()=>reveals.forEach(el=>{ if(!el.classList.contains('in')){ el.style.transition='none'; el.style.opacity='1'; el.style.transform='none'; }}),3000);
  } else { reveals.forEach(el=>el.classList.add('in')); }

  /* ---- Rotating dotted globe on inner-page banners ---- */
  document.querySelectorAll('.banner-canvas').forEach(canvas => {
    if(!canvas.getContext) return;
    const g = canvas.getContext('2d'); const pts=[];
    for(let la=-80;la<=80;la+=11) for(let lo=0;lo<360;lo+=10) pts.push({la:la*Math.PI/180, lo:lo*Math.PI/180});
    let t=0;
    (function frame(){
      const r=canvas.getBoundingClientRect(), w=r.width, h=r.height, dpr=Math.min(devicePixelRatio||1,2);
      if(canvas.width!==Math.round(w*dpr)){ canvas.width=w*dpr; canvas.height=h*dpr; g.setTransform(dpr,0,0,dpr,0,0); }
      g.clearRect(0,0,w,h); t+=0.0035; const R=h*0.66, cx=w*0.5, cy=h/2;
      for(const p of pts){ const lo=p.lo+t, x=Math.cos(p.la)*Math.cos(lo), y=Math.sin(p.la), z=Math.cos(p.la)*Math.sin(lo), d=(z+1)/2;
        g.globalAlpha=0.08+d*0.44; g.fillStyle='rgba(150,190,235,1)'; g.beginPath(); g.arc(cx+x*R,cy-y*R,0.7+d*1.7,0,7); g.fill(); }
      g.globalAlpha=1; requestAnimationFrame(frame);
    })();
  });

  /* ---- Footer trade-route arcs (endpoints on land, aligned with map) ---- */
  const footArcs = '<svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">'
    + '<image href="map.svg" x="0" y="0" width="1000" height="500" opacity="0.8"/>'
    + '<g fill="none" stroke="#5b9bd8" stroke-width="1.6" opacity=".85">'
    + '<path class="arc" d="M703,190 Q610,60 525,105"/>'
    + '<path class="arc" d="M703,190 Q470,30 240,135" style="animation-delay:.6s"/>'
    + '<path class="arc" d="M703,190 Q760,150 803,202" style="animation-delay:.3s"/>'
    + '<path class="arc" d="M525,105 Q380,40 240,135" style="animation-delay:1.5s"/>'
    + '<path class="arc" d="M545,255 Q520,150 525,105" style="animation-delay:.9s"/>'
    + '</g><g fill="#7fb0e6">'
    + '<circle cx="240" cy="135" r="3"/><circle class="ping" cx="240" cy="135" r="3" fill="none" stroke="#7fb0e6" stroke-width="1.5"/>'
    + '<circle cx="525" cy="105" r="3"/><circle class="ping" cx="525" cy="105" r="3" fill="none" stroke="#7fb0e6" stroke-width="1.5" style="animation-delay:.5s"/>'
    + '<circle cx="545" cy="255" r="3"/><circle class="ping" cx="545" cy="255" r="3" fill="none" stroke="#7fb0e6" stroke-width="1.5" style="animation-delay:1.2s"/>'
    + '<circle cx="703" cy="190" r="4.5" fill="#fff"/><circle class="ping" cx="703" cy="190" r="4.5" fill="none" stroke="#fff" stroke-width="1.6"/>'
    + '<circle cx="803" cy="202" r="3"/><circle class="ping" cx="803" cy="202" r="3" fill="none" stroke="#7fb0e6" stroke-width="1.5" style="animation-delay:.9s"/>'
    + '</g></svg>';
  document.querySelectorAll('.footer-bg').forEach(el => el.insertAdjacentHTML('beforeend', footArcs));

  /* ---- Contact form ---- */
  initContactForm();
  initCustomSelects();          // must run after the country list is populated
});

/* ---------- Themed dropdown ----------
   A native <select>'s popup is drawn by the OS and cannot be styled, so we build a real
   listbox next to it. The <select> stays in the DOM and remains the source of truth for
   the value and for validate(); every pick writes to it and fires a change event. */
function initCustomSelects(){
  document.querySelectorAll('.selwrap select').forEach(sel => {
    if(sel.dataset.cs) return;
    sel.dataset.cs = '1';
    const wrap = sel.closest('.selwrap');
    wrap.classList.add('cs');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cs-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const lbl = wrap.closest('.field') && wrap.closest('.field').querySelector('label');
    if(lbl) btn.setAttribute('aria-label', lbl.textContent.trim());

    const list = document.createElement('div');
    list.className = 'cs-list';
    list.setAttribute('role', 'listbox');
    wrap.append(btn, list);

    [...sel.options].forEach((o, i) => {
      const it = document.createElement('div');
      it.className = 'cs-opt' + (o.value === '' ? ' ph' : '');
      it.setAttribute('role', 'option');
      it.dataset.i = i;
      it.textContent = o.textContent;
      list.appendChild(it);
    });
    const items = [...list.children];

    const sync = () => {
      const i = sel.selectedIndex, o = sel.options[i];
      btn.textContent = o ? o.textContent : '';
      btn.classList.toggle('ph', !o || o.value === '');
      items.forEach((c, n) => {
        const on = n === i;
        c.classList.toggle('sel', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    };

    let active = -1;
    const mark = n => {
      items.forEach(c => c.classList.remove('active'));
      active = n;
      if(n >= 0 && items[n]){
        items[n].classList.add('active');
        items[n].scrollIntoView({block:'nearest'});
      }
    };
    const isOpen = () => wrap.classList.contains('open');
    const open = () => {
      document.querySelectorAll('.selwrap.open').forEach(w => { if(w !== wrap) close(w); });
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      mark(sel.selectedIndex);
    };
    const close = (w) => {
      const target = w || wrap;
      target.classList.remove('open');
      const b = target.querySelector('.cs-btn');
      if(b) b.setAttribute('aria-expanded', 'false');
      if(target === wrap) mark(-1);
    };
    const pick = n => {
      if(n < 0 || n >= sel.options.length) return;
      sel.selectedIndex = n;
      sel.dispatchEvent(new Event('change', {bubbles:true}));
      sync(); close(); btn.focus();
    };

    btn.addEventListener('click', e => { e.stopPropagation(); isOpen() ? close() : open(); });
    items.forEach(it => {
      it.addEventListener('click', e => { e.stopPropagation(); pick(+it.dataset.i); });
      it.addEventListener('mousemove', () => mark(items.indexOf(it)));
    });

    let typed = '', typeTimer;
    btn.addEventListener('keydown', e => {
      const k = e.key;
      if(k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' '){
        e.preventDefault();
        if(!isOpen()){ open(); return; }
        if(k === 'Enter' || k === ' ') pick(active);
        else mark(Math.max(0, Math.min(items.length - 1, active + (k === 'ArrowDown' ? 1 : -1))));
        return;
      }
      if(k === 'Escape'){ close(); return; }
      if(k === 'Home' || k === 'End'){ e.preventDefault(); if(isOpen()) mark(k === 'Home' ? 0 : items.length - 1); return; }
      if(k.length === 1 && /\S/.test(k)){          // type-ahead, e.g. "ind" -> India
        if(!isOpen()) open();
        typed += k.toLowerCase();
        clearTimeout(typeTimer);
        typeTimer = setTimeout(() => { typed = ''; }, 700);
        const n = items.findIndex(c => c.textContent.toLowerCase().startsWith(typed));
        if(n > -1) mark(n);
      }
    });

    // keep the button in step when something else sets the value (e.g. typing a dial code)
    sel.addEventListener('change', sync);
    sel.addEventListener('cs:sync', sync);   // value changed programmatically
    sync();
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.selwrap.open').forEach(w => {
      w.classList.remove('open');
      const b = w.querySelector('.cs-btn');
      if(b) b.setAttribute('aria-expanded', 'false');
    });
  });
}

function initContactForm(){
  const form = document.getElementById('enquiry');
  if(!form) return;
  const COUNTRIES = [['Afghanistan','+93'],['Albania','+355'],['Algeria','+213'],['Argentina','+54'],['Australia','+61'],['Austria','+43'],['Bahrain','+973'],['Bangladesh','+880'],['Belgium','+32'],['Bhutan','+975'],['Brazil','+55'],['Bulgaria','+359'],['Canada','+1'],['Chile','+56'],['China','+86'],['Colombia','+57'],['Croatia','+385'],['Cyprus','+357'],['Czechia','+420'],['Denmark','+45'],['Egypt','+20'],['Estonia','+372'],['Finland','+358'],['France','+33'],['Germany','+49'],['Ghana','+233'],['Greece','+30'],['Hong Kong','+852'],['Hungary','+36'],['Iceland','+354'],['India','+91'],['Indonesia','+62'],['Iran','+98'],['Iraq','+964'],['Ireland','+353'],['Israel','+972'],['Italy','+39'],['Japan','+81'],['Jordan','+962'],['Kenya','+254'],['Kuwait','+965'],['Latvia','+371'],['Lebanon','+961'],['Lithuania','+370'],['Luxembourg','+352'],['Malaysia','+60'],['Maldives','+960'],['Malta','+356'],['Mauritius','+230'],['Mexico','+52'],['Nepal','+977'],['Netherlands','+31'],['New Zealand','+64'],['Nigeria','+234'],['Norway','+47'],['Oman','+968'],['Pakistan','+92'],['Philippines','+63'],['Poland','+48'],['Portugal','+351'],['Qatar','+974'],['Romania','+40'],['Russia','+7'],['Saudi Arabia','+966'],['Singapore','+65'],['Slovakia','+421'],['Slovenia','+386'],['South Africa','+27'],['South Korea','+82'],['Spain','+34'],['Sri Lanka','+94'],['Sweden','+46'],['Switzerland','+41'],['Taiwan','+886'],['Thailand','+66'],['Turkey','+90'],['UAE','+971'],['Uganda','+256'],['Ukraine','+380'],['United Kingdom','+44'],['United States','+1'],['Vietnam','+84'],['Zimbabwe','+263']];
  const $ = id => document.getElementById(id);
  const name=$('f-name'),email=$('f-email'),code=$('f-code'),phone=$('f-phone'),country=$('f-country'),
        service=$('f-service'),stage=$('f-stage'),looking=$('f-looking'),msg=$('f-msg'),msgCount=$('msg-count'),
        capCode=$('cap-code'),capIn=$('f-captcha'),capRefresh=$('cap-refresh'),consent=$('f-consent'),submit=$('f-submit');
  country.innerHTML = COUNTRIES.map(c=>`<option value="${c[0]}" data-code="${c[1]}">${c[0]}</option>`).join('');
  country.value='India'; code.value='+91';
  const codeToCountry={}; COUNTRIES.forEach(c=>{ if(!(c[1] in codeToCountry)) codeToCountry[c[1]]=c[0]; });
  let currentCode='';
  function genCode(){ const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
    currentCode=Array.from({length:5},()=>c[Math.floor(Math.random()*c.length)]).join(''); capCode.textContent=currentCode; }
  genCode();
  capRefresh.addEventListener('click',()=>{ genCode(); capIn.value=''; setV(capIn,false); validate(); });
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const V={ name:()=>name.value.trim().length>0&&name.value.length<=60, email:()=>{const v=email.value.trim();return v.length>0&&v.length<=60&&emailRe.test(v);},
    code:()=>/^\+\d{1,4}$/.test(code.value.trim()), phone:()=>{const n=phone.value.replace(/\D/g,'');return n.length>=6&&n.length<=14;},
    country:()=>country.value!=='', consent:()=>consent.checked, captcha:()=>capIn.value===currentCode };
  function setV(el,ok){ el.classList.toggle('valid',ok); el.classList.toggle('invalid',!ok); }
  function err(id,t){ const e=document.querySelector(`.err[data-for="${id}"]`); if(e) e.textContent=t||''; }
  function validate(){ submit.disabled=!(V.name()&&V.email()&&V.code()&&V.phone()&&V.country()&&V.consent()&&V.captcha()); }
  name.addEventListener('input',()=>{const ok=V.name();if(name.value)setV(name,ok);err('f-name',ok||!name.value?'':'Please enter your name.');validate();});
  email.addEventListener('input',()=>{const ok=V.email();if(email.value)setV(email,ok);err('f-email',ok||!email.value?'':'Enter a valid email.');validate();});
  phone.addEventListener('input',()=>{const ok=V.phone();if(phone.value)setV(phone,ok);err('f-phone',ok||!phone.value?'':'Enter a valid number (6–14 digits).');validate();});
  code.addEventListener('input',()=>{let v=code.value.trim();if(v&&v[0]!=='+'){v='+'+v.replace(/\+/g,'');code.value=v;}if(codeToCountry[v]){country.value=codeToCountry[v];country.dispatchEvent(new Event('cs:sync'));}validate();});
  country.addEventListener('change',()=>{const o=country.selectedOptions[0];if(o)code.value=o.getAttribute('data-code');validate();});
  if(msg) msg.addEventListener('input',()=>{ if(msgCount) msgCount.textContent=msg.value.length+' / 500'; });
  consent.addEventListener('change',validate);
  capIn.addEventListener('input',()=>{ if(capIn.value.length>=currentCode.length){ if(V.captcha()){setV(capIn,true);err('f-captcha','');}
    else{ genCode(); capIn.value=''; setV(capIn,false); capCode.classList.remove('flash');void capCode.offsetWidth;capCode.classList.add('flash'); err('f-captcha','Incorrect — a new code was generated.'); } } else err('f-captcha',''); validate(); });
  validate();
  /* ---- real submission: posts to send.php, which emails Stravia ---- */
  const loadedAt = Math.floor(Date.now()/1000);          // used server-side to spot bots
  const formNote = document.createElement('p');
  formNote.className = 'form-note';
  form.appendChild(formNote);
  const note = (msg, kind) => { formNote.textContent = msg; formNote.className = 'form-note ' + (kind||''); };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if(submit.disabled) return;
    const original = 'Start the Conversation';
    submit.disabled = true; submit.textContent = 'Sending…'; note('');

    const payload = {
      name: name.value, company: $('f-company').value, email: email.value,
      code: code.value, phone: phone.value, country: country.value,
      stage: stage ? stage.value : '', looking: looking ? looking.value : '',
      message: msg ? msg.value : '', consent: consent.checked,
      website: $('f-website') ? $('f-website').value : '',   // honeypot
      t: loadedAt
    };

    try {
      const res  = await fetch('send.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({ok:false, error:'Unexpected response from the server.'}));

      if(res.ok && data.ok){
        submit.textContent = 'Message sent ✓';
        note('Thanks — your message is on its way. We reply within one business day.', 'ok');
        form.reset(); country.value='India'; code.value='+91'; genCode();
        country.dispatchEvent(new Event('cs:sync'));
        if(msgCount) msgCount.textContent = '0 / 500';
        [name,email,phone,capIn].forEach(el => el.classList.remove('valid','invalid'));
        setTimeout(() => { submit.textContent = original; }, 3000);
      } else {
        // surface per-field errors the server found
        if(data.fields){
          for(const k in data.fields) err('f-'+k, data.fields[k]);
        }
        note(data.error || 'Something went wrong. Please try again.', 'bad');
        submit.textContent = original;
        submit.disabled = false;
      }
    } catch(err) {
      note('We could not reach the server. Please check your connection, or email us at Hello@stravia.co.in.', 'bad');
      submit.textContent = original;
      submit.disabled = false;
    }
    validate();
  });
}
