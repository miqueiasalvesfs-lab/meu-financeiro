(function(){
  P={showSmartInsight:true,showTouchFeedback:true,...(P||{})};
  let toastTimer=null;
  const savePrefs=()=>{try{local(false,true)}catch(e){console.warn('Falha ao salvar preferências de interação',e)}};
  const money=text=>{let s=String(text||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.');return Number(s)||0};
  function injectStyle(){
    if(document.getElementById('interactionPolishV19'))return;
    let s=document.createElement('style');s.id='interactionPolishV19';s.textContent=`
      .top{isolation:isolate}.page.on{animation:pageEnterV19 .24s cubic-bezier(.2,.75,.25,1)}
      @keyframes pageEnterV19{from{opacity:.45;transform:translateY(7px)}to{opacity:1;transform:none}}
      button,.pick{touch-action:manipulation}.tap-target{position:relative!important;overflow:hidden!important}.tap-ripple{position:absolute;pointer-events:none;border-radius:50%;background:currentColor;opacity:.12;transform:translate(-50%,-50%) scale(0);animation:tapRippleV19 .46s ease-out forwards}
      @keyframes tapRippleV19{to{opacity:0;transform:translate(-50%,-50%) scale(1)}}
      .hero-privacy{position:absolute;right:15px;top:15px;z-index:3;width:42px;height:42px;border:1px solid rgba(255,255,255,.2);border-radius:15px;background:rgba(255,255,255,.13);backdrop-filter:blur(9px);color:#fff;font-size:18px;display:grid;place-items:center;box-shadow:0 9px 22px rgba(0,0,0,.12)}
      .hero-privacy:active{transform:scale(.92)}
      .smart-insight{position:relative;overflow:hidden;background:linear-gradient(145deg,color-mix(in srgb,var(--g) 8%,var(--card)),var(--card));border-color:color-mix(in srgb,var(--g) 20%,var(--line))!important}
      .smart-insight:after{content:'';position:absolute;width:95px;height:95px;border-radius:50%;right:-36px;top:-42px;background:color-mix(in srgb,var(--g) 10%,transparent)}
      .smart-insight-head{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:10px;position:relative;z-index:1}.smart-insight-icon{width:44px;height:44px;border-radius:16px;background:color-mix(in srgb,var(--g) 13%,#fff);display:grid;place-items:center;font-size:20px}.smart-insight-copy{min-width:0}.smart-insight-copy small{display:block;color:var(--g);font-size:9px;font-weight:950;letter-spacing:.08em}.smart-insight-copy b{display:block;margin-top:3px;font-size:14px;line-height:1.25}.smart-insight p{position:relative;z-index:1;margin:11px 0 0;color:var(--m);font-size:11px;line-height:1.5}.smart-insight-action{position:relative;z-index:2;border:0;background:color-mix(in srgb,var(--g) 11%,var(--card));color:var(--g);border-radius:13px;padding:9px 10px;font-size:10px;font-weight:950;white-space:nowrap}.smart-insight-meter{height:7px;border-radius:99px;background:color-mix(in srgb,var(--line) 70%,transparent);overflow:hidden;margin-top:11px;position:relative;z-index:1}.smart-insight-meter i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--g2),var(--g));transition:width .35s ease}
      .app-toast{position:fixed;left:50%;bottom:calc(108px + env(safe-area-inset-bottom));transform:translate(-50%,14px);z-index:3000;max-width:calc(100% - 34px);padding:10px 14px;border-radius:15px;background:rgba(15,23,42,.92);color:#fff;font-size:11px;font-weight:850;box-shadow:0 14px 34px rgba(15,23,42,.24);opacity:0;pointer-events:none;transition:.2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.app-toast.on{opacity:1;transform:translate(-50%,0)}
      html[data-appearance="dark"] .smart-insight-icon{background:color-mix(in srgb,var(--g) 18%,#111)}html[data-appearance="dark"] .smart-insight-action{background:color-mix(in srgb,var(--g) 16%,#111)}
      body.modern-reduce-motion .page.on{animation:none!important}
      @media(max-width:370px){.smart-insight-head{grid-template-columns:40px 1fr}.smart-insight-icon{width:40px;height:40px}.smart-insight-action{grid-column:1/-1;width:100%;margin-top:2px}}
    `;document.head.appendChild(s);
  }
  function toast(message){
    if(P.showTouchFeedback===false)return;
    let t=document.getElementById('appToast');if(!t){t=document.createElement('div');t.id='appToast';t.className='app-toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t)}
    t.textContent=message;t.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('on'),1700);
  }
  function addRipple(){
    if(window.__dsjRipple)return;window.__dsjRipple=true;
    document.addEventListener('pointerdown',e=>{
      if(P.showTouchFeedback===false)return;let b=e.target.closest('button,.pick');if(!b||b.disabled)return;
      b.classList.add('tap-target');let r=b.getBoundingClientRect(),size=Math.max(r.width,r.height)*2.15,x=e.clientX-r.left,y=e.clientY-r.top,sp=document.createElement('span');sp.className='tap-ripple';sp.style.width=sp.style.height=size+'px';sp.style.left=x+'px';sp.style.top=y+'px';b.appendChild(sp);setTimeout(()=>sp.remove(),520);
    },true);
  }
  function greeting(){
    let el=document.querySelector('#home .welcome-copy small');if(!el)return;let h=new Date().getHours();el.textContent=h<12?'Bom dia,':h<18?'Boa tarde,':'Boa noite,';
  }
  function addPrivacy(){
    let hero=document.getElementById('balanceHero');if(!hero||document.getElementById('heroPrivacy'))return;
    let b=document.createElement('button');b.id='heroPrivacy';b.type='button';b.className='hero-privacy';hero.appendChild(b);
    b.onclick=()=>{P={...P,hideValues:!P.hideValues};savePrefs();try{renderProfile()}catch{document.body.classList.toggle('values-hidden',!!P.hideValues)}updatePrivacy();updateInsight();toast(P.hideValues?'Valores ocultados':'Valores visíveis')};
    updatePrivacy();
  }
  function updatePrivacy(){let b=document.getElementById('heroPrivacy');if(!b)return;b.textContent=P.hideValues?'🙈':'👁';b.setAttribute('aria-label',P.hideValues?'Mostrar valores':'Ocultar valores');b.title=P.hideValues?'Mostrar valores':'Ocultar valores'}
  function addInsight(){
    if(document.getElementById('smartInsight'))return;let hero=document.getElementById('balanceHero');if(!hero)return;
    let c=document.createElement('div');c.id='smartInsight';c.className='card smart-insight';c.innerHTML='<div class="smart-insight-head"><span id="smartInsightIcon" class="smart-insight-icon">✨</span><div class="smart-insight-copy"><small>RESUMO INTELIGENTE</small><b id="smartInsightTitle">Analisando seu mês...</b></div><button type="button" class="smart-insight-action" id="smartInsightReport">Ver relatório</button></div><p id="smartInsightText">Seu resumo será atualizado conforme você registra seus lançamentos.</p><div class="smart-insight-meter"><i id="smartInsightMeter"></i></div>';
    hero.after(c);document.getElementById('smartInsightReport').onclick=()=>{tab('report');toast('Relatório aberto')};updateInsight();
  }
  function updateInsight(){
    let c=document.getElementById('smartInsight');if(!c)return;c.style.display=P.showSmartInsight===false?'none':'';if(P.showSmartInsight===false)return;
    let title=document.getElementById('smartInsightTitle'),text=document.getElementById('smartInsightText'),icon=document.getElementById('smartInsightIcon'),meter=document.getElementById('smartInsightMeter');
    if(P.hideValues){icon.textContent='🔒';title.textContent='Seus valores estão protegidos';text.textContent='Use o botão de olho no saldo para exibir os valores quando quiser.';meter.style.width='0%';return}
    let gain=money(document.getElementById('hg')?.textContent),expense=money(document.getElementById('he')?.textContent),balance=money(document.getElementById('bal')?.textContent),count=parseInt(document.getElementById('homeCount')?.textContent||'0',10)||0;
    if(count===0&&gain===0&&expense===0){icon.textContent='👋';title.textContent='Seu mês começa aqui';text.textContent='Registre seu primeiro ganho ou gasto para acompanhar o resumo automaticamente.';meter.style.width='0%';return}
    let ratio=gain>0?Math.min(100,(expense/gain)*100):(expense>0?100:0);meter.style.width=ratio+'%';
    if(balance<0){icon.textContent='⚠️';title.textContent='Gastos acima dos ganhos';text.textContent='Neste mês, seus gastos superaram seus ganhos. Abra o relatório para identificar as categorias com maior peso.'}
    else if(gain>0&&expense/gain<.5){icon.textContent='🌟';title.textContent='Mês com boa margem';text.textContent='Menos da metade dos seus ganhos foi usada em gastos até agora. Continue acompanhando o movimento do mês.'}
    else if(balance>=0){icon.textContent='✅';title.textContent='Seu mês está no positivo';text.textContent='Seu saldo permanece positivo. O relatório mostra onde seus gastos estão mais concentrados.'}
    else{icon.textContent='📊';title.textContent='Resumo atualizado';text.textContent='Acompanhe seus ganhos e gastos para entender melhor o movimento deste mês.'}
  }
  function addSettings(){
    let card=document.getElementById('modernBehaviorCard');if(!card||document.getElementById('smartInsightToggle'))return;let reset=document.getElementById('modernResetPrefs');
    let a=document.createElement('label');a.className='pref-row';a.innerHTML='<span><b>Resumo inteligente</b><small>Mostra uma leitura rápida do seu mês na tela inicial.</small></span><span class="switch"><input id="smartInsightToggle" type="checkbox"><span></span></span>';
    let b=document.createElement('label');b.className='pref-row';b.innerHTML='<span><b>Feedback visual ao tocar</b><small>Exibe resposta de toque e mensagens rápidas nas ações.</small></span><span class="switch"><input id="touchFeedbackToggle" type="checkbox"><span></span></span>';
    card.insertBefore(a,reset||null);card.insertBefore(b,reset||null);
    let ai=document.getElementById('smartInsightToggle'),tf=document.getElementById('touchFeedbackToggle');ai.checked=P.showSmartInsight!==false;tf.checked=P.showTouchFeedback!==false;
    ai.onchange=e=>{P={...P,showSmartInsight:!!e.target.checked};savePrefs();updateInsight()};tf.onchange=e=>{P={...P,showTouchFeedback:!!e.target.checked};savePrefs();if(e.target.checked)toast('Feedback visual ativado')};
  }
  function hookRender(){if(window.__interactionRenderHook||typeof window.render!=='function')return;window.__interactionRenderHook=true;let base=window.render;window.render=function(){let r=base.apply(this,arguments);setTimeout(()=>{greeting();updatePrivacy();updateInsight()},0);return r}}
  function updateVersion(){let b=document.querySelector('.modern-version-badge');if(b)b.textContent='Versão 1.9.0 • Mais moderna e interativa'}
  injectStyle();addRipple();addPrivacy();addInsight();addSettings();hookRender();updateVersion();greeting();updateInsight();setInterval(greeting,60000);
})();