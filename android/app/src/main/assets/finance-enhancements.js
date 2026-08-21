(function(){
  function load(src){
    return new Promise((resolve,reject)=>{
      let s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)
    })
  }
  load('finance-enhancements-core.js')
    .then(()=>load('currency-fix.js'))
    .then(()=>load('installment-progress.js'))
    .catch(err=>console.error('Falha ao carregar recursos financeiros',err));
})();