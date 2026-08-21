const PROFILE_DEFAULTS={
  name:'',avatar:'',theme:'green',density:'comfortable',
  showBalance:true,showSummary:true,showGoal:true,showRecent:true,hideValues:false,
  defaultType:'gain',defaultPay:'Pix'
};
P={...PROFILE_DEFAULTS,...(P||{})};

function initials(name){return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'U'}
function currentProfileName(){return (P?.name||user?.user_metadata?.name||String(user?.email||'Usuário').split('@')[0]||'Usuário').trim()}
function setAvatarBox(boxId,imgId,fallbackId){let box=$(boxId),img=$(imgId),fb=$(fallbackId);if(!box||!img||!fb)return;let name=currentProfileName();fb.textContent=initials(name);if(P?.avatar){img.src=P.avatar;box.classList.add('has-photo')}else{img.removeAttribute('src');box.classList.remove('has-photo')}}

function applyTheme(){
  let t=P?.theme||'green',density=P?.density||'comfortable';
  document.documentElement.dataset.theme=t;document.documentElement.dataset.density=density;
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('on',b.dataset.themeChoice===t));
  document.querySelectorAll('[data-density]').forEach(b=>b.classList.toggle('on',b.dataset.density===density))
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
function renderProfile(){
  P={...PROFILE_DEFAULTS,...(P||{})};
  let name=currentProfileName(),email=user?.email||'—';
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

document.querySelectorAll('[data-theme-choice]').forEach(b=>b.onclick=()=>{P={...P,theme:b.dataset.themeChoice};local(false,true);renderProfile()});
document.querySelectorAll('[data-density]').forEach(b=>b.onclick=()=>{P={...P,density:b.dataset.density};local(false,true);renderProfile()});

function bindPref(id,key){
  if(!$(id))return;
  $(id).onchange=e=>{P={...P,[key]:!!e.target.checked};local(false,true);renderProfile();if(typeof render==='function')render()}
}
bindPref('showBalanceToggle','showBalance');bindPref('showSummaryToggle','showSummary');bindPref('showGoalToggle','showGoal');bindPref('showRecentToggle','showRecent');bindPref('hideValuesToggle','hideValues');

if($('defaultTypePick'))$('defaultTypePick').onclick=()=>openOpt('Tipo padrão',['Ganho','Gasto'],P.defaultType==='expense'?'Gasto':'Ganho',v=>{P={...P,defaultType:v==='Gasto'?'expense':'gain'};local(false,true);renderProfile()});
if($('defaultPayPick'))$('defaultPayPick').onclick=()=>openOpt('Pagamento padrão',['Pix','Dinheiro','Crédito','Débito','Boleto','Transferência','Outro'],P.defaultPay||'Pix',v=>{P={...P,defaultPay:v};local(false,true);renderProfile()});

if($('changePassword'))$('changePassword').onclick=async()=>{
  let p=$('newPassword').value,c=$('confirmNewPassword').value;if(p.length<6)return alert('A nova senha precisa ter pelo menos 6 caracteres.');if(p!==c)return alert('As senhas não são iguais.');
  let b=$('changePassword');b.disabled=true;b.textContent='Alterando...';
  try{let {error}=await SB.auth.updateUser({password:p});if(error)throw error;$('newPassword').value='';$('confirmNewPassword').value='';alert('Senha alterada com sucesso.')}
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
let bioBusy=false;
function showBioLock(){if(!user||!bioEnabled())return;$('bioLock')?.classList.remove('hide')}
function hideBioLock(){$('bioLock')?.classList.add('hide');bioBusy=false}
function askBiometric(){if(!user||!bioEnabled()||bioBusy)return;bioBusy=true;showBioLock();try{window.AndroidBridge.authenticateBiometric()}catch{bioBusy=false}}
function maybeLockWithBiometric(){if(user&&bioEnabled()){showBioLock();setTimeout(askBiometric,120)}}
window.maybeLockWithBiometric=maybeLockWithBiometric;
window.nativeRequestLock=()=>{if(user&&bioEnabled()){showBioLock();setTimeout(askBiometric,100)}};
window.onBiometricResult=(ok,msg)=>{bioBusy=false;if(ok){hideBioLock()}else{showBioLock();if(msg&&msg!=='Cancelado')console.warn(msg)}};
window.onBiometricSetupResult=(ok,msg)=>{bioBusy=false;if($('bioToggle'))$('bioToggle').checked=!!ok;renderBiometricStatus();if(!ok&&msg)alert(msg)};
if($('bioUnlock'))$('bioUnlock').onclick=askBiometric;
if($('bioToggle'))$('bioToggle').onchange=e=>{let on=e.target.checked;if(!bioSupported()){e.target.checked=false;return alert('A biometria não está disponível neste aparelho.')}try{bioBusy=on;if(on)window.AndroidBridge.setBiometricEnabled(true);else{window.AndroidBridge.setBiometricEnabled(false);bioBusy=false;renderBiometricStatus()}}catch{e.target.checked=false;bioBusy=false;alert('Não foi possível alterar a biometria.')}};

applyTheme();applyHomePreferences();renderProfile();
