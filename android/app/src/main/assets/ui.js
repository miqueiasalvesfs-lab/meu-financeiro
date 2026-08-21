function tab(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on',p.id===id));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===id));
  if(id==='report'||id==='history')render();
  if(id==='settings'&&typeof renderProfile==='function')renderProfile();
  if($('fabLaunch'))$('fabLaunch').classList.toggle('hide',id==='settings');
  window.scrollTo({top:0,behavior:'instant'})
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));

function openLaunch(isEdit=false){
  if(!isEdit){
    reset();
    let dt=P?.defaultType||'gain',dp=P?.defaultPay||'Pix';
    type=dt==='expense'?'expense':'gain';pay=dp;
    $('payTxt').textContent=pay;
    setType(type)
  }
  $('launchModalTitle').textContent=edit?'Editar lançamento':'Novo lançamento';
  $('launchModal').classList.add('on');$('launchModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  setTimeout(()=>!edit&&$('value')?.focus(),180)
}
function closeLaunch(){
  $('launchModal').classList.remove('on');$('launchModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open')
}
$('fabLaunch').onclick=()=>openLaunch(false);
$('closeLaunch').onclick=()=>{reset();closeLaunch()};
document.querySelectorAll('[data-close-launch]').forEach(x=>x.onclick=()=>{reset();closeLaunch()});

function setType(t){
  type=t;$('bg').className='g '+(t==='gain'?'on':'');$('be').className='r '+(t==='expense'?'on':'');
  $('save').className='primary '+(t==='expense'?'r':'');
  $('save').textContent=(edit?'Atualizar ':'Salvar ')+(t==='gain'?'ganho':'gasto');
  if(!C[t]?.includes(cat)){cat=C[t]?.[0]||'';sub=''}catDisplay()
}
$('bg').onclick=()=>setType('gain');$('be').onclick=()=>setType('expense');

function catDisplay(){$('catTxt').textContent=cat||'Escolha uma categoria';$('subTxt').textContent=sub?'Subcategoria: '+sub:'Toque para escolher'}
function catRender(){
  let a=C[type]||[];
  $('catList').innerHTML=a.map(c=>`<div class="catbox"><div class="cathead"><button class="catpick" data-cat="${esc(c)}">${esc(c)}</button><div class="tools"><button data-sub="${esc(c)}">＋ Sub</button><button class="del" data-del="${esc(c)}">Excluir</button></div></div><div class="chips">${(S[type+'|'+c]||[]).map(x=>`<button class="chip ${c===cat&&x===sub?'on':''}" data-c="${esc(c)}" data-s="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`).join('')||'<div class="empty">Nenhuma categoria.</div>'
}
$('catPick').onclick=()=>{catRender();$('catSheet').classList.add('on')};
$('catSheet').onclick=e=>{
  if(e.target===$('catSheet'))$('catSheet').classList.remove('on');
  let b=e.target.closest('button');if(!b)return;
  if(b.dataset.cat){cat=b.dataset.cat;sub='';catDisplay();$('catSheet').classList.remove('on')}
  if(b.dataset.c){cat=b.dataset.c;sub=b.dataset.s;catDisplay();$('catSheet').classList.remove('on')}
  if(b.dataset.sub){let n=prompt('Nome da subcategoria:');if(n){let k=type+'|'+b.dataset.sub;S[k]=S[k]||[];if(!S[k].includes(n.trim()))S[k].push(n.trim());local(true);catRender()}}
  if(b.dataset.del&&confirm('Excluir esta categoria da lista? Os lançamentos antigos serão mantidos.')){C[type]=C[type].filter(x=>x!==b.dataset.del);delete S[type+'|'+b.dataset.del];if(cat===b.dataset.del){cat=C[type][0]||'';sub=''}local(true);catRender();catDisplay()}
};
$('addCat').onclick=()=>{let n=$('newCat').value.trim();if(n&&!C[type].some(x=>x.toLowerCase()===n.toLowerCase())){C[type].push(n);cat=n;sub='';$('newCat').value='';local(true);catRender();catDisplay()}};

let opts=[],optCb=null;
function openOpt(title,list,current,cb){opts=list;optCb=cb;$('optTitle').textContent=title;$('optList').innerHTML=list.map(x=>`<button class="opt ${x===current?'on':''}" data-v="${esc(x)}">${esc(x)}</button>`).join('');$('optSheet').classList.add('on')}
$('optSheet').onclick=e=>{if(e.target===$('optSheet'))$('optSheet').classList.remove('on');let b=e.target.closest('.opt');if(b){optCb?.(b.dataset.v);$('optSheet').classList.remove('on')}};
$('payPick').onclick=()=>openOpt('Forma de pagamento',['Pix','Dinheiro','Crédito','Débito','Boleto','Transferência','Outro'],pay,v=>{pay=v;$('payTxt').textContent=v});

function months(){let a=[],d=new Date;for(let i=0;i<18;i++){let x=new Date(d.getFullYear(),d.getMonth()-i,1);a.push(`${x.getFullYear()}-${pad(x.getMonth()+1)}`)}return a}
$('monthPick').onclick=()=>openOpt('Mês do relatório',months().map(mn),mn(month),v=>{month=months()[months().map(mn).indexOf(v)];render()});
$('histMonthPick').onclick=()=>openOpt('Mês do histórico',months().map(mn),mn(hmonth),v=>{hmonth=months()[months().map(mn).indexOf(v)];render()});

function reset(){
  let n=now();edit=null;$('value').value='';$('desc').value='';$('date').value=n.d;$('time').value=n.t;$('cancel').classList.add('hide');
  if(P?.defaultPay){pay=P.defaultPay;$('payTxt').textContent=pay}
  setType(P?.defaultType==='expense'?'expense':'gain')
}
$('cancel').onclick=()=>{reset();closeLaunch()};

$('save').onclick=()=>{
  let v=+$('value').value;if(!(v>0)||!cat)return alert('Informe valor e categoria.');
  let t=Date.now(),o={id:edit||crypto.randomUUID?.()||String(t),type,value:v,cat,subcat:sub,payment:pay,description:$('desc').value.trim(),date:$('date').value,time:$('time').value,ts:new Date($('date').value+'T'+$('time').value).getTime(),updatedAt:t};
  E=edit?E.map(e=>e.id===edit?o:e):[...E,o];delete D[o.id];local();reset();render();closeLaunch();tab('home')
};
window.editEntry=id=>{
  let e=E.find(x=>x.id===id);if(!e)return;
  edit=id;type=e.type;cat=e.cat;sub=e.subcat||'';pay=e.payment||'Pix';
  $('value').value=e.value;$('desc').value=e.description||'';$('date').value=e.date;$('time').value=e.time;$('payTxt').textContent=pay;$('cancel').classList.remove('hide');
  setType(type);openLaunch(true)
};
window.delEntry=id=>{if(confirm('Excluir lançamento?')){E=E.filter(e=>e.id!==id);D[id]=Date.now();local();render()}};

function list(m){return E.filter(e=>e.date?.startsWith(m))}
function sums(a){let g=a.filter(e=>e.type==='gain').reduce((s,e)=>s+ +e.value,0),x=a.filter(e=>e.type==='expense').reduce((s,e)=>s+ +e.value,0);return{g,x,b:g-x}}
function eh(e){return`<div class="hist"><div><h4>${esc(e.cat)}${e.subcat?' › '+esc(e.subcat):''}</h4><div class="meta">${e.description?esc(e.description)+' • ':''}${esc(e.payment||'')} • ${e.date.split('-').reverse().join('/')} às ${e.time}</div></div><div><div class="amt ${e.type==='gain'?'g':'r'}">${e.type==='gain'?'+':'-'} ${money(e.value)}</div><div class="acts"><button class="sm" onclick="editEntry('${e.id}')">Editar</button><button class="sm" onclick="delEntry('${e.id}')">Excluir</button></div></div></div>`}
function chart(a){let z={};a.forEach(e=>{let k=(e.type==='gain'?'G|':'D|')+e.cat;z[k]=(z[k]||0)+ +e.value});let d=Object.entries(z).sort((a,b)=>b[1]-a[1]).slice(0,10),mx=Math.max(1,...d.map(x=>x[1]));$('chart').innerHTML=d.length?d.map(([k,v])=>{let[t,c]=k.split('|');return`<div class="bc"><div class="bw"><div class="bar ${t==='D'?'r':''}" style="height:${Math.max(3,v/mx*125)}px"></div></div><small>${esc(c)}</small></div>`}).join(''):'<div class="empty">Sem dados.</div>'}

function renderHomeSummary(a,s){
  $('homeCount').textContent=a.length;
  let expenses=a.filter(e=>e.type==='expense'),top=expenses.length?Math.max(...expenses.map(e=>+e.value||0)):0;
  $('homeTopExpense').textContent=money(top);$('homeBalanceMini').textContent=money(s.b);
  $('homeGainChartValue').textContent=money(s.g);$('homeExpenseChartValue').textContent=money(s.x);
  let mx=Math.max(1,s.g,s.x);$('homeGainBar').style.width=Math.max(s.g?5:0,s.g/mx*100)+'%';$('homeExpenseBar').style.width=Math.max(s.x?5:0,s.x/mx*100)+'%'
}

function render(){
  let cm=now().m,a=list(cm),s=sums(a);
  $('bal').textContent=money(s.b);$('hg').textContent=money(s.g);$('he').textContent=money(s.x);
  renderHomeSummary(a,s);
  let gl=+G[cm]||0;$('goal').value=gl||'';let pc=gl?Math.min(100,s.g/gl*100):0;$('goalbar').style.width=pc+'%';$('goalpct').textContent=gl?Math.round(pc)+'% atingido':'Defina sua meta';$('goalleft').textContent=gl?(s.g>=gl?'Meta atingida 🎉':'Falta '+money(gl-s.g)):'';
  $('recent').innerHTML=[...a].sort((x,y)=>y.ts-x.ts).slice(0,5).map(eh).join('')||'<div class="empty">Nenhum lançamento.</div>';
  $('monthTxt').textContent=mn(month);let ra=list(month),rs=sums(ra);$('rg').textContent=money(rs.g);$('re').textContent=money(rs.x);$('rb').textContent=money(rs.b);chart(ra);
  $('histMonthTxt').textContent=mn(hmonth);$('historyList').innerHTML=[...list(hmonth)].sort((x,y)=>y.ts-x.ts).map(eh).join('')||'<div class="empty">Nenhum lançamento.</div>';
  if(typeof renderProfile==='function')renderProfile()
}
$('saveGoal').onclick=()=>{G[now().m]=+$('goal').value||0;local(true);render()};

function rows(){return[['Tipo','Categoria','Subcategoria','Valor','Pagamento','Descrição','Data','Hora'],...list(month).sort((a,b)=>a.ts-b.ts).map(e=>[e.type==='gain'?'Ganho':'Gasto',e.cat,e.subcat||'',e.value,e.payment||'',e.description||'',e.date,e.time])]}
function csv(){return'\ufeff'+rows().map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\n')}
function dl(n,c,t){if(window.AndroidBridge?.saveFile){let r=new FileReader();r.onloadend=()=>{let b=String(r.result||'').split(',')[1]||'';window.AndroidBridge.saveFile(n,b,t)};r.readAsDataURL(new Blob([c],{type:t}));return}let a=document.createElement('a');a.href=window.URL.createObjectURL(new Blob([c],{type:t}));a.download=n;a.click();setTimeout(()=>window.URL.revokeObjectURL(a.href),500)}
$('csv').onclick=()=>dl('financas-'+month+'.csv',csv(),'text/csv;charset=utf-8');$('xls').onclick=()=>dl('financas-'+month+'.xls','<table>'+rows().map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</table>','application/vnd.ms-excel');$('pdf').onclick=()=>window.AndroidBridge?.printPage?window.AndroidBridge.printPage():window.print();$('sheets').onclick=()=>{dl('financas-'+month+'.csv',csv(),'text/csv;charset=utf-8');if(window.AndroidBridge?.openExternal)window.AndroidBridge.openExternal('https://sheets.new');else window.open('https://sheets.new','_blank')};$('backup').onclick=()=>dl('ganhos-gastos-backup.json',JSON.stringify(state(),null,2),'application/json');$('restore').onclick=()=>$('restoreFile').click();$('restoreFile').onchange=async e=>{try{apply(JSON.parse(await e.target.files[0].text()));local();alert('Backup restaurado.')}catch{alert('Backup inválido.')}};

function clearFinanceLocal(){Object.values(K).forEach(k=>localStorage.removeItem(k));Object.keys(localStorage).filter(k=>k.startsWith('sb-wcydxagghuyfddjfixms-')).forEach(k=>localStorage.removeItem(k))}
async function logoutLocal(){if(confirm('Deseja sair desta conta neste celular?'))await SB.auth.signOut({scope:'local'})}
if($('privacyBtn'))$('privacyBtn').onclick=()=>{location.href='privacy.html'};
if($('logoutBtn'))$('logoutBtn').onclick=logoutLocal;
if($('deleteAccountBtn'))$('deleteAccountBtn').onclick=async()=>{
  if(!user)return alert('Entre na sua conta para continuar.');
  if(!confirm('Excluir permanentemente sua conta e todos os dados sincronizados? Esta ação não pode ser desfeita.'))return;
  let typed=prompt('Para confirmar, digite EXCLUIR');if(typed!=='EXCLUIR')return;
  let b=$('deleteAccountBtn');b.disabled=true;b.textContent='Excluindo...';
  try{let {error}=await SB.functions.invoke('delete-account',{body:{confirm:true}});if(error)throw error;clearFinanceLocal();try{await SB.auth.signOut({scope:'local'})}catch{}alert('Sua conta e os dados sincronizados foram excluídos.');location.replace('index.html?conta=excluida')}
  catch(e){console.error(e);alert('Não foi possível excluir a conta agora. Verifique sua internet e tente novamente.');b.disabled=false;b.textContent='Excluir minha conta'}
};
$('sync').onclick=logoutLocal;window.addEventListener('online',()=>user&&syncCloud());window.addEventListener('offline',()=>status('','Offline'));

function swipe(){
  let x=0,y=0,ok=false,o=['home','report','history','settings'];
  document.querySelector('.app').addEventListener('touchstart',e=>{if(e.target.closest('input,.sheetbg,.profile-card,.theme-grid,.security-row,.settings-panel'))return;let t=e.changedTouches[0];x=t.clientX;y=t.clientY;ok=true},{passive:true});
  document.querySelector('.app').addEventListener('touchend',e=>{if(!ok)return;ok=false;let t=e.changedTouches[0],dx=t.clientX-x,dy=t.clientY-y;if(Math.abs(dx)<20||Math.abs(dy)>95)return;let c=document.querySelector('.nav .on')?.dataset.tab||'home',i=o.indexOf(c);if(dx<0&&i<o.length-1)tab(o[i+1]);if(dx>0&&i>0)tab(o[i-1])},{passive:true})
}
let n=now();month=hmonth=n.m;$('date').value=n.d;$('time').value=n.t;$('today').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(new Date);catDisplay();render();swipe();if('serviceWorker'in navigator&&!window.AndroidBridge)navigator.serviceWorker.register('./sw.js');
