const PROFILE_DEFAULTS={
  name:'',avatar:'',theme:'green',appearance:'light',density:'comfortable',
  showBalance:true,showSummary:true,showGoal:true,showRecent:true,hideValues:false,
  defaultType:'gain',defaultPay:'Pix'
};
P={...PROFILE_DEFAULTS,...(P||{})};

function initials(name){return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'U'}
function currentProfileName(){return (P?.name||user?.user_metadata?.name||String(user?.email||'Usuário').split('@')[0]||'Usuário').trim()}
function setAvatarBox(boxId,imgId,fallbackId){let box=$(boxId),img=$(imgId),fb=$(fallbackId);if(!box||!img||!fb)return;let name=currentProfileName();fb.textContent=initials(name);if(P?.avatar){img.src=P.avatar;box.classList.add('has-photo')}else{img.removeAttribute('src');box.classList.remove('has-photo')}}

const THEME_NAMES={green:'Verde',blue:'Azul',purple:'Roxo',orange:'Laranja',pink:'Rosa',teal:'Turquesa'};
const APPEARANCE_NAMES={light:'Claro',dark:'Escuro',system:'Sistema'};
function resolveAppearance(){let a=P?.appearance||'light';if(a==='system')return window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';return a==='dark'?'dark':'light'}
function applyTheme(){
  let t=P?.theme||'green',density=P?.density||'comfortable';
  document.documentElement.dataset.theme=t;document.documentElement.dataset.density=density;document.documentElement.dataset.appearance=resolveAppearance();
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('on',b.dataset.themeChoice===t));
  document.querySelectorAll('[data-density]').forEach(b=>b.classList.toggle('on',b.dataset.density===density));
  document.querySelectorAll('[data-appearance-choice]').forEach(b=>b.classList.toggle('on',b.dataset.appearanceChoice===(P?.appearance||'light')));
  if($('themeCurrent'))$('themeCurrent').textContent=THEME_NAMES[t]||'Verde';
  if($('appearanceCurrent'))$('appearanceCurrent').textContent=APPEARANCE_NAMES[P?.appearance||'light']||'Claro';
  let meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=resolveAppearance()==='dark'?'#07110c':t==='blue'?'#2563eb':t==='purple'?'#7c3aed':t==='orange'?'#ea580c':t==='pink'?'#db2777':t==='teal'?'#0d9488':'#16a34a'
}
function applyHomePreferences(){
  document.body.classList.toggle('hide-home-balance',P.showBalance===false);
  document.body.classList.toggle('hide-home-summary',P.showSummary===false);
  document.body.classList.toggle('hide-home-goal',P.showGoal===false);
  document.body.classList.toggle('hide-home-recent',P.showRecent===false);
  document.body.classList.toggle('values-hidden',!!P.hideValues);
  let map={showBalanceToggle:'showBalance',showSummaryToggle:'showSummary',showGoalToggle:'showGoal',showRecentToggle:'showRecent',hideValuesToggle:'hideValues'};
  Object.entries(map).forEach(([id,k])=>{if($(id))$(id).checked=k==='hideValues'?!!P[k]:P[k]!==false});
  if($('defaultTypeTxt'))$('defaultTypeTxt').textContent=P.defaultType==='expense'?'Gasto':'Ganho';
  if($('defaultPayTxt'))$('defaultPayTxt').textContent=P.defaultPay||'Pix'
}

function applyBrandingAndDate(){
  document.title='Do Seu Jeito';
  let brand=document.querySelector('.brand h1');if(brand)brand.textContent='Do Seu Jeito';
  let logo=document.querySelector('.brand .logo img');if(logo)logo.alt='Ícone Do Seu Jeito';
  let lockTitle=document.querySelector('.bio-lock-card h2');if(lockTitle)lockTitle.textContent='Do Seu Jeito bloqueado';
  let top=document.querySelector('.top > div');
  if(top){
    let day=top.querySelector('b'),date=$('today'),d=new Date();
    if(day)day.textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'long'}).format(d);
    if(date)date.textContent=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(d);
    top.classList.add('date-only-header');
  }
  if(!document.getElementById('dateHeaderStyle')){
    let st=document.createElement('style');st.id='dateHeaderStyle';
    st.textContent='.top .date-only-header{display:flex;flex-direction:column;gap:2px;align-items:flex-start}.top .date-only-header>b{font-size:19px;line-height:1.1;text-transform:capitalize;font-weight:850}.top .date-only-header>#today{display:block;font-size:15px;line-height:1.2;font-weight:650;opacity:.88;margin-top:2px}.brand h1{letter-spacing:-.02em}';
    document.head.appendChild(st);
  }
}

