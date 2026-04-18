/*
 * Electro Union — Guestbook Module Script
 *
 * Kräver: ../_shared/embed.js (för window.EU_IS_EMBED)
 *         ../_shared/supabase.js (för window.EU_SUPABASE)
 *
 * Källa: golden/electro-union-module.html rader:
 *   3831-3996 (Guestbook: state, renderGuestbook, loadGallery,
 *              euDrawGuestbook-klick, modal close/click-outside, gbSubmit)
 *
 * Beteende (oförändrat från golden):
 *   - loadGallery() på init: GET /rest/v1/gallery?order=created_at.desc
 *     → renderar kort med bild + ev. message/name/country + datum
 *   - Klick på #euDrawGuestbook (från drawing-modulen):
 *       * animMode==='none' → PNG 540×540
 *       * annars → 20-frame GIF 540×540, ~75 ms/frame (1.5 s cycle)
 *     → preview renderas i modal
 *   - Submit: dataURL → Blob → sbUpload('gallery-images', ...)
 *             → sbFetch('/rest/v1/gallery', POST) med image_url + optional fält
 *     Reject om blob > 20 MB.
 *
 * Standalone:
 *   - Utan drawing-modulen finns ingen #euDrawGuestbook, så submit-knappen
 *     triggas aldrig. Gallerivisningen (loadGallery) fungerar ändå.
 *   - För programmatisk submit: window.EU_GUESTBOOK_SUBMIT(canvas, name?)
 *     laddar upp canvasens nuvarande frame som PNG direkt.
 */

