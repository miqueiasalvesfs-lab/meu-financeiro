(function(){
  const FREQ_LABEL={day:'Diário',week:'Semanal',month:'Mensal'};
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
  function automaticProgress(count,start,freq){
    count=clamp(count,2,360);let today=new Date();today.setHours(12,0,0,0);let paid=0;
    for(let i=0;i<count;i++){if(parseIso(scheduleDate(start,i,freq))<=today)paid=i+1;else break}
    return{paid,remaining:Math.max(0,count-paid),nextDate:paid<count?scheduleDate(start,paid,freq):''}
  }
  function draftBase(){
    let count=clamp(document.getElementById('installmentCount')?.value||2,2,360),start=document.getElementById('date')?.value||new Date().toISOString().slice(0,10),freq=document.getElementById('installmentBox')?.dataset.frequency||'month';
    if(!['day','week','month'].includes(freq))freq='month';
    return{count,start,freq,auto:automaticProgress(count,start,freq)}
  }
  function ensureUi(){
    let details=document.getElementById('installmentDetails');if(!details||document.getElementById('installmentProgressControl'))return false;
    let block=document.createElement('div');block.id='installmentProgressControl';block.className='installment-progress-control';block.dataset.mode='auto';
    block.innerHTML=`<div class="progress-control-head"><div><b>Controle das parcelas</b><small>Conte pelas datas ou ajuste manualmente.</small></div><span id="installmentModeBadge">Automático</span></div><div class="progress-mode-seg"><button type="button" data-progress-mode="auto" class="on">⚙ Automático</button><button type="button" data-progress-mode="manual">✍ Manual</button></div><div id="installmentAutoInfo" class="progress-auto-info"></div><div id="installmentManualFields" class="progress-manual-fields hide"><div class="field"><label>Parcelas pagas</label><input id="installmentPaid" type="number" min="0" value="0" inputmode="numeric"></div><div class="field"><label>Parcelas que faltam</label><input id="installmentRemaining" type="number" min="0" value="2" inputmode="numeric"></div><small>Ao alterar uma quantidade, a outra é recalculada automaticamente.</small></div>`;
    let preview=details.querySelector('.installment-preview');details.insertBefore(block,preview||null);
    block.querySelectorAll('[data-progress-mode]').forEach(btn=>btn.onclick=()=>setMode(btn.dataset.progressMode,true));
    document.getElementById('installmentPaid').addEventListener('input',()=>syncManual('paid'));
    document.getElementById('installmentRemaining').addEventListener('input',()=>syncManual('remaining'));
    document.getElementById('installmentCount')?.addEventListener('input',()=>{if(currentMode()==='manual')syncManual('paid');renderControl()});
    document.getElementById('date')?.addEventListener('change',renderControl);
    document.getElementById('installmentToggle')?.addEventListener('change',()=>setTimeout(renderControl,0));
    let freqText=document.getElementById('installmentFrequencyTxt');if(freqText)new MutationObserver(()=>setTimeout(renderControl,0)).observe(freqText,{childList:true,subtree:true,characterData:true});
    injectStyle();renderControl();return true
  }
  function currentMode(){return document.getElementById('installmentProgressControl')?.dataset.mode==='manual'?'manual':'auto'}
  function setMode(mode,fromUser=false){
    let block=document.getElementById('installmentProgressControl');if(!block)return;
    mode=mode==='manual'?'manual':'auto';
    if(mode==='manual'&&fromUser&&currentMode()!=='manual'){
      let {count,auto}=draftBase();document.getElementById('installmentPaid').value=auto.paid;document.getElementById('installmentRemaining').value=count-auto.paid
    }
    block.dataset.mode=mode;renderControl()
  }
  function syncManual(source){
    let {count}=draftBase(),paidEl=document.getElementById('installmentPaid'),remEl=document.getElementById('installmentRemaining');if(!paidEl||!remEl)return;
    if(source==='remaining'){let rem=clamp(remEl.value,0,count);remEl.value=rem;paidEl.value=count-rem}
    else{let paid=clamp(paidEl.value,0,count);paidEl.value=paid;remEl.value=count-paid}
    renderControl()
  }
  function progressDraft(){
    let {count,start,freq,auto}=draftBase(),mode=currentMode();
    if(mode==='manual'){
      let paid=clamp(document.getElementById('installmentPaid')?.value,0,count),remaining=count-paid;
      return{mode,count,start,freq,paid,remaining,nextDate:paid<count?scheduleDate(start,paid,freq):'',automaticPaid:auto.paid,automaticRemaining:auto.remaining}
    }
    return{mode:'auto',count,start,freq,paid:auto.paid,remaining:auto.remaining,nextDate:auto.nextDate,automaticPaid:auto.paid,automaticRemaining:auto.remaining}
  }
  function renderControl(){
    let block=document.getElementById('installmentProgressControl');if(!block)return;
    let p=progressDraft(),manual=p.mode==='manual';
    block.querySelectorAll('[data-progress-mode]').forEach(b=>b.classList.toggle('on',b.dataset.progressMode===p.mode));
    document.getElementById('installmentManualFields')?.classList.toggle('hide',!manual);
    let badge=document.getElementById('installmentModeBadge');if(badge)badge.textContent=manual?'Manual':'Automático';
    let autoInfo=document.getElementById('installmentAutoInfo');if(autoInfo)autoInfo.innerHTML=`<span>⚙ Pelo calendário</span><b>${p.automaticPaid} pagas • ${p.automaticRemaining} faltam</b>${manual?'<small>O ajuste manual está valendo neste lançamento.</small>':'<small>Atualiza sozinho conforme as datas passam.</small>'}`;
    if(manual){document.getElementById('installmentPaid').max=p.count;document.getElementById('installmentRemaining').max=p.count}
    let progress=document.getElementById('installmentProgress');if(progress)progress.textContent=p.remaining===0?'Concluído':`${p.paid} pagas • faltam ${p.remaining}${manual?' • manual':''}`;
    let next=document.getElementById('installmentNext');if(next&&manual)next.textContent=p.remaining===0?'Todas as parcelas foram marcadas como pagas.':`Próxima prevista: ${parseIso(p.nextDate).toLocaleDateString('pt-BR')} • frequência ${FREQ_LABEL[p.freq].toLowerCase()}`
  }
  function resetUi(){
    if(!ensureUi()){}
    let block=document.getElementById('installmentProgressControl');if(!block)return;block.dataset.mode='auto';
    let {count,auto}=draftBase();document.getElementById('installmentPaid').value=auto.paid;document.getElementById('installmentRemaining').value=count-auto.paid;renderControl()
  }
  function loadEntry(entry){
    if(!ensureUi()||!entry?.installment?.enabled)return resetUi();
    let inst=entry.installment,{count,start,freq,auto}=draftBase(),mode=inst.progressMode==='manual'?'manual':'auto';
    document.getElementById('installmentProgressControl').dataset.mode=mode;
    let paid=mode==='manual'?clamp(inst.manualPaid,0,count):auto.paid;
    document.getElementById('installmentPaid').value=paid;document.getElementById('installmentRemaining').value=count-paid;renderControl()
  }
  function parentProgress(parent){
    let inst=parent?.installment;if(!inst?.enabled)return null;
    let count=clamp(inst.count,2,360),start=inst.startDate||parent.date,freq=['day','week','month'].includes(inst.frequency)?inst.frequency:'month',auto=automaticProgress(count,start,freq);
    if(inst.progressMode==='manual'){
      let paid=clamp(inst.manualPaid,0,count);return{mode:'manual',paid,remaining:count-paid,nextDate:paid<count?scheduleDate(start,paid,freq):'',count,start,freq,automaticPaid:auto.paid,automaticRemaining:auto.remaining}
    }
    return{mode:'auto',paid:auto.paid,remaining:auto.remaining,nextDate:auto.nextDate,count,start,freq,automaticPaid:auto.paid,automaticRemaining:auto.remaining}
  }

  function installHooks(){
    if(!ensureUi()||window.__installmentProgressHooks)return false;window.__installmentProgressHooks=true;
    const originalReset=reset;reset=function(){originalReset();setTimeout(resetUi,0)};
    const originalEdit=window.editEntry;window.editEntry=id=>{let entry=E.find(x=>x.id===id);originalEdit(id);setTimeout(()=>loadEntry(entry),30)};
    const originalSave=document.getElementById('save').onclick;
    document.getElementById('save').onclick=()=>{
      let active=type==='expense'&&!!document.getElementById('installmentToggle')?.checked,editingId=edit,before=new Set(E.map(e=>e.id)),progress=active?progressDraft():null;
      originalSave();if(!active||!progress)return;
      let target=editingId?E.find(e=>e.id===editingId):E.find(e=>!before.has(e.id));if(!target?.installment)return;
      target.installment.progressMode=progress.mode;
      if(progress.mode==='manual'){
        target.installment.manualPaid=progress.paid;target.installment.manualRemaining=progress.remaining;target.installment.manualUpdatedAt=Date.now()
      }else{
        delete target.installment.manualPaid;delete target.installment.manualRemaining;delete target.installment.manualUpdatedAt
      }
      target.updatedAt=Date.now();local();render()
    };
    const originalList=list;list=function(m){
      return originalList(m).map(e=>{
        if(!e._installmentParentId)return e;
        let parent=E.find(x=>x.id===e._installmentParentId),p=parentProgress(parent);if(!p)return e;
        return{...e,_installmentPassed:p.paid,_installmentRemaining:p.remaining,_installmentNext:p.nextDate,_installmentProgressMode:p.mode,_installmentAutomaticPaid:p.automaticPaid,_installmentAutomaticRemaining:p.automaticRemaining}
      })
    };
    const originalEh=eh;eh=function(e){
      let html=originalEh(e);if(!e._installmentIndex)return html;
      let chips=`<span>✅ Pagas ${e._installmentPassed}</span><span>${e._installmentProgressMode==='manual'?'✍ Manual':'⚙ Automático'}</span>`;
      return html.replace('<div class="installment-history">','<div class="installment-history">'+chips)
    };
    rows=function(){return[['Tipo','Categoria','Subcategoria','Valor','Pagamento','Descrição','Data','Hora','Parcela','Periodicidade','Pagas','Faltam','Controle'],...list(month).sort((a,b)=>a.ts-b.ts).map(e=>[e.type==='gain'?'Ganho':'Gasto',e.cat,e.subcat||'',e.value,e.payment||'',e.description||'',e.date,e.time,e._installmentIndex?`${e._installmentIndex}/${e._installmentTotal}`:'',e._installmentFrequency?FREQ_LABEL[e._installmentFrequency]:'',e._installmentIndex?e._installmentPassed:'',e._installmentIndex?e._installmentRemaining:'',e._installmentIndex?(e._installmentProgressMode==='manual'?'Manual':'Automático'):''])]};
    setTimeout(()=>{resetUi();render()},0);return true
  }
  function injectStyle(){
    if(document.getElementById('installmentProgressStyle'))return;let style=document.createElement('style');style.id='installmentProgressStyle';style.textContent=`
      .installment-progress-control{margin-top:12px;padding:13px;border-radius:16px;background:rgba(127,127,127,.07);display:grid;gap:10px}.progress-control-head{display:flex;align-items:flex-start;gap:10px}.progress-control-head>div{flex:1;display:grid;gap:2px}.progress-control-head small{opacity:.7}.progress-control-head>span{padding:5px 8px;border-radius:999px;font-size:11px;font-weight:800;background:color-mix(in srgb,var(--primary,#16a34a) 14%,transparent)}.progress-mode-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:14px;background:rgba(127,127,127,.08)}.progress-mode-seg button{border:0;border-radius:11px;padding:10px 8px;background:transparent;color:inherit;font-weight:800}.progress-mode-seg button.on{background:var(--card,#fff);box-shadow:0 2px 10px rgba(0,0,0,.08);color:var(--primary,#16a34a)}.progress-auto-info{display:grid;grid-template-columns:1fr auto;gap:3px 10px;padding:10px 11px;border-radius:13px;background:color-mix(in srgb,var(--primary,#16a34a) 7%,transparent);font-size:12px}.progress-auto-info b{text-align:right}.progress-auto-info small{grid-column:1/-1;opacity:.7}.progress-manual-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.progress-manual-fields .field{margin:0}.progress-manual-fields>small{grid-column:1/-1;opacity:.7;line-height:1.35}@media(max-width:390px){.progress-manual-fields{grid-template-columns:1fr 1fr}.progress-auto-info{grid-template-columns:1fr}.progress-auto-info b{text-align:left}}`;
    document.head.appendChild(style)
  }
  let tries=0,timer=setInterval(()=>{tries++;if(installHooks()||tries>120)clearInterval(timer)},50)
})();