function toggleSettingsPanel(id,force){let p=$(id);if(!p)return;let open=typeof force==='boolean'?force:!p.classList.contains('open');p.classList.toggle('open',open);let btn=document.querySelector(`[data-settings-toggle="${id}"]`);if(btn){btn.classList.toggle('open',open);btn.setAttribute('aria-expanded',String(open))}}
function enhanceSettingsMenus(){
  if(document.body.dataset.settingsEnhanced)return;document.body.dataset.settingsEnhanced='1';
  let themeGrid=document.querySelector('.theme-grid-rich');
  if(themeGrid){
    let panel=themeGrid.closest('.settings-panel'),title=panel?.querySelector(':scope > .ttl'),subt=panel?.querySelector(':scope > .sub');
    if(title)title.classList.add('hide');if(subt)subt.classList.add('hide');
    let colorWrap=document.createElement('div');colorWrap.id='themeExpandPanel';colorWrap.className='setting-expand-panel';themeGrid.parentNode.insertBefore(colorWrap,themeGrid);colorWrap.appendChild(themeGrid);
    let colorBtn=document.createElement('button');colorBtn.type='button';colorBtn.className='setting-menu-button';colorBtn.dataset.settingsToggle='themeExpandPanel';colorBtn.innerHTML='<span class="menu-icon">🎨</span><span class="menu-copy"><b>Cor principal</b><small>Personalize a identidade do aplicativo</small></span><span class="menu-value" id="themeCurrent">Verde</span><i>›</i>';panel.insertBefore(colorBtn,colorWrap);colorBtn.onclick=()=>toggleSettingsPanel('themeExpandPanel');
    let appearancePanel=document.createElement('div');appearancePanel.id='appearanceExpandPanel';appearancePanel.className='setting-expand-panel appearance-expand';appearancePanel.innerHTML='<div class="appearance-grid"><button type="button" data-appearance-choice="light"><span>☀️</span><b>Claro</b></button><button type="button" data-appearance-choice="dark"><span>🌙</span><b>Escuro</b></button><button type="button" data-appearance-choice="system"><span>◐</span><b>Sistema</b></button></div>';
    let appearanceBtn=document.createElement('button');appearanceBtn.type='button';appearanceBtn.className='setting-menu-button';appearanceBtn.dataset.settingsToggle='appearanceExpandPanel';appearanceBtn.innerHTML='<span class="menu-icon">◐</span><span class="menu-copy"><b>Modo de aparência</b><small>Claro, escuro ou seguir o celular</small></span><span class="menu-value" id="appearanceCurrent">Claro</span><i>›</i>';colorWrap.after(appearanceBtn);appearanceBtn.after(appearancePanel);appearanceBtn.onclick=()=>toggleSettingsPanel('appearanceExpandPanel');
    appearancePanel.querySelectorAll('[data-appearance-choice]').forEach(b=>b.onclick=()=>{P={...P,appearance:b.dataset.appearanceChoice};local(false,true);renderProfile();toggleSettingsPanel('appearanceExpandPanel',false)});
    let choice=panel.querySelector('.choice-title');if(choice)choice.textContent='Tamanho e espaçamento';
  }
  let security=document.querySelector('.security-card');
  if(security&&$('changePassword')){
    let fields=[...security.querySelectorAll('.field')],change=$('changePassword'),wrap=document.createElement('div');wrap.id='passwordExpandPanel';wrap.className='setting-expand-panel password-expand';fields.forEach(x=>wrap.appendChild(x));wrap.appendChild(change);
    let btn=document.createElement('button');btn.type='button';btn.className='setting-menu-button password-menu';btn.dataset.settingsToggle='passwordExpandPanel';btn.innerHTML='<span class="menu-icon">🔑</span><span class="menu-copy"><b>Trocar senha</b><small>Altere a senha de acesso da sua conta</small></span><i>›</i>';security.appendChild(btn);security.appendChild(wrap);btn.onclick=()=>toggleSettingsPanel('passwordExpandPanel')
  }
}

