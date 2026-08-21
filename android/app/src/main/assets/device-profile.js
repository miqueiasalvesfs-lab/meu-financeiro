(function(){
  const PREFIX='dsj_device_display_name:';
  function accountId(){try{return user?.id||'guest'}catch{return'guest'}}
  function key(){return PREFIX+accountId()}
  function fallbackName(){
    try{return String(P?.name||user?.user_metadata?.name||String(user?.email||'Usuário').split('@')[0]||'Usuário').trim()||'Usuário'}
    catch{return'Usuário'}
  }
  function deviceName(){
    try{let v=localStorage.getItem(key());return (v||'').trim()||fallbackName()}catch{return fallbackName()}
  }
  function saveDeviceName(name){try{localStorage.setItem(key(),name.trim());return true}catch{return false}}

  window.currentProfileName=function(){return deviceName()};

  function decorateNameField(){
    let input=document.getElementById('profileName');if(!input)return;
    let field=input.closest('.field'),label=field?.querySelector('label');if(label)label.textContent='Nome neste aparelho';
    input.placeholder='Como este celular deve chamar você';
    if(field&&!field.querySelector('.device-name-hint')){
      let hint=document.createElement('small');hint.className='device-name-hint';hint.textContent='Este nome fica somente neste celular e não é sincronizado com os outros aparelhos.';field.appendChild(hint)
    }
    let btn=document.getElementById('saveProfile');if(btn&&!btn.disabled)btn.textContent='Salvar nome neste aparelho'
  }

  const baseRender=window.renderProfile;
  if(typeof baseRender==='function'){
    window.renderProfile=function(){
      baseRender();
      let name=deviceName(),input=document.getElementById('profileName');
      if(input&&document.activeElement!==input)input.value=name;
      let home=document.getElementById('homeUserName');if(home)home.textContent=name;
      let settings=document.getElementById('settingsDisplayName');if(settings)settings.textContent=name;
      decorateNameField()
    }
  }

  let save=document.getElementById('saveProfile');
  if(save){
    save.onclick=()=>{
      let input=document.getElementById('profileName'),name=(input?.value||'').trim();
      if(name.length<2)return alert('Digite um nome válido.');
      save.disabled=true;save.textContent='Salvando...';
      try{
        if(!saveDeviceName(name))throw new Error('local_storage');
        window.renderProfile?.();
        alert('Nome salvo somente neste aparelho. Nos outros celulares você pode usar outro nome.')
      }catch(e){console.error(e);alert('Não foi possível salvar o nome neste aparelho.')}
      finally{save.disabled=false;save.textContent='Salvar nome neste aparelho'}
    }
  }

  if(!document.getElementById('deviceNameStyle')){
    let st=document.createElement('style');st.id='deviceNameStyle';st.textContent='.device-name-hint{display:block;margin:-6px 2px 10px;font-size:11px;line-height:1.35;opacity:.7}';document.head.appendChild(st)
  }
  decorateNameField();window.renderProfile?.();
})();
