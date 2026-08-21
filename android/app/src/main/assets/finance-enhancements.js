(function(){
  const DEFAULT_PAYMENTS=['Pix','Dinheiro','Crédito','Débito','Boleto','Transferência','Outro'];
  const FREQ_LABEL={day:'Diário',week:'Semanal',month:'Mensal'};

  function uniquePayments(list){
    let out=[];
    (Array.isArray(list)?list:[]).forEach(v=>{let x=String(v||'').trim();if(x&&!out.some(y=>y.toLowerCase()===x.toLowerCase()))out.push(x)});
    return out.length?out:[...DEFAULT_PAYMENTS];
  }
  function paymentMethods(){P.paymentMethods=uniquePayments(P.paymentMethods||DEFAULT_PAYMENTS);return P.paymentMethods}
  function savePayments(){
    P={...P,paymentMethods:uniquePayments(P.paymentMethods)};
    if(!P.paymentMethods.includes(P.defaultPay))P.defaultPay=P.paymentMethods[0];
    if(!P.paymentMethods.includes(pay))pay=P.paymentMethods[0];
    if($('payTxt'))$('payTxt').textContent=pay;
    local(false,true);renderProfile?.();
  }

  function openPaymentPicker(){
    let methods=paymentMethods();
    openOpt('Forma de pagamento',methods,pay,v=>{pay=v;$('payTxt').textContent=v});
    let manage=document.createElement('button');manage.type='button';manage.className='payment-manage-link';manage.innerHTML='<span>⚙️</span><b>Adicionar ou excluir formas</b><i>›</i>';
    manage.onclick=e=>{e.stopPropagation();openPaymentManager()};
    $('optList')?.appendChild(manage);
  }
  function openPaymentManager(){
    $('optTitle').textContent='Formas de pagamento';
    $('optSheet').classList.add('on');
    let list=$('optList');if(!list)return;
    const renderManager=()=>{
      let methods=paymentMethods();
      list.innerHTML=`<div class="payment-manager"><div class="payment-manager-list">${methods.map((m,i)=>`<div class="payment-manager-row"><span>${esc(m)}</span><button type="button" class="payment-delete" data-payment-index="${i}" aria-label="Excluir ${esc(m)}">×</button></div>`).join('')}</div><div class="payment-add-row"><input id="newPaymentMethod" maxlength="32" placeholder="Nova forma de pagamento"><button type="button" id="addPaymentMethod">Adicionar</button></div><small class="payment-help">Os lançamentos antigos continuam mostrando a forma usada, mesmo que você a exclua desta lista.</small></div>`;
      list.querySelectorAll('.payment-delete').forEach(btn=>btn.onclick=e=>{
        e.stopPropagation();
        let methods=paymentMethods();if(methods.length<=1)return alert('Mantenha pelo menos uma forma de pagamento.');
        let removed=methods[+btn.dataset.paymentIndex];
        if(!confirm('Excluir “'+removed+'” das opções?'))return;
        P={...P,paymentMethods:methods.filter((_,i)=>i!==+btn.dataset.paymentIndex)};savePayments();renderManager();
      });
      let add=()=>{
        let input=$('newPaymentMethod'),name=input?.value.trim();if(!name)return;
        let methods=paymentMethods();if(methods.some(x=>x.toLowerCase()===name.toLowerCase()))return alert('Essa forma de pagamento já existe.');
        P={...P,paymentMethods:[...methods,name]};savePayments();renderManager();
      };
      $('addPaymentMethod').onclick=e=>{e.stopPropagation();add()};
      $('newPaymentMethod').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();add()}};
    };
    renderManager();
  }

  function addPaymentSettings(){
    if($('paymentSettingsCard'))return;
    let anchor=$('defaultPayPick')?.closest('.settings-panel');if(!anchor)return;
    let title=document.createElement('div');title.className='settings-section-title';title.textContent='Formas de pagamento';
    let card=document.createElement('div');card.id='paymentSettingsCard';card.className='card settings-panel payment-settings-card';
    card.innerHTML='<button type="button" id="managePaymentsSettings" class="setting-menu-button"><span class="menu-icon">💳</span><span class="menu-copy"><b>Gerenciar formas de pagamento</b><small>Adicione ou exclua Pix, cartões, dinheiro e outras opções</small></span><i>›</i></button>';
    anchor.after(title,card);
    $('managePaymentsSettings').onclick=openPaymentManager;
  }

  function parseIso(iso){let [y,m,d]=String(iso||'').split('-').map(Number);return new Date(y||1970,(m||1)-1,d||1,12,0,0,0)}
  function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function scheduleDate(start,index,freq){
    let base=parseIso(start),d=new Date(base);
    if(freq==='day')d.setDate(d.getDate()+index);
    else if(freq==='week')d.setDate(d.getDate()+index*7);
    else{
      let day=base.getDate(),targetMonth=base.getMonth()+index,targetYear=base.getFullYear()+Math.floor(targetMonth/12);targetMonth=((targetMonth%12)+12)%12;
      let last=new Date(targetYear,targetMonth+1,0).getDate();d=new Date(targetYear,targetMonth,Math.min(day,last),12,0,0,0);
    }
    return isoDate(d)
  }
  function amountForInstallment(total,count,index){
    let cents=Math.max(0,Math.round((+total||0)*100)),base=Math.floor(cents/count),rem=cents-base*count;
    return (base+(index<rem?1:0))/100
  }
  function installmentState(entry){
    let inst=entry?.installment;if(!inst?.enabled)return null;
    let count=Math.max(2,Math.min(360,+inst.count||2)),freq=['day','week','month'].includes(inst.frequency)?inst.frequency:'month',start=inst.startDate||entry.date;
    let today=new Date();today.setHours(12,0,0,0);let passed=0,nextDate='';
    for(let i=0;i<count;i++){let d=parseIso(scheduleDate(start,i,freq));if(d<=today)passed=i+1;else{nextDate=isoDate(d);break}}
    let remaining=Math.max(0,count-passed);
    return{count,freq,start,passed,remaining,nextDate,complete:remaining===0}
  }
  function formatDatePt(iso){if(!iso)return'—';return parseIso(iso).toLocaleDateString('pt-BR')}

  function injectInstallmentUi(){
    if($('installmentBox'))return;
    let paymentField=$('payPick')?.closest('.field');if(!paymentField)return;
    let box=document.createElement('div');box.id='installmentBox';box.className='installment-box hide';
    box.innerHTML=`<label class="installment-toggle"><span><b>Compra parcelada</b><small>Divida este gasto e acompanhe automaticamente quantas parcelas faltam.</small></span><span class="switch"><input id="installmentToggle" type="checkbox"><span></span></span></label><div id="installmentDetails" class="installment-details hide"><div class="installment-grid"><div class="field"><label>Quantidade de parcelas</label><input id="installmentCount" type="number" min="2" max="360" value="2" inputmode="numeric"></div><div class="field"><label>Periodicidade</label><button type="button" id="installmentFrequencyPick" class="pick"><span><b id="installmentFrequencyTxt">Mensal</b><small>Dia, semana ou mês</small></span><i>⌄</i></button></div></div><div class="installment-preview"><div><small>Valor aproximado por parcela</small><b id="installmentValue">R$ 0,00</b></div><div><small>Situação pelo calendário</small><b id="installmentProgress">—</b></div><span id="installmentNext">Informe data, valor e parcelas.</span></div></div>`;
    paymentField.after(box);
    $('installmentToggle').onchange=()=>{syncInstallmentUi();updateInstallmentPreview()};
    $('installmentCount').oninput=updateInstallmentPreview;
    $('value').addEventListener('input',updateInstallmentPreview);
    $('date').addEventListener('change',updateInstallmentPreview);
    $('installmentFrequencyPick').onclick=()=>openOpt('Periodicidade',['Diário','Semanal','Mensal'],FREQ_LABEL[currentInstallmentFrequency()],v=>{box.dataset.frequency=v==='Diário'?'day':v==='Semanal'?'week':'month';$('installmentFrequencyTxt').textContent=v;updateInstallmentPreview()});
  }
  function currentInstallmentFrequency(){return $('installmentBox')?.dataset.frequency||'month'}
  function installmentEnabled(){return type==='expense'&&!!$('installmentToggle')?.checked}
  function syncInstallmentUi(){
    let box=$('installmentBox');if(!box)return;
    box.classList.toggle('hide',type!=='expense');
    $('installmentDetails')?.classList.toggle('hide',!installmentEnabled());
    let valueLabel=$('value')?.closest('.field')?.querySelector('label');if(valueLabel)valueLabel.textContent=installmentEnabled()?'Valor total da compra':'Valor';
  }
  function resetInstallmentUi(){
    if(!$('installmentBox'))return;
    $('installmentToggle').checked=false;$('installmentCount').value='2';$('installmentBox').dataset.frequency='month';$('installmentFrequencyTxt').textContent='Mensal';syncInstallmentUi();updateInstallmentPreview()
  }
  function loadInstallmentUi(entry){
    let inst=entry?.installment,enabled=entry?.type==='expense'&&!!inst?.enabled;
    $('installmentToggle').checked=enabled;$('installmentCount').value=enabled?Math.max(2,+inst.count||2):2;$('installmentBox').dataset.frequency=enabled?(inst.frequency||'month'):'month';$('installmentFrequencyTxt').textContent=FREQ_LABEL[currentInstallmentFrequency()]||'Mensal';syncInstallmentUi();updateInstallmentPreview()
  }
  function updateInstallmentPreview(){
    if(!$('installmentBox'))return;
    if(!installmentEnabled())return;
    let count=Math.max(2,Math.min(360,+$('installmentCount').value||2)),total=+$('value').value||0,start=$('date').value||now().d,freq=currentInstallmentFrequency(),fake={date:start,value:total,installment:{enabled:true,count,frequency:freq,startDate:start}},st=installmentState(fake);
    $('installmentValue').textContent=money(amountForInstallment(total,count,0));
    $('installmentProgress').textContent=st.complete?'Concluído':`${st.passed} de ${st.count} passaram • faltam ${st.remaining}`;
    $('installmentNext').textContent=st.complete?'Todas as datas das parcelas já passaram.':`Próxima parcela: ${formatDatePt(st.nextDate)} • frequência ${FREQ_LABEL[freq].toLowerCase()}`;
  }

  const originalSetType=setType;setType=function(t){originalSetType(t);if(t!=='expense'&&$('installmentToggle'))$('installmentToggle').checked=false;syncInstallmentUi();updateInstallmentPreview()};
  const originalReset=reset;reset=function(){originalReset();resetInstallmentUi()};
  const originalEdit=window.editEntry;window.editEntry=id=>{let e=E.find(x=>x.id===id);originalEdit(id);if(e)setTimeout(()=>loadInstallmentUi(e),0)};

  const originalSave=$('save').onclick;
  $('save').onclick=()=>{
    let wants=installmentEnabled(),count=Math.max(2,Math.min(360,+$('installmentCount')?.value||2)),freq=currentInstallmentFrequency(),start=$('date').value,editingId=edit,before=new Set(E.map(e=>e.id));
    if(wants&&count<2)return alert('Informe pelo menos 2 parcelas.');
    originalSave();
    let target=editingId?E.find(e=>e.id===editingId):E.find(e=>!before.has(e.id));if(!target)return;
    if(wants)target.installment={enabled:true,count,frequency:freq,startDate:start||target.date,totalValue:+target.value||0};else delete target.installment;
    target.updatedAt=Date.now();local();render();
  };

  function expandEntry(entry){
    let inst=entry?.installment;if(entry?.type!=='expense'||!inst?.enabled)return[entry];
    let st=installmentState(entry),count=st.count,out=[];
    for(let i=0;i<count;i++){
      let date=scheduleDate(st.start,i,st.freq),value=amountForInstallment(inst.totalValue??entry.value,count,i),ts=new Date(date+'T'+(entry.time||'12:00')).getTime();
      out.push({...entry,id:entry.id,date,value,ts,_installmentIndex:i+1,_installmentTotal:count,_installmentFrequency:st.freq,_installmentRemaining:st.remaining,_installmentPassed:st.passed,_installmentNext:st.nextDate,_installmentParentId:entry.id});
    }
    return out
  }
  list=function(m){return E.flatMap(expandEntry).filter(e=>e.date?.startsWith(m))};
  months=function(){let a=[],d=new Date;for(let i=0;i<=12;i++){let x=new Date(d.getFullYear(),d.getMonth()+i,1);a.push(`${x.getFullYear()}-${pad(x.getMonth()+1)}`)}for(let i=1;i<=17;i++){let x=new Date(d.getFullYear(),d.getMonth()-i,1);a.push(`${x.getFullYear()}-${pad(x.getMonth()+1)}`)}return a};

  eh=function(e){
    let inst=e._installmentIndex?`<div class="installment-history"><span>💳 Parcela ${e._installmentIndex}/${e._installmentTotal}</span><span>${FREQ_LABEL[e._installmentFrequency]}</span><span>${e._installmentRemaining?`Faltam ${e._installmentRemaining}`:'Concluído'}</span>${e._installmentNext?`<span>Próxima ${formatDatePt(e._installmentNext)}</span>`:''}</div>`:'';
    return`<div class="hist"><div><h4>${esc(e.cat)}${e.subcat?' › '+esc(e.subcat):''}</h4><div class="meta">${e.description?esc(e.description)+' • ':''}${esc(e.payment||'')} • ${e.date.split('-').reverse().join('/')} às ${e.time}</div>${inst}</div><div><div class="amt ${e.type==='gain'?'g':'r'}">${e.type==='gain'?'+':'-'} ${money(e.value)}</div><div class="acts"><button class="sm" onclick="editEntry('${e._installmentParentId||e.id}')">Editar</button><button class="sm" onclick="delEntry('${e._installmentParentId||e.id}')">Excluir</button></div></div></div>`
  };
  rows=function(){return[['Tipo','Categoria','Subcategoria','Valor','Pagamento','Descrição','Data','Hora','Parcela','Periodicidade','Faltam'],...list(month).sort((a,b)=>a.ts-b.ts).map(e=>[e.type==='gain'?'Ganho':'Gasto',e.cat,e.subcat||'',e.value,e.payment||'',e.description||'',e.date,e.time,e._installmentIndex?`${e._installmentIndex}/${e._installmentTotal}`:'',e._installmentFrequency?FREQ_LABEL[e._installmentFrequency]:'',e._installmentIndex?e._installmentRemaining:''])]};

  function injectInstallmentStyles(){
    if($('financeEnhancementStyle'))return;
    let st=document.createElement('style');st.id='financeEnhancementStyle';st.textContent=`
      .payment-manage-link{width:100%;margin-top:12px;border:0;border-radius:16px;padding:14px 16px;display:flex;gap:10px;align-items:center;text-align:left;background:color-mix(in srgb,var(--primary,#16a34a) 12%,transparent);color:inherit;font:inherit}.payment-manage-link b{flex:1}.payment-manager{display:grid;gap:14px}.payment-manager-list{display:grid;gap:8px}.payment-manager-row{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:15px;background:var(--card,#fff);border:1px solid rgba(127,127,127,.15)}.payment-manager-row span{flex:1;font-weight:750}.payment-delete{width:36px;height:36px;border:0;border-radius:12px;font-size:22px;background:rgba(239,68,68,.12);color:#dc2626}.payment-add-row{display:grid;grid-template-columns:1fr auto;gap:8px}.payment-add-row button{border:0;border-radius:14px;padding:0 15px;font-weight:800;background:var(--primary,#16a34a);color:white}.payment-help{line-height:1.35;opacity:.72}.payment-settings-card{overflow:hidden}.installment-box{margin:-2px 0 15px;padding:14px;border-radius:18px;background:color-mix(in srgb,var(--primary,#16a34a) 8%,var(--card,#fff));border:1px solid color-mix(in srgb,var(--primary,#16a34a) 22%,transparent)}.installment-toggle{display:flex;align-items:center;gap:12px}.installment-toggle>span:first-child{flex:1;display:grid;gap:3px}.installment-toggle small{opacity:.7;line-height:1.3}.installment-details{padding-top:14px}.installment-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.installment-grid .field{margin:0}.installment-preview{margin-top:12px;padding:12px;border-radius:15px;background:rgba(127,127,127,.08);display:grid;grid-template-columns:1fr 1fr;gap:10px}.installment-preview>div{display:grid;gap:3px}.installment-preview>span{grid-column:1/-1;font-size:12px;opacity:.75}.installment-history{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.installment-history span{font-size:11px;font-weight:750;padding:4px 7px;border-radius:999px;background:color-mix(in srgb,var(--primary,#16a34a) 11%,transparent)}@media(max-width:390px){.installment-grid,.installment-preview{grid-template-columns:1fr}}`;
    document.head.appendChild(st)
  }

  paymentMethods();injectInstallmentStyles();injectInstallmentUi();addPaymentSettings();
  $('payPick').onclick=openPaymentPicker;
  if($('defaultPayPick'))$('defaultPayPick').onclick=()=>openOpt('Pagamento padrão',paymentMethods(),P.defaultPay||paymentMethods()[0],v=>{P={...P,defaultPay:v};local(false,true);renderProfile()});
  syncInstallmentUi();updateInstallmentPreview();render();
})();
