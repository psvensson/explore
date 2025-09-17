// stair_demo.js
export function setupStairDemo(doc){
  const btn=doc.getElementById('focus-stairs'); if(!btn) return;
  btn.onclick=()=>{ const first=document.querySelector('.tile-block[data-role="stairs"]'); if(!first) return; first.scrollIntoView({behavior:'smooth',block:'center',inline:'center'}); first.classList.add('flash'); setTimeout(()=>first.classList.remove('flash'),1200); };
}
