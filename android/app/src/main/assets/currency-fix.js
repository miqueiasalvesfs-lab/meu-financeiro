(function(){
  function parseCents(raw){
    if(typeof raw==='number'&&Number.isFinite(raw))return Math.max(0,Math.round(raw*100));
    let s=String(raw??'').trim().replace(/^R\$/i,'').replace(/\s+/g,'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    if(s.includes(',')){
      let p=s.lastIndexOf(','),whole=s.slice(0,p).replace(/\D/g,'')||'0',dec=s.slice(p+1).replace(/\D/g,'').slice(0,2);
      return Math.max(0,Number(whole)*100+Number((dec+'00').slice(0,2)));
    }
    if(/^\d{1,3}(?:\.\d{3})+$/.test(s))return Math.max(0,Number(s.replace(/\./g,''))*100);
    let dots=(s.match(/\./g)||[]).length;
    if(dots===1){
      let p=s.indexOf('.'),after=s.slice(p+1).replace(/\D/g,'');
      if(after.length>0&&after.length<=2){
        let whole=s.slice(0,p).replace(/\D/g,'')||'0';
        return Math.max(0,Number(whole)*100+Number((after+'00').slice(0,2)));
      }
    }
    let whole=s.replace(/\D/g,'')||'0';
    return Math.max(0,Number(whole)*100);
  }
  function formatCents(cents){
    return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.max(0,Math.round(cents||0))/100)
  }
  function editValue(cents){
    cents=Math.max(0,Math.round(cents||0));
    let whole=Math.floor(cents/100),dec=String(cents%100).padStart(2,'0');
    return dec==='00'?String(whole):`${whole},${dec}`
  }
  function sanitizeTyping(raw){
    let s=String(raw??'').replace(/[^0-9,.]/g,'');
    if(!s)return'';
    if(s.includes(',')){
      let p=s.lastIndexOf(','),whole=s.slice(0,p).replace(/\D/g,'').replace(/^0+(?=\d)/,'')||'0',dec=s.slice(p+1).replace(/\D/g,'').slice(0,2);
      return whole+','+dec;
    }
    if(/^\d{1,3}(?:\.\d{3})+$/.test(s))return s.replace(/\./g,'').replace(/^0+(?=\d)/,'')||'0';
    let dots=(s.match(/\./g)||[]).length;
    if(dots===1){
      let p=s.indexOf('.'),after=s.slice(p+1).replace(/\D/g,'');
      if(after.length<=2){
        let whole=s.slice(0,p).replace(/\D/g,'').replace(/^0+(?=\d)/,'')||'0';
        return whole+(s.endsWith('.')?',':','+after)
      }
    }
    return s.replace(/\D/g,'').replace(/^0+(?=\d)/,'')||'0'
  }
  function moneyFromCents(cents){
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Math.max(0,Math.round(cents||0))/100)
  }
  function updatePreview(){
    let toggle=document.getElementById('installmentToggle');
    if(!toggle?.checked)return;
    let input=document.getElementById('value'),countEl=document.getElementById('installmentCount');
    if(!input||!countEl)return;
    let total=parseCents(input.value),count=Math.max(2,Math.min(360,Math.trunc(Number(countEl.value)||2))),base=Math.floor(total/count),rem=total%count;
    let val=document.getElementById('installmentValue'),split=document.getElementById('installmentSplit');
    if(!total){if(val)val.textContent='R$ 0,00';if(split)split.textContent='Informe o valor total da compra.';return}
    if(val)val.textContent=rem?`1ª ${moneyFromCents(base+1)}`:`${count}x de ${moneyFromCents(base)}`;
    if(split){
      if(!rem)split.textContent=`${count} parcelas de ${moneyFromCents(base)} = ${moneyFromCents(total)}`;
      else{
        let low=count-rem,parts=[];
        if(rem)parts.push(`${rem} ${rem===1?'parcela':'parcelas'} de ${moneyFromCents(base+1)}`);
        if(low)parts.push(`${low} ${low===1?'parcela':'parcelas'} de ${moneyFromCents(base)}`);
        split.textContent=parts.join(' + ')+` = ${moneyFromCents(total)}`
      }
    }
  }
  function install(){
    let old=document.querySelector('#value[data-money-ready="1"]');
    if(!old||old.dataset.thousandFix==='1')return false;
    let input=old.cloneNode(true);
    input.dataset.thousandFix='1';input.type='text';input.inputMode='decimal';input.setAttribute('inputmode','decimal');input.placeholder='Ex.: 1000 ou 1000,50';
    old.replaceWith(input);
    let field=input.closest('.field');
    if(field&&!field.querySelector('.money-entry-hint')){
      let hint=document.createElement('small');hint.className='money-entry-hint';hint.textContent='Digite 1000 para R$ 1.000,00 • use vírgula para centavos';field.appendChild(hint)
    }
    input.addEventListener('focus',()=>{if(input.value.trim())input.value=editValue(parseCents(input.value));requestAnimationFrame(()=>input.setSelectionRange(input.value.length,input.value.length))});
    input.addEventListener('input',()=>{let clean=sanitizeTyping(input.value);if(input.value!==clean)input.value=clean;updatePreview()});
    input.addEventListener('blur',()=>{if(input.value.trim())input.value=formatCents(parseCents(input.value));updatePreview()});
    input.addEventListener('change',updatePreview);
    document.getElementById('installmentCount')?.addEventListener('input',updatePreview);
    document.getElementById('installmentToggle')?.addEventListener('change',()=>setTimeout(updatePreview,0));
    if(!document.getElementById('currencyFixStyle')){let style=document.createElement('style');style.id='currencyFixStyle';style.textContent='.money-entry-hint{display:block;margin:-7px 2px 10px;font-size:11px;line-height:1.3;opacity:.68}';document.head.appendChild(style)}
    if(input.value.trim())input.value=formatCents(parseCents(input.value));
    updatePreview();
    return true
  }
  let tries=0,timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},50);
})();