(function () {
  var SB=window.EU_SUPABASE;
  if(!SB){
    console.warn('[eu-guestbook] window.EU_SUPABASE saknas — läs in ../_shared/supabase.js före script.js');
    return;
  }
  var sbFetch=SB.fetch,sbUpload=SB.upload,sbPublicUrl=SB.publicUrl;

  // ── Guestbook ──
  var gbModal=document.getElementById('euGbModal');
  var gbPreview=document.getElementById('euGbPreview');
  var gbMsg=document.getElementById('euGbMsg');
  var gbName=document.getElementById('euGbName');
  var gbCountry=document.getElementById('euGbCountry');
  var gbSubmit=document.getElementById('euGbSubmit');
  var gbClose=document.getElementById('euGbClose');
  var gbGrid=document.getElementById('euGbGrid');
  var gbCountEl=document.getElementById('euGbCount');
  var gbEntries=[];
  var gbPendingDataUrl=null;
  var gbPendingIsGif=false;

  function renderGuestbook(){
    if(!gbGrid)return;
    if(gbEntries.length===0){
      gbGrid.innerHTML='<div class="eu-guestbook__empty">The Pastry Art Gallery: make one above and add it.</div>';
    }else{
      gbGrid.innerHTML='';
      for(var i=0;i<gbEntries.length;i++){
        var e=gbEntries[i];
        var card=document.createElement('div');
        card.className='eu-guestbook__card';
        var imgWrap=document.createElement('div');
        imgWrap.className='eu-guestbook__card-img';
        var img=document.createElement('img');
        img.src=e.image_url;img.alt='Gallery entry';
        imgWrap.appendChild(img);
        card.appendChild(imgWrap);
        if(e.message){
          var msg=document.createElement('div');
          msg.className='eu-guestbook__card-msg';
          msg.textContent=e.message;
          card.appendChild(msg);
        }
        if(e.name||e.country){
          var nameLine=document.createElement('div');
          nameLine.className='eu-guestbook__card-name';
          var parts=[];
          if(e.name)parts.push(e.name);
          if(e.country)parts.push(e.country);
          nameLine.textContent=parts.join(', ');
          card.appendChild(nameLine);
        }
        var meta=document.createElement('div');
        meta.className='eu-guestbook__card-meta';
        var d=new Date(e.created_at);
        meta.textContent=d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
        card.appendChild(meta);
        gbGrid.appendChild(card);
      }
    }
    if(gbCountEl)gbCountEl.textContent=gbEntries.length+' entr'+(gbEntries.length===1?'y':'ies');
  }

  // Load gallery from Supabase
  function loadGallery(){
    sbFetch('/rest/v1/gallery?order=created_at.desc&select=*').then(function(data){
      if(Array.isArray(data)){
        gbEntries=data;
        renderGuestbook();
      }
    }).catch(function(){renderGuestbook();});
  }
  loadGallery();

  // "Add to guestbook" — generate GIF (540x540, 20 frames) or PNG for gallery
  // (endast om drawing-modulen är bundlad och knappen finns)
  var gbTriggerBtn=document.getElementById('euDrawGuestbook');
  if(gbTriggerBtn)gbTriggerBtn.onclick=function(){
    var DR=window.EU_DRAWING;
    if(!DR){console.warn('[eu-guestbook] window.EU_DRAWING saknas — drawing-modulen verkar inte vara laddad');return;}
    if(DR.placements.length===0)return;
    var gbSize=540; // smaller than download (1080) — faster upload, smaller files
    var ew=gbSize,eh=gbSize;
    var tmpCanvas=document.createElement('canvas');
    tmpCanvas.width=ew;tmpCanvas.height=eh;
    var tmpCtx=tmpCanvas.getContext('2d');

    if(DR.animMode!=='none'){
      // Build animated GIF for guestbook (fewer frames + smaller res = much smaller file)
      gbPendingIsGif=true;
      var numFrames=20;
      var cycleDur=1.5;
      DR.renderExportFrame(tmpCtx,DR.animMode,0,gbSize);
      var palette=DR.buildAdaptivePalette(tmpCtx.getImageData(0,0,ew,eh),256);
      var gifFrames=[];
      for(var f=0;f<numFrames;f++){
        var t=f*(cycleDur/numFrames);
        DR.renderExportFrame(tmpCtx,DR.animMode,t,gbSize);
        gifFrames.push(DR.quantizeFrameAdaptive(tmpCtx,ew,eh,palette));
      }
      var delay=Math.round(cycleDur/numFrames*100);
      var blob=DR.buildGIF(gifFrames,ew,eh,delay,palette);
      var reader=new FileReader();
      reader.onload=function(){
        gbPendingDataUrl=reader.result;
        gbPreview.innerHTML='<img src="'+gbPendingDataUrl+'" alt="Preview">';
      };
      reader.readAsDataURL(blob);
    }else{
      gbPendingIsGif=false;
      DR.renderExportFrame(tmpCtx,'none',0,gbSize);
      gbPendingDataUrl=tmpCanvas.toDataURL('image/png');
      gbPreview.innerHTML='<img src="'+gbPendingDataUrl+'" alt="Preview">';
    }
    if(gbMsg)gbMsg.value='';
    if(gbName)gbName.value='';
    if(gbCountry)gbCountry.value='';
    gbModal.classList.add('is-open');
  };

  // Close modal
  if(gbClose)gbClose.onclick=function(){gbModal.classList.remove('is-open');};
  if(gbModal)gbModal.onclick=function(e){if(e.target===gbModal)gbModal.classList.remove('is-open');};

  // Submit entry — upload image to Supabase Storage, then insert gallery row
  if(gbSubmit)gbSubmit.onclick=function(){
    if(!gbPendingDataUrl)return;
    gbSubmit.disabled=true;
    gbSubmit.textContent='Uploading…';

    // Convert dataURL to blob
    var parts=gbPendingDataUrl.split(',');
    var mime=parts[0].match(/:(.*?);/)[1];
    var bstr=atob(parts[1]);
    var n=bstr.length;
    var u8=new Uint8Array(n);
    for(var j=0;j<n;j++)u8[j]=bstr.charCodeAt(j);
    var blob=new Blob([u8],{type:mime});

    // Reject uploads over 20 MB
    if(blob.size>20*1024*1024){
      alert('Image is too large to upload.');
      gbSubmit.disabled=false;
      gbSubmit.textContent='Add to gallery';
      return;
    }

    var ext=gbPendingIsGif?'gif':'png';
    var fileName=Date.now()+'_'+Math.random().toString(36).substr(2,6)+'.'+ext;

    sbUpload('gallery-images',fileName,blob).then(function(res){
      if(res.error){throw new Error(res.error.message||'Upload failed');}
      var publicUrl=sbPublicUrl('gallery-images',fileName);
      var row={
        image_url:publicUrl,
        message:gbMsg?gbMsg.value.trim():'',
        name:gbName?gbName.value.trim():'',
        country:gbCountry?gbCountry.value.trim():''
      };
      // Remove empty optional fields
      if(!row.message)delete row.message;
      if(!row.name)delete row.name;
      if(!row.country)delete row.country;
      return sbFetch('/rest/v1/gallery',{method:'POST',body:row,headers:{'Prefer':'return=representation'}});
    }).then(function(inserted){
      gbModal.classList.remove('is-open');
      loadGallery();
      var gbSection=document.getElementById('euGuestbook');
      if(gbSection)gbSection.scrollIntoView({behavior:'smooth'});
    }).catch(function(err){
      console.error('Gallery submit error:',err);
      alert('Could not upload — please try again.');
    }).then(function(){
      gbSubmit.disabled=false;
      gbSubmit.textContent='Submit to gallery';
    });
  };

  // ── Programmatic API för standalone / integration med externa drawing ──
  // Ladda upp en godtycklig canvas direkt som PNG utan modal.
  //   EU_GUESTBOOK_SUBMIT(canvas, {name, message, country}?) → Promise
  window.EU_GUESTBOOK_SUBMIT=function(canvas,meta){
    meta=meta||{};
    return new Promise(function(resolve,reject){
      var dataUrl=canvas.toDataURL('image/png');
      var parts=dataUrl.split(',');
      var mime=parts[0].match(/:(.*?);/)[1];
      var bstr=atob(parts[1]);
      var n=bstr.length;
      var u8=new Uint8Array(n);
      for(var j=0;j<n;j++)u8[j]=bstr.charCodeAt(j);
      var blob=new Blob([u8],{type:mime});
      if(blob.size>20*1024*1024){reject(new Error('Image too large'));return;}
      var fileName=Date.now()+'_'+Math.random().toString(36).substr(2,6)+'.png';
      sbUpload('gallery-images',fileName,blob).then(function(res){
        if(res.error)throw new Error(res.error.message||'Upload failed');
        var publicUrl=sbPublicUrl('gallery-images',fileName);
        var row={image_url:publicUrl};
        if(meta.message)row.message=meta.message;
        if(meta.name)row.name=meta.name;
        if(meta.country)row.country=meta.country;
        return sbFetch('/rest/v1/gallery',{method:'POST',body:row,headers:{'Prefer':'return=representation'}});
      }).then(function(inserted){
        loadGallery();
        resolve(inserted);
      }).catch(reject);
    });
  };
})();
