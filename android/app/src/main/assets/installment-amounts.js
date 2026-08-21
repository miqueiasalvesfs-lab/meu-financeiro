(function(){
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Math.trunc(Number(n)||0)));
  function parseIso(iso){let [y,m,d]=String(iso||'').split('-').map(Number);return new Date(y||1970,(m||1)-1,d||1,12,0,0,0)}
  function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function scheduleDate(start,index,freq){
    let base=parseIso(start),d=new Date(base);
    if(freq==='day')d.setDate(d.getDate()+index);
    else if(freq==='week')d.setDate(d.getDate()+index*7);
    else{
      let day=base.getDate(),targetMonth=base.getMonth()+index,targetYear=base.getFullYear()+Math.floor(targetMonth/12);targetMonth=((targetMonth%12)+12)%12;
      let last=new Date(targetYear,targetMonth+1,0).getDate();d=new Date(targetYear,targetMonth,Math.min(day,last),12,0,0,0)
    }
    return isoDate(d)
  }
  function parseMoneyCents(raw){
    if(typeof raw==='number'&&Number.isFinite(raw))return Math.max(0,Math.round(raw*100));
    let s=String(raw??'').trim().replace(/^R\$/i,'').replace(/\s+/g,'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    if(s.includes(',')){
      let p=s.lastIndexOf(','),whole=s.slice(0,p).replace(/\D/g,'')||'0',dec=s.slice(p+1).replace(/\D/g,'').slice(0,2);
      return Math.max(0,Number(whole)*100+Number((dec+'00').slice(0,2)))
    }
    if(/^\d{1,3}(?:\.\d{3})+$/.test(s))return Math.max(0,Number(s.replace(/\./g,''))*100);
    let dots=(s.match(/\./g)||[]).length;
    if(dots===1){
      let p=s.indexOf('.'),after=s.slice(p+1).replace(/\D/g,'');
      if(after.length>0&&after.length<=2){let whole=s.slice(0,p).replace(/\D/g,'')||'0';return Math.max(0,Number(whole)*100+Number((after+'00').slice(0,2)))}
    }
    return Math.max(0,Number(s.replace(/\D/g,'')||0)*100)
  }
  function moneyCents(cents){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Math.max(0,Math.round(Number(cents)||0))/100)}
  function amounts(totalCents,count,paid){
    totalCents=Math.max(0,Math.round(Number(totalCents)||0));count=clamp(count,2,360);paid=clamp(paid,0,count);
    let base=Math.floor(totalCents/count),extra=totalCents%count,paidCents=base*paid+Math.min(paid,extra);
    return{totalCents,paidCents,remainingCents:Math.max(0,totalCents-paidCents)}
  }
  function automaticPaid(count,start,freq){
    count=clamp(count,2,360);let today=new Date();today.setHours(12,0,0,0),paid=0;
    for(let i=0;i<count;i++){if(parseIso(scheduleDate(start,i,freq))<=today)paid=i+1;else break}
    return paid
  }
  function draftAmountState(){
    let count=clamp(document.getElementById('installmentCount')?.value||2,2,360),start=document.getElementById('date')?.value||new Date().toISOString().slice(0,10),freq=document.getElementById('installmentBox')?.dataset.frequency||'month';
    if(!['day','week','month'].includes(freq))freq='month';
    let control=document.getElementById('installmentProgressControl'),mode=control?.dataset.mode==='manual'?'manual':'auto';
    let paid=mode==='manual'?clamp(document.getElementById('installmentPaid')?.value,0,count):automaticPaid(count,start,freq);
    let totalCents=parseMoneyCents(document.getElementById('value')?.value||'');
    return{mode,count,paid,...amounts(totalCents,count,paid)}
  }
  function parentAmountState(parent,paidOverride){
    let inst=parent?.installment;if(!inst?.enabled)return null;
    let count=clamp(inst.count,2,360),totalCents=Number.isFinite(Number(inst.totalCents))?Math.max(0,Math.round(Number(inst.totalCents))):Math.max(0,Math.round(Number(inst.totalValue??parent.value||0)*100));
    let paid=clamp(paidOverride,0,count);return{count,paid,...amounts(totalCents,count,paid)}
  }
  function ensureAmountUi(){
    let control=document.getElementById('installmentProgressControl');if(!control)return false;
    if(!document.getElementById('installmentAmountProgress')){
      let card=document.createElement('div');card.id='installmentAmountProgress';card.className='installment-amount-progress';
      card.innerHTML=`<div class="amount-progress-title"><span>💰</span><div><b>Valores do parcelamento</b><small id="installmentAmountMode">Calculado automaticamente</small></div></div><div class="amount-progress-grid"><div><small>Valor total</small><b id="installmentTotalAmount">R$ 0,00</b></div><div class="paid"><small>Já pago</small><b id="installmentPaidAmount">R$ 0,00</b></div><div class="remaining"><small>Falta pagar</small><b id="installmentRemainingAmount">R$ 0,00</b></div></div>`;
      control.after(card);injectStyle()
    }
    refreshDraft();bindDraft();return true
  }
  function refreshDraft(){
    let card=document.getElementById('installmentAmountProgress');if(!card)return;
    let active=type==='expense'&&!!document.getElementById('installmentToggle')?.checked;card.classList.toggle('hide',!active);if(!active)return;
    let s=draftAmountState();
    document.getElementById('installmentTotalAmount').textContent=moneyCents(s.totalCents);
    document.getElementById('installmentPaidAmount').textContent=moneyCents(s.paidCents);
    document.getElementById('installmentRemainingAmount').textContent=moneyCents(s.remainingCents);
    document.getElementById('installmentAmountMode').textContent=s.mode==='manual'?`Conforme ajuste manual • ${s.paid} de ${s.count} pagas`:`Estimado pelas datas • ${s.paid} de ${s.count} pagas`
  }
  function bindDraft(){
    if(window.__installmentAmountDraftBound)return;window.__installmentAmountDraftBound=true;
    ['value','installmentCount','installmentPaid','installmentRemaining','date','installmentToggle'].forEach(id=>{
      let el=document.getElementById(id);if(!el)return;el.addEventListener('input',refreshDraft);el.addEventListener('change',()=>setTimeout(refreshDraft,0))
    });
    let control=document.getElementById('installmentProgressControl');if(control)new MutationObserver(()=>refreshDraft()).observe(control,{attributes:true,subtree:true,childList:true,characterData:true});
    let freq=document.getElementById('installmentFrequencyTxt');if(freq)new MutationObserver(()=>refreshDraft()).observe(freq,{subtree:true,childList:true,characterData:true})
  }
  function installHooks(){
    if(!ensureAmountUi()||window.__installmentAmountHooks)return false;window.__installmentAmountHooks=true;
    const priorList=list;list=function(m){return priorList(m).map(e=>{
      if(!e._installmentParentId)return e;let parent=E.find(x=>x.id===e._installmentParentId),s=parentAmountState(parent,e._installmentPassed);if(!s)return e;
      return{...e,_installmentPaidCents:s.paidCents,_installmentRemainingCents:s.remainingCents,_installmentTotalCents:s.totalCents}
    })};
    const priorEh=eh;eh=function(e){
      let html=priorEh(e);if(!e._installmentIndex)return html;
      let chips=`<span>💰 Pago ${moneyCents(e._installmentPaidCents)}</span><span>🧾 Falta pagar ${moneyCents(e._installmentRemainingCents)}</span>`;
      return html.replace('<div class="installment-history">','<div class="installment-history">'+chips)
    };
    const freqLabel={day:'Diário',week:'Semanal',month:'Mensal'};
    rows=function(){return[['Tipo','Categoria','Subcategoria','Valor','Pagamento','Descrição','Data','Hora','Parcela','Periodicidade','Pagas','Faltam','Valor pago','Falta pagar','Controle'],...list(month).sort((a,b)=>a.ts-b.ts).map(e=>[e.type==='gain'?'Ganho':'Gasto',e.cat,e.subcat||'',e.value,e.payment||'',e.description||'',e.date,e.time,e._installmentIndex?`${e._installmentIndex}/${e._installmentTotal}`:'',e._installmentFrequency?freqLabel[e._installmentFrequency]:'',e._installmentIndex?e._installmentPassed:'',e._installmentIndex?e._installmentRemaining:'',e._installmentIndex?(e._installmentPaidCents/100):'',e._installmentIndex?(e._installmentRemainingCents/100):'',e._installmentIndex?(e._installmentProgressMode==='manual'?'Manual':'Automático'):''])]};
    let originalRender=render;render=function(){originalRender();setTimeout(refreshDraft,0)};
    setTimeout(()=>{render();refreshDraft()},0);return true
  }
  function injectStyle(){
    if(document.getElementById('installmentAmountStyle'))return;let style=document.createElement('style');style.id='installmentAmountStyle';style.textContent=`
      .installment-amount-progress{margin-top:10px;padding:13px;border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--primary,#16a34a) 12%,var(--card,#fff)),var(--card,#fff));border:1px solid color-mix(in srgb,var(--primary,#16a34a) 20%,transparent);display:grid;gap:11px}.amount-progress-title{display:flex;gap:9px;align-items:flex-start}.amount-progress-title>span{font-size:19px}.amount-progress-title>div{display:grid;gap:2px}.amount-progress-title small{opacity:.7}.amount-progress-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.amount-progress-grid>div{padding:10px;border-radius:13px;background:rgba(127,127,127,.07);display:grid;gap:3px;min-width:0}.amount-progress-grid small{font-size:11px;opacity:.72}.amount-progress-grid b{font-size:13px;line-height:1.2;overflow-wrap:anywhere}.amount-progress-grid .paid b{color:var(--primary,#16a34a)}.amount-progress-grid .remaining{background:rgba(239,68,68,.08)}.amount-progress-grid .remaining b{color:#dc2626}@media(max-width:390px){.amount-progress-grid{grid-template-columns:1fr 1fr}.amount-progress-grid>div:first-child{grid-column:1/-1}}`;
    document.head.appendChild(style)
  }
  let tries=0,timer=setInterval(()=>{tries++;if(installHooks()||tries>160)clearInterval(timer)},50)
})();
