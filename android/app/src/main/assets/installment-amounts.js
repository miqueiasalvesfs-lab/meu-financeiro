(function(){
  const $i=id=>document.getElementById(id);
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Math.trunc(Number(n)||0)));
  function parseIso(iso){let [y,m,d]=String(iso||'').split('-').map(Number);return new Date(y||1970,(m||1)-1,d||1,12,0,0,0)}
  function scheduleDate(start,index,freq){
    let base=parseIso(start),d=new Date(base);
    if(freq==='day')d.setDate(d.getDate()+index);
    else if(freq==='week')d.setDate(d.getDate()+index*7);
    else{let day=base.getDate(),m=base.getMonth()+index,y=base.getFullYear()+Math.floor(m/12);m=((m%12)+12)%12;let last=new Date(y,m+1,0).getDate();d=new Date(y,m,Math.min(day,last),12,0,0,0)}
    return d
  }
  function parseCents(raw){
    if(typeof raw==='number'&&Number.isFinite(raw))return Math.max(0,Math.round(raw*100));
    let s=String(raw??'').trim().replace(/^R\$/i,'').replace(/\s+/g,'').replace(/[^0-9,.-]/g,'');if(!s)return 0;
    if(s.includes(',')){let p=s.lastIndexOf(','),w=s.slice(0,p).replace(/\D/g,'')||'0',d=s.slice(p+1).replace(/\D/g,'').slice(0,2);return Math.max(0,Number(w)*100+Number((d+'00').slice(0,2)))}
    if(/^\d{1,3}(?:\.\d{3})+$/.test(s))return Math.max(0,Number(s.replace(/\./g,''))*100);
    if((s.match(/\./g)||[]).length===1){let p=s.indexOf('.'),d=s.slice(p+1).replace(/\D/g,'');if(d.length>0&&d.length<=2){let w=s.slice(0,p).replace(/\D/g,'')||'0';return Math.max(0,Number(w)*100+Number((d+'00').slice(0,2)))}}
    return Math.max(0,Number(s.replace(/\D/g,'')||0)*100)
  }
  function brl(cents){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Math.max(0,Math.round(Number(cents)||0))/100)}
  function splitAmounts(totalCents,count,paid){
    totalCents=Math.max(0,Math.round(Number(totalCents)||0));count=clamp(count,2,360);paid=clamp(paid,0,count);
    let base=Math.floor(totalCents/count),extra=totalCents%count,paidCents=base*paid+Math.min(paid,extra);
    return{totalCents,paidCents,remainingCents:Math.max(0,totalCents-paidCents)}
  }
  function autoPaid(count,start,freq){
    count=clamp(count,2,360);let today=new Date();today.setHours(12,0,0,0),paid=0;
    for(let i=0;i<count;i++){if(scheduleDate(start,i,freq)<=today)paid=i+1;else break}return paid
  }
  function draftState(){
    let count=clamp($i('installmentCount')?.value||2,2,360),start=$i('date')?.value||new Date().toISOString().slice(0,10),freq=$i('installmentBox')?.dataset.frequency||'month';
    if(!['day','week','month'].includes(freq))freq='month';
    let mode=$i('installmentProgressControl')?.dataset.mode==='manual'?'manual':'auto';
    let paid=mode==='manual'?clamp($i('installmentPaid')?.value,0,count):autoPaid(count,start,freq);
    return{mode,count,paid,...splitAmounts(parseCents($i('value')?.value||''),count,paid)}
  }
  function parentState(parent,paid){
    let inst=parent?.installment;if(!inst?.enabled)return null;
    let count=clamp(inst.count,2,360),totalCents=(inst.totalCents!=null&&Number.isFinite(Number(inst.totalCents)))?Math.max(0,Math.round(Number(inst.totalCents))):Math.max(0,Math.round(Number(inst.totalValue ?? parent.value ?? 0)*100));
    return splitAmounts(totalCents,count,paid)
  }
  function ensureUi(){
    let control=$i('installmentProgressControl');if(!control)return false;
    if(!$i('installmentAmountProgress')){
      let card=document.createElement('div');card.id='installmentAmountProgress';card.className='installment-amount-progress';
      card.innerHTML='<div class="amount-progress-title"><span>💰</span><div><b>Valores do parcelamento</b><small id="installmentAmountMode">Calculado automaticamente</small></div></div><div class="amount-progress-grid"><div><small>Valor total</small><b id="installmentTotalAmount">R$ 0,00</b></div><div class="paid"><small>Já pago</small><b id="installmentPaidAmount">R$ 0,00</b></div><div class="remaining"><small>Falta pagar</small><b id="installmentRemainingAmount">R$ 0,00</b></div></div>';
      control.after(card);injectStyle()
    }
    refresh();bind();return true
  }
  function refresh(){
    let card=$i('installmentAmountProgress');if(!card)return;
    let active=type==='expense'&&!!$i('installmentToggle')?.checked;card.classList.toggle('hide',!active);if(!active)return;
    let s=draftState();$i('installmentTotalAmount').textContent=brl(s.totalCents);$i('installmentPaidAmount').textContent=brl(s.paidCents);$i('installmentRemainingAmount').textContent=brl(s.remainingCents);
    $i('installmentAmountMode').textContent=s.mode==='manual'?`Conforme ajuste manual • ${s.paid} de ${s.count} pagas`:`Estimado pelas datas • ${s.paid} de ${s.count} pagas`
  }
  function bind(){
    if(window.__installmentAmountBound)return;window.__installmentAmountBound=true;
    ['value','installmentCount','installmentPaid','installmentRemaining','date','installmentToggle'].forEach(id=>{let el=$i(id);if(!el)return;el.addEventListener('input',refresh);el.addEventListener('change',()=>setTimeout(refresh,0))});
    let control=$i('installmentProgressControl');if(control)new MutationObserver(refresh).observe(control,{attributes:true,subtree:true,childList:true,characterData:true});
    let freq=$i('installmentFrequencyTxt');if(freq)new MutationObserver(refresh).observe(freq,{subtree:true,childList:true,characterData:true})
  }
  function installHooks(){
    if(!ensureUi()||window.__installmentAmountHooks)return false;window.__installmentAmountHooks=true;
    const priorList=list;list=function(m){return priorList(m).map(e=>{
      if(!e._installmentParentId)return e;let parent=E.find(x=>x.id===e._installmentParentId),s=parentState(parent,e._installmentPassed);if(!s)return e;
      return{...e,_installmentPaidCents:s.paidCents,_installmentRemainingCents:s.remainingCents,_installmentTotalCents:s.totalCents}
    })};
    const priorEh=eh;eh=function(e){let html=priorEh(e);if(!e._installmentIndex)return html;let chips=`<span>💰 Pago ${brl(e._installmentPaidCents)}</span><span>🧾 Falta pagar ${brl(e._installmentRemainingCents)}</span>`;return html.replace('<div class="installment-history">','<div class="installment-history">'+chips)};
    const freq={day:'Diário',week:'Semanal',month:'Mensal'};
    rows=function(){return[['Tipo','Categoria','Subcategoria','Valor','Pagamento','Descrição','Data','Hora','Parcela','Periodicidade','Pagas','Faltam','Valor pago','Falta pagar','Controle'],...list(month).sort((a,b)=>a.ts-b.ts).map(e=>[e.type==='gain'?'Ganho':'Gasto',e.cat,e.subcat||'',e.value,e.payment||'',e.description||'',e.date,e.time,e._installmentIndex?`${e._installmentIndex}/${e._installmentTotal}`:'',e._installmentFrequency?freq[e._installmentFrequency]:'',e._installmentIndex?e._installmentPassed:'',e._installmentIndex?e._installmentRemaining:'',e._installmentIndex?e._installmentPaidCents/100:'',e._installmentIndex?e._installmentRemainingCents/100:'',e._installmentIndex?(e._installmentProgressMode==='manual'?'Manual':'Automático'):''])]};
    setTimeout(refresh,0);return true
  }
  function injectStyle(){
    if($i('installmentAmountStyle'))return;let st=document.createElement('style');st.id='installmentAmountStyle';st.textContent='.installment-amount-progress{margin-top:10px;padding:13px;border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--primary,#16a34a) 12%,var(--card,#fff)),var(--card,#fff));border:1px solid color-mix(in srgb,var(--primary,#16a34a) 20%,transparent);display:grid;gap:11px}.amount-progress-title{display:flex;gap:9px;align-items:flex-start}.amount-progress-title>span{font-size:19px}.amount-progress-title>div{display:grid;gap:2px}.amount-progress-title small{opacity:.7}.amount-progress-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.amount-progress-grid>div{padding:10px;border-radius:13px;background:rgba(127,127,127,.07);display:grid;gap:3px;min-width:0}.amount-progress-grid small{font-size:11px;opacity:.72}.amount-progress-grid b{font-size:13px;line-height:1.2;overflow-wrap:anywhere}.amount-progress-grid .paid b{color:var(--primary,#16a34a)}.amount-progress-grid .remaining{background:rgba(239,68,68,.08)}.amount-progress-grid .remaining b{color:#dc2626}@media(max-width:390px){.amount-progress-grid{grid-template-columns:1fr 1fr}.amount-progress-grid>div:first-child{grid-column:1/-1}}';document.head.appendChild(st)
  }
  let tries=0,timer=setInterval(()=>{tries++;if(installHooks()||tries>160)clearInterval(timer)},50)
})();