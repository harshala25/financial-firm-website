/* ===== STRAVIA — site scripts ===== */
document.documentElement.classList.add('js');

/* ---------- Theme switcher ---------- */
const THEMES = {
  steel:  {name:'Steel Blue', rec:true,  bg:'#f5f8fc',ink:'#1f2a3a',muted:'#5b6875',accent:'#3b6ea5',accentDark:'#2d5683',accentSoft:'#d3e0ee',line:'#e0e6ef',d1:'#2a3d57',d2:'#141d2b'},
  navy:   {name:'Stravia Navy',logo:true,bg:'#f4f6fb',ink:'#14235c',muted:'#5a6478',accent:'#2f6fed',accentDark:'#1a2a6b',accentSoft:'#d7e2f9',line:'#dfe4f0',d1:'#1f3170',d2:'#0f1a45'},
  royal:  {name:'Royal Blue',  bg:'#f6f9fd',ink:'#12233f',muted:'#5c6b7a',accent:'#2f6fed',accentDark:'#2154c4',accentSoft:'#d5e2fb',line:'#e1e8f2',d1:'#21386a',d2:'#101d3a'},
  teal:   {name:'Deep Teal',   bg:'#f3fafa',ink:'#0f2e33',muted:'#526266',accent:'#14757a',accentDark:'#0f5c60',accentSoft:'#cfe6e6',line:'#dbeaea',d1:'#14424a',d2:'#0a2226'},
  indigo: {name:'Indigo',      bg:'#f7f8fd',ink:'#1b2148',muted:'#63697f',accent:'#4657c9',accentDark:'#3543a3',accentSoft:'#dadefb',line:'#e4e6f3',d1:'#262a66',d2:'#12143a'},
  slate:  {name:'Slate Blue',  bg:'#f5f7fb',ink:'#23303f',muted:'#5d6a78',accent:'#4a6c8a',accentDark:'#39546c',accentSoft:'#d6e0ea',line:'#e1e6ee',d1:'#2a3a4d',d2:'#151f2a'}
};
function applyTheme(key){
  const t = THEMES[key] || THEMES.steel, r = document.documentElement.style;
  r.setProperty('--bg',t.bg); r.setProperty('--surface','#ffffff'); r.setProperty('--ink',t.ink);
  r.setProperty('--muted',t.muted); r.setProperty('--accent',t.accent); r.setProperty('--accent-dark',t.accentDark);
  r.setProperty('--accent-soft',t.accentSoft); r.setProperty('--on-accent','#ffffff'); r.setProperty('--line',t.line);
  r.setProperty('--d1',t.d1); r.setProperty('--d2',t.d2);
  try{ localStorage.setItem('stravia-theme', key); }catch(e){}
  document.querySelectorAll('.theme-opt').forEach(o => o.classList.toggle('active', o.dataset.theme===key));
}
(function initTheme(){
  let saved='steel'; try{ saved = localStorage.getItem('stravia-theme') || 'steel'; }catch(e){}
  applyTheme(saved);
  document.addEventListener('DOMContentLoaded', () => {
    const nav=document.querySelector('.nav'), header=document.querySelector('header');
    if(!nav || !header) return;
    const toggle=document.createElement('button'); toggle.className='theme-toggle'; toggle.title='Colour theme'; toggle.setAttribute('aria-label','Change colour theme');
    toggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3a9 9 0 100 18h1.4a2.4 2.4 0 002.1-3.6 1.5 1.5 0 011.3-2.3H19a2 2 0 002-2A9 9 0 0012 3z"/><circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1.1" fill="currentColor" stroke="none"/></svg>';
    const hamb=nav.querySelector('.hamb'); nav.insertBefore(toggle, hamb);
    const panel=document.createElement('div'); panel.className='theme-panel';
    const chk='<svg class="chk" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    let html='<h4>Colour theme</h4>';
    for(const k in THEMES){ const t=THEMES[k];
      html+=`<button class="theme-opt" data-theme="${k}"><span class="sw"><i style="background:${t.d2}"></i><i style="background:${t.accent}"></i><i style="background:${t.accentSoft}"></i></span><span class="nm">${t.name}</span>`
        + (t.rec?'<span class="rec">Recommended</span>':(t.logo?'<span class="rec">Logo</span>':'')) + chk + '</button>';
    }
    panel.innerHTML=html;
    header.appendChild(panel);
    toggle.addEventListener('click', e => { e.stopPropagation(); panel.classList.toggle('open'); });
    panel.querySelectorAll('.theme-opt').forEach(o => o.addEventListener('click', () => { applyTheme(o.dataset.theme); panel.classList.remove('open'); }));
    document.addEventListener('click', e => { if(!panel.contains(e.target) && !toggle.contains(e.target)) panel.classList.remove('open'); });
    applyTheme(saved);
  });
})();

/* ---------- Mobile menu ---------- */
function toggleMenu(){ document.querySelector('.mobile').classList.toggle('open'); }

document.addEventListener('DOMContentLoaded', () => {

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
});

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
  code.addEventListener('input',()=>{let v=code.value.trim();if(v&&v[0]!=='+'){v='+'+v.replace(/\+/g,'');code.value=v;}if(codeToCountry[v])country.value=codeToCountry[v];validate();});
  country.addEventListener('change',()=>{const o=country.selectedOptions[0];if(o)code.value=o.getAttribute('data-code');validate();});
  if(msg) msg.addEventListener('input',()=>{ if(msgCount) msgCount.textContent=msg.value.length+' / 500'; });
  consent.addEventListener('change',validate);
  capIn.addEventListener('input',()=>{ if(capIn.value.length>=currentCode.length){ if(V.captcha()){setV(capIn,true);err('f-captcha','');}
    else{ genCode(); capIn.value=''; setV(capIn,false); capCode.classList.remove('flash');void capCode.offsetWidth;capCode.classList.add('flash'); err('f-captcha','Incorrect — a new code was generated.'); } } else err('f-captcha',''); validate(); });
  validate();
  form.addEventListener('submit',e=>{ e.preventDefault(); if(submit.disabled) return;
    submit.textContent='Sending…';
    setTimeout(()=>{ submit.textContent='Message sent ✓'; form.reset(); country.value='India'; code.value='+91'; genCode();
      if(msgCount) msgCount.textContent='0 / 500'; [name,email,phone,capIn].forEach(el=>el.classList.remove('valid','invalid'));
      submit.disabled=true; setTimeout(()=>submit.textContent='Start the Conversation',2400); },800);
  });
}