function renderProfile(){
  P={...PROFILE_DEFAULTS,...(P||{})};
  let name=currentProfileName(),email=user?.email||'—';
  applyBrandingAndDate();
  if($('homeUserName'))$('homeUserName').textContent=name;
  if($('settingsDisplayName'))$('settingsDisplayName').textContent=name;
  if($('settingsEmail'))$('settingsEmail').textContent=email;
  if($('accountEmail'))$('accountEmail').textContent=email;
  if($('profileName')&&document.activeElement!==$('profileName'))$('profileName').value=P?.name||user?.user_metadata?.name||'';
  setAvatarBox('homeAvatarBtn','homeAvatarImg','homeAvatarFallback');
  setAvatarBox('avatarPickBtn','settingsAvatarImg','settingsAvatarFallback');
  applyTheme();applyHomePreferences();renderBiometricStatus()
}
if($('homeAvatarBtn'))$('homeAvatarBtn').onclick=()=>tab('settings');
if($('avatarPickBtn'))$('avatarPickBtn').onclick=()=>$('avatarFile').click();

function resizeAvatar(file){return new Promise((resolve,reject)=>{let r=new FileReader();r.onerror=reject;r.onload=()=>{let im=new Image();im.onerror=reject;im.onload=()=>{let max=180,scale=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*scale)),h=Math.max(1,Math.round(im.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;let ctx=c.getContext('2d');ctx.drawImage(im,0,0,w,h);resolve(c.toDataURL('image/jpeg',.78))};im.src=r.result};r.readAsDataURL(file)})}
if($('avatarFile'))$('avatarFile').onchange=async e=>{let f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/'))return alert('Escolha uma imagem.');try{P={...P,avatar:await resizeAvatar(f)};local(false,true);renderProfile()}catch{alert('Não foi possível usar essa imagem.')}finally{e.target.value=''}};
if($('removeAvatar'))$('removeAvatar').onclick=()=>{if(!P?.avatar)return;P={...P,avatar:''};local(false,true);renderProfile()};

if($('saveProfile'))$('saveProfile').onclick=async()=>{
  let name=$('profileName').value.trim();if(name.length<2)return alert('Digite um nome válido.');
  let b=$('saveProfile');b.disabled=true;b.textContent='Salvando...';
  try{let metadata={...(user?.user_metadata||{}),name};let {data,error}=await SB.auth.updateUser({data:metadata});if(error)throw error;if(data?.user)user=data.user;P={...P,name};local(false,true);renderProfile();alert('Perfil atualizado.')}
  catch(e){console.error(e);alert('Não foi possível atualizar o perfil agora.')}
  finally{b.disabled=false;b.textContent='Salvar perfil'}
};

document.querySelectorAll('[data-theme-choice]').forEach(b=>b.onclick=()=>{P={...P,theme:b.dataset.themeChoice};local(false,true);renderProfile();toggleSettingsPanel('themeExpandPanel',false)});
document.querySelectorAll('[data-density]').forEach(b=>b.onclick=()=>{P={...P,density:b.dataset.density};local(false,true);renderProfile()});

function bindPref(id,key){if(!$(id))return;$(id).onchange=e=>{P={...P,[key]:!!e.target.checked};local(false,true);renderProfile();if(typeof render==='function')render()}}
bindPref('showBalanceToggle','showBalance');bindPref('showSummaryToggle','showSummary');bindPref('showGoalToggle','showGoal');bindPref('showRecentToggle','showRecent');bindPref('hideValuesToggle','hideValues');

if($('defaultTypePick'))$('defaultTypePick').onclick=()=>openOpt('Tipo padrão',['Ganho','Gasto'],P.defaultType==='expense'?'Gasto':'Ganho',v=>{P={...P,defaultType:v==='Gasto'?'expense':'gain'};local(false,true);renderProfile()});
if($('defaultPayPick'))$('defaultPayPick').onclick=()=>openOpt('Pagamento padrão',['Pix','Dinheiro','Crédito','Débito','Boleto','Transferência','Outro'],P.defaultPay||'Pix',v=>{P={...P,defaultPay:v};local(false,true);renderProfile()});

if($('changePassword'))$('changePassword').onclick=async()=>{
  let p=$('newPassword').value,c=$('confirmNewPassword').value;if(p.length<6)return alert('A nova senha precisa ter pelo menos 6 caracteres.');if(p!==c)return alert('As senhas não são iguais.');
  let b=$('changePassword');b.disabled=true;b.textContent='Alterando...';
  try{let {error}=await SB.auth.updateUser({password:p});if(error)throw error;$('newPassword').value='';$('confirmNewPassword').value='';toggleSettingsPanel('passwordExpandPanel',false);alert('Senha alterada com sucesso.')}
  catch(e){console.error(e);alert('Não foi possível alterar a senha agora. '+(e?.message||''))}
  finally{b.disabled=false;b.textContent='Alterar senha'}
};

function androidBio(){return !!window.AndroidBridge&&typeof window.AndroidBridge.biometricSupported==='function'}
function bioSupported(){try{return androidBio()&&window.AndroidBridge.biometricSupported()}catch{return false}}
function bioEnabled(){try{return bioSupported()&&window.AndroidBridge.biometricEnabled()}catch{return false}}
function renderBiometricStatus(){
  let t=$('bioToggle'),s=$('bioStatus');if(!t||!s)return;
  if(!window.AndroidBridge){t.checked=false;t.disabled=true;s.textContent='Disponível no aplicativo Android.';return}
  if(!bioSupported()){t.checked=false;t.disabled=true;s.textContent='Este aparelho não oferece biometria compatível.';return}
  t.disabled=false;t.checked=bioEnabled();s.textContent=t.checked?'Ativada neste celular.':'Desativada.'
}
let bioBusy=false,bioPromptStartedAt=0;
function showBioLock(){if(!user||!bioEnabled())return;$('bioLock')?.classList.remove('hide')}
function hideBioLock(){$('bioLock')?.classList.add('hide');bioBusy=false;bioPromptStartedAt=0}
function askBiometric(){
  if(!user||!bioEnabled())return;
  if(bioBusy&&Date.now()-bioPromptStartedAt<12000)return;
  bioBusy=true;bioPromptStartedAt=Date.now();showBioLock();
  try{window.AndroidBridge.authenticateBiometric()}catch{bioBusy=false;bioPromptStartedAt=0}
}
function maybeLockWithBiometric(){if(user&&bioEnabled()){showBioLock();setTimeout(askBiometric,180)}}
window.maybeLockWithBiometric=maybeLockWithBiometric;
window.nativeRequestLock=()=>{if(user&&bioEnabled()){showBioLock();setTimeout(askBiometric,150)}};
window.onBiometricResult=(ok,msg)=>{bioBusy=false;bioPromptStartedAt=0;if(ok){hideBioLock()}else{showBioLock();if(msg&&msg!=='Cancelado')console.warn(msg)}};
window.onBiometricSetupResult=(ok,msg)=>{bioBusy=false;bioPromptStartedAt=0;if($('bioToggle'))$('bioToggle').checked=!!ok;renderBiometricStatus();if(!ok&&msg)alert(msg)};
if($('bioUnlock'))$('bioUnlock').onclick=askBiometric;
if($('bioToggle'))$('bioToggle').onchange=e=>{let on=e.target.checked;if(!bioSupported()){e.target.checked=false;return alert('A biometria não está disponível neste aparelho.')}try{bioBusy=on;bioPromptStartedAt=on?Date.now():0;if(on)window.AndroidBridge.setBiometricEnabled(true);else{window.AndroidBridge.setBiometricEnabled(false);bioBusy=false;renderBiometricStatus()}}catch{e.target.checked=false;bioBusy=false;bioPromptStartedAt=0;alert('Não foi possível alterar a biometria.')}};

window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(P?.appearance==='system')applyTheme()});
enhanceSettingsMenus();applyTheme();applyHomePreferences();renderProfile();
(function(){let s=document.createElement('script');s.src='finance-enhancements.js';s.async=false;document.body.appendChild(s)})();
