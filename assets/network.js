/* Country groups keep nearby institutions selectable without overlapping map pins. */
(() => {
  const source=document.getElementById('network-data');
  if(!source)return;
  const network=JSON.parse(source.textContent);
  const zh=document.documentElement.lang.startsWith('zh');
  const tr=(en,cn)=>zh?cn:en;
  const asset=path=>(zh?'../':'')+'assets/'+path;
  const countries=new Map(network.countries.map(c=>[c.id,c]));
  const institutions=new Map(network.institutions.map(i=>[i.id,i]));
  const inspector=document.getElementById('network-inspector');
  const options=inspector.querySelector('.institution-options');
  const film=document.getElementById('network-film');
  const preview=film.querySelector('.film-preview');
  const dialog=document.querySelector('.experiment-dialog');
  const video=document.getElementById('experiment-video');
  const error=document.getElementById('experiment-error');
  const shortLabels={suzhou:'Suzhou Lab',csu:'CSU',ustc:'USTC',szu:'SZU',bears:'BEARS',ntu:'NTU',greendynamics:'GreenDynamics'};
  let selected=institutions.get('suzhou'),opener=null;
  function selectInstitution(id,announce=true){
    const item=institutions.get(id);
    if(!item)return;
    selected=item;
    const country=countries.get(item.country);
    options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.institution===id)));
    const place=zh?(country.zh===item.cityZh?country.zh:`${country.zh} · ${item.cityZh}`):(item.city===country.en?country.en:`${item.city}, ${country.en}`);
    document.getElementById('network-location').textContent=place;
    inspector.querySelector('.inspector-number').textContent=`${String(country.institutions.indexOf(id)+1).padStart(2,'0')} / ${String(country.institutions.length).padStart(2,'0')}`;
    const logo=document.getElementById('network-logo');logo.src=asset('institutions/'+item.logo);logo.alt=item.name;
    document.getElementById('network-institution').textContent=zh?item.zh:item.short;
    const fullname=document.getElementById('network-full-name');fullname.textContent=item.name;fullname.hidden=!!item.video||item.name===item.short||zh;
    film.hidden=!item.video;
    const desc=document.getElementById('network-description');
    desc.hidden=!!item.video;
    desc.textContent=tr(item.kind==='industry'?'Industry':'Academic institution',item.kind==='industry'?'工业界':'学术机构');
    if(item.video){
      const poster=document.getElementById('network-poster');poster.src=asset('experiments/'+item.video+'.jpg');poster.alt=tr(item.topic,item.topicZh);
      film.querySelector('.film-duration').textContent=item.duration;
      document.getElementById('network-topic').textContent=tr(item.topic,item.topicZh);
      preview.setAttribute('aria-label',tr('Watch experiment film: ','播放实验视频：')+(zh?item.zh:item.short));
    }
    if(announce)inspector.querySelector('.network-selection').textContent=`${zh?item.zh:item.name}. ${place}. ${item.video?tr('Experiment film available.','可观看实验视频。'):''}`;
  }
  function selectCountry(id,announce=true){
    const country=countries.get(id);if(!country)return;
    document.querySelectorAll('[data-country]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.country===id)));
    options.replaceChildren();options.hidden=country.institutions.length<2;
    country.institutions.forEach(institutionId=>{
      const item=institutions.get(institutionId),button=document.createElement('button');
      button.type='button';button.dataset.institution=item.id;
      button.textContent=zh?item.zh:(shortLabels[item.id]||item.short);
      button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>selectInstitution(item.id));options.append(button);
    });
    selectInstitution(country.institutions[0],announce);
  }
  document.querySelectorAll('[data-country]').forEach(b=>b.addEventListener('click',()=>selectCountry(b.dataset.country)));
  preview.addEventListener('click',()=>{
    if(!selected.video)return;
    opener=preview;error.hidden=true;
    document.getElementById('experiment-title').textContent=tr(selected.topic,selected.topicZh);
    document.getElementById('experiment-location').textContent=zh?selected.zh:selected.name;
    document.getElementById('experiment-description').textContent=tr(selected.description,selected.descriptionZh);
    video.poster=asset('experiments/'+selected.video+'.jpg');video.src=asset('experiments/'+selected.video+'.mp4');
    dialog.showModal();video.play().catch(()=>{});
  });
  dialog.querySelector('.experiment-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();opener?.focus({preventScroll:true});});
  video.addEventListener('error',()=>{if(video.hasAttribute('src'))error.hidden=false;});
  selectCountry('cn',false);
})();
