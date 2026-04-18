/*
 * Electro Union — Drawing Module Script
 *
 * Kräver: ../_shared/embed.js (för window.EU_IS_EMBED)
 *
 * Källa: golden/electro-union-module.html rader:
 *   3264-3829 (Drawing tool: stamp carousel, bg-pick, anim, upload,
 *              render, undo, GIF encoder, adaptive palette,
 *              renderExportFrame, GIF + PNG-download)
 *
 * Beteende (oförändrat från golden):
 *   - 9 pastry stamps + 9 EU-stickers + 1 custom upload (max 1 MB)
 *   - Bg-picker: 7 preset färger + custom hex + custom bg-upload
 *   - Animation modes: still / bounce / beat / rotate
 *   - Undo per stroke, clear all
 *   - Download: GIF 1080x1080 36 frames (adaptiv palett, custom LZW) eller
 *     PNG 1080x1080 (om animMode==='none')
 *
 * Guestbook-submit (klick på #euDrawGuestbook) hanteras i
 * ../guestbook/script.js. Guestbook-modulen använder window.EU_DRAWING som
 * exponeras längst ner i denna IIFE när bundlen körs tillsammans.
 */

(function () {
  // ═══ Drawing tool ═══
  /* ── Drawing tool with animation + GIF export ── */
  var drawCanvas=document.getElementById('euDrawCanvas');
  if(!drawCanvas)return; // modulen inte mountad — tyst exit
  var drawWrap=drawCanvas.parentElement;
  var drawCtx=drawCanvas.getContext('2d');
  var activeStamp=0;
  var animMode='none';
  var placements=[];
  var animRAF=null;

  var sizeSlider=document.getElementById('euDrawSize');
  var bgImageSrc='STICKERS/EU_Stickers_1080x1350_01.png';
  var bgColor='#ffffff';
  var bgImg=new Image();bgImg.src=bgImageSrc;

  // Background selectors — sticker + color are independent, both always apply
  var bgOpts=document.querySelectorAll('.eu-draw__bg-opt');
  var bgColorPicker=document.getElementById('euBgColorPicker');
  var bgSwatch=document.getElementById('euBgSwatch');

  // First sticker click sets the background watermark; after that only changes active stamp
  var bgStickerLocked=false;
  bgOpts.forEach(function(o){
    o.onclick=function(){
      bgOpts.forEach(function(x){x.classList.remove('is-active')});
      o.classList.add('is-active');
      // Only change background sticker if no placements yet
      if(!bgStickerLocked){
        bgImageSrc=o.getAttribute('data-bg');
        bgImg=new Image();bgImg.src=bgImageSrc;
        bgImg.onload=function(){renderAll();};
      }
      // Always set as active stamp for placing on canvas
      var si=o.getAttribute('data-sticker');
      if(si!==null){
        activeStamp=stickerStartIdx+parseInt(si);
        // Deselect pastry stamps
        stamps.forEach(function(x){x.classList.remove('is-active')});
      }
    };
  });

  // Background preset picks
  var bgPicks=document.querySelectorAll('.eu-draw__bg-pick');
  var bgColorEl=document.querySelector('.eu-draw__bg-color');
  bgPicks.forEach(function(p){
    p.onclick=function(){
      bgPicks.forEach(function(x){x.classList.remove('is-active')});
      if(bgColorEl)bgColorEl.classList.remove('is-active');
      p.classList.add('is-active');
      bgColor=p.getAttribute('data-bgc');
      if(bgSwatch)bgSwatch.style.background=bgColor;
      if(bgColorPicker)bgColorPicker.value=bgColor;
      renderAll();
    };
  });
  if(bgColorPicker){
    bgColorPicker.addEventListener('input',function(){
      bgColor=bgColorPicker.value;
      bgSwatch.style.background=bgColor;
      bgPicks.forEach(function(x){x.classList.remove('is-active')});
      if(bgColorEl)bgColorEl.classList.add('is-active');
      renderAll();
    });
  }

  var stampSrcs=['Updated Imagery/ai-generated-baguette-on-transparent-background-image-png.webp','Updated Imagery/DSC_0410-a.png','Updated Imagery/045.png','Updated Imagery/baklava_udate.png','Updated Imagery/kürtőskalács.png','Updated Imagery/pngimg.com - croissant_PNG46722.png','Updated Imagery/danish.png','Updated Imagery/pastelnata.webp','Updated Imagery/sernik.png'];
  // Sticker sources (placeable on canvas via tap)
  var stickerSrcs=['STICKERS/EU_Stickers_1080x1350_01.png','STICKERS/EU_Stickers_1080x1350_02.png','STICKERS/EU_Stickers_1080x1350_03.png','STICKERS/EU_Stickers_1080x1350_04.png','STICKERS/EU_Stickers_1080x1350_08.png','STICKERS/EU_Stickers_1080x1350_09.png','STICKERS/EU_Stickers_1080x1350_12.png','STICKERS/EU_Stickers_1080x1350_13.png','STICKERS/EU_Stickers_1080x1350_14.png'];
  var stickerStartIdx=stampSrcs.length;
  var allSrcs=stampSrcs.concat(stickerSrcs);
  var stampImgs=[];
  allSrcs.forEach(function(src){
    var img=new Image();img.src=src;
    stampImgs.push(img);
  });

  function resizeDrawCanvas(){
    drawCanvas.width=drawWrap.clientWidth;
    drawCanvas.height=drawWrap.clientHeight;
    if(placements.length>0) renderAll();
    else drawBg(drawCtx,drawCanvas.width,drawCanvas.height);
  }

  // Stamp selectors
  var stamps=document.querySelectorAll('.eu-draw__stamp');
  stamps.forEach(function(s){
    s.onclick=function(){
      stamps.forEach(function(x){x.classList.remove('is-active')});
      s.classList.add('is-active');
      activeStamp=parseInt(s.getAttribute('data-stamp'));
      // Deselect sticker options and upload
      bgOpts.forEach(function(x){x.classList.remove('is-active')});
      if(uploadLabel)uploadLabel.classList.remove('is-active');
    };
  });

  // Upload custom sticker
  var uploadStickerInput=document.getElementById('euDrawUploadStickerInput');
  var uploadStickerLabel=document.getElementById('euDrawUploadSticker');
  var uploadStickerIdx=-1;
  var ALLOWED_TYPES=['image/png','image/jpeg','image/gif','image/webp'];
  var MAX_UPLOAD_KB=1024; // 1 MB

  function validateUpload(file){
    if(ALLOWED_TYPES.indexOf(file.type)<0){
      alert('Only PNG, JPEG, GIF, and WebP images are allowed.');
      return false;
    }
    if(file.size>MAX_UPLOAD_KB*1024){
      alert('File is too large (max 1 MB).');
      return false;
    }
    return true;
  }

  uploadStickerInput.onchange=function(e){
    var file=e.target.files[0];
    if(!file)return;
    if(!validateUpload(file)){e.target.value='';return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        if(uploadStickerIdx<0){
          uploadStickerIdx=stampImgs.length;
          stampImgs.push(img);
        }else{
          stampImgs[uploadStickerIdx]=img;
        }
        activeStamp=uploadStickerIdx;
        stamps.forEach(function(x){x.classList.remove('is-active')});
        bgOpts.forEach(function(x){x.classList.remove('is-active')});
        uploadStickerLabel.classList.add('is-active');
        uploadStickerLabel.innerHTML='<img src="'+ev.target.result+'" alt="Custom" style="width:100%;height:100%;object-fit:contain">';
        uploadStickerLabel.appendChild(uploadStickerInput);
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  uploadStickerLabel.onclick=function(e){
    if(uploadStickerIdx>=0&&e.target!==uploadStickerInput){
      activeStamp=uploadStickerIdx;
      stamps.forEach(function(x){x.classList.remove('is-active')});
      bgOpts.forEach(function(x){x.classList.remove('is-active')});
      uploadStickerLabel.classList.add('is-active');
    }
  };

  // Upload custom background image
  var uploadBgInput=document.getElementById('euDrawUploadBgInput');
  var uploadBgLabel=document.getElementById('euDrawUploadBg');
  uploadBgInput.onchange=function(e){
    var file=e.target.files[0];
    if(!file)return;
    if(!validateUpload(file)){e.target.value='';return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        bgImg=img;
        bgImageSrc=ev.target.result;
        bgPicks.forEach(function(x){x.classList.remove('is-active')});
        if(bgColorEl)bgColorEl.classList.remove('is-active');
        uploadBgLabel.classList.add('is-active');
        uploadBgLabel.innerHTML='<img src="'+ev.target.result+'" alt="Custom BG" style="width:100%;height:100%;object-fit:cover;border-radius:2px">';
        uploadBgLabel.appendChild(uploadBgInput);
        renderAll();
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Animation selectors
  var animBtns=document.querySelectorAll('.eu-draw__anim');
  animBtns.forEach(function(b){
    b.onclick=function(){
      animBtns.forEach(function(x){x.classList.remove('is-active')});
      b.classList.add('is-active');
      animMode=b.getAttribute('data-anim');
      if(animMode!=='none'&&!animRAF) startAnimLoop();
      if(animMode==='none'){cancelAnimationFrame(animRAF);animRAF=null;renderAll();}
    };
  });

  // Render all placements with optional animation
  function drawBg(ctx,w,h){
    ctx.fillStyle=bgColor;
    ctx.fillRect(0,0,w,h);
    if(bgImg.complete&&bgImg.naturalWidth>0){
      var scale=Math.min(w*0.5/bgImg.naturalWidth,h*0.5/bgImg.naturalHeight);
      var bw=bgImg.naturalWidth*scale;
      var bh=bgImg.naturalHeight*scale;
      ctx.drawImage(bgImg,(w-bw)/2,(h-bh)/2,bw,bh);
    }
  }

  function renderAll(timeOverride){
    var t=(timeOverride!==undefined)?timeOverride:Date.now()/1000;
    drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
    drawBg(drawCtx,drawCanvas.width,drawCanvas.height);
    for(var i=0;i<placements.length;i++){
      var p=placements[i];
      var img=stampImgs[p.si];
      if(!img.complete) continue;
      var cx=p.x,cy=p.y,s=p.sz,rot=0,sc=1;
      var phase=i*0.4;
      if(animMode==='bounce'){
        cy+=Math.sin(t*4+phase)*p.sz*0.3;
      }else if(animMode==='beat'){
        sc=1+Math.sin(t*5+phase)*0.25;
      }else if(animMode==='rotate'){
        rot=Math.sin(t*3+phase)*0.5;
      }
      drawCtx.save();
      drawCtx.translate(cx,cy);
      if(rot) drawCtx.rotate(rot);
      if(sc!==1) drawCtx.scale(sc,sc);
      var iw=img.naturalWidth||1,ih=img.naturalHeight||1;
      var ar=iw/ih;
      var dw=ar>=1?s:s*ar;
      var dh=ar>=1?s/ar:s;
      drawCtx.drawImage(img,-dw/2,-dh/2,dw,dh);
      drawCtx.restore();
    }
  }

  function startAnimLoop(){
    function tick(){
      renderAll();
      animRAF=requestAnimationFrame(tick);
    }
    animRAF=requestAnimationFrame(tick);
  }

  // Draw on click/drag — stores placements
  // Undo works per stroke: one mousedown→mouseup = one undo step
  var drawing=false;
  var lastPlaceTime=0;
  var strokeStartIdx=0; // index into placements[] where current stroke began

  function addPlacement(x,y){
    var now=Date.now();
    if(drawing&&now-lastPlaceTime<30) return;
    lastPlaceTime=now;
    var size=Math.max(30,drawCanvas.width*0.06)*parseFloat(sizeSlider.value);
    placements.push({x:x,y:y,sz:size,si:activeStamp});
    bgStickerLocked=true;
    if(animMode==='none') renderAll();
  }

  function startStroke(){
    strokeStartIdx=placements.length;
    drawing=true;
  }
  function endStroke(){
    if(!drawing) return;
    drawing=false;
    // Record how many placements this stroke added
    var count=placements.length-strokeStartIdx;
    if(count>0) undoStack.push(count);
  }

  var undoStack=[]; // each entry = number of placements in that stroke

  drawCanvas.addEventListener('mousedown',function(e){
    resizeDrawCanvas();startStroke();
    var r=drawCanvas.getBoundingClientRect();
    addPlacement(e.clientX-r.left,e.clientY-r.top);
  });
  drawCanvas.addEventListener('mousemove',function(e){
    if(!drawing) return;
    var r=drawCanvas.getBoundingClientRect();
    addPlacement(e.clientX-r.left,e.clientY-r.top);
  });
  drawCanvas.addEventListener('mouseup',function(){endStroke()});
  drawCanvas.addEventListener('mouseleave',function(){endStroke()});
  drawCanvas.addEventListener('touchstart',function(e){
    e.preventDefault();resizeDrawCanvas();startStroke();
    var r=drawCanvas.getBoundingClientRect();
    var t=e.touches[0];
    addPlacement(t.clientX-r.left,t.clientY-r.top);
  });
  drawCanvas.addEventListener('touchmove',function(e){
    e.preventDefault();if(!drawing) return;
    var r=drawCanvas.getBoundingClientRect();
    var t=e.touches[0];
    addPlacement(t.clientX-r.left,t.clientY-r.top);
  });
  drawCanvas.addEventListener('touchend',function(){endStroke()});

  // Undo last stroke (all placements from one click/drag)
  document.getElementById('euDrawUndo').onclick=function(){
    if(undoStack.length>0){
      var count=undoStack.pop();
      placements.splice(placements.length-count,count);
      renderAll();
    }
  };

  // Clear all
  document.getElementById('euDrawClear').onclick=function(){
    placements=[];
    undoStack=[];
    bgStickerLocked=false;
    renderAll();
  };

  // ── Carousels for stamps & stickers ──
  (function(){
    var stamps=document.querySelectorAll('.eu-draw__stamp');
    var stampShow=document.getElementById('euStampShow');
    var stampIdx=0;
    function showStamp(i){
      stampIdx=i;
      stamps.forEach(function(s,j){s.classList.toggle('is-active',j===i);});
      stampShow.querySelector('img').src=stamps[i].querySelector('img').src;
      activeStamp=i;
    }
    document.getElementById('euStampPrev').onclick=function(){showStamp((stampIdx-1+stamps.length)%stamps.length);};
    document.getElementById('euStampNext').onclick=function(){showStamp((stampIdx+1)%stamps.length);};
    stampShow.onclick=function(){showStamp(stampIdx);};

    var stickers=document.querySelectorAll('.eu-draw__bg-opt');
    var stickerShow=document.getElementById('euStickerShow');
    var stickerIdx=0;
    function showSticker(i){
      stickerIdx=i;
      stickers.forEach(function(s,j){s.classList.toggle('is-active',j===i);});
      stickerShow.querySelector('img').src=stickers[i].querySelector('img').src;
      stickers[i].click();
    }
    document.getElementById('euStickerPrev').onclick=function(){showSticker((stickerIdx-1+stickers.length)%stickers.length);};
    document.getElementById('euStickerNext').onclick=function(){showSticker((stickerIdx+1)%stickers.length);};
    stickerShow.onclick=function(){showSticker(stickerIdx);};
  })();

  // ── GIF Encoder ──
  function lzwEncode(pixels,minCode){
    var clr=1<<minCode,eoi=clr+1,cs=minCode+1,nx=eoi+1;
    var dict={},bits=0,bc=0,out=[];
    function emit(c){bits|=(c<<bc);bc+=cs;while(bc>=8){out.push(bits&0xff);bits>>=8;bc-=8;}}
    function reset(){dict={};for(var i=0;i<clr;i++)dict[String.fromCharCode(i)]=i;nx=eoi+1;cs=minCode+1;}
    reset();emit(clr);
    var w=String.fromCharCode(pixels[0]);
    for(var i=1;i<pixels.length;i++){
      var c=String.fromCharCode(pixels[i]),wc=w+c;
      if(dict[wc]!==undefined){w=wc;}
      else{emit(dict[w]);if(nx<4096){dict[wc]=nx++;if(nx>(1<<cs)&&cs<12)cs++;}else{emit(clr);reset();}w=c;}
    }
    emit(dict[w]);emit(eoi);
    if(bc>0)out.push(bits&0xff);
    return out;
  }

  function buildGIF(frames,w,h,delay,palette){
    var buf=[];
    function ws(s){for(var i=0;i<s.length;i++)buf.push(s.charCodeAt(i));}
    function w16(v){buf.push(v&0xff,(v>>8)&0xff);}
    function wb(v){buf.push(v&0xff);}
    // Use adaptive palette
    var pal=[];
    for(var i=0;i<256;i++){pal.push(palette[i][0],palette[i][1],palette[i][2]);}
    // header
    ws('GIF89a');w16(w);w16(h);wb(0xf7);wb(0);wb(0);
    for(var i=0;i<768;i++)wb(pal[i]);
    // NETSCAPE loop
    wb(0x21);wb(0xff);wb(11);ws('NETSCAPE2.0');wb(3);wb(1);w16(0);wb(0);
    // frames
    for(var f=0;f<frames.length;f++){
      wb(0x21);wb(0xf9);wb(4);wb(0x00);w16(delay);wb(0);wb(0);
      wb(0x2c);w16(0);w16(0);w16(w);w16(h);wb(0);
      wb(8);
      var comp=lzwEncode(frames[f],8);
      var p=0;
      while(p<comp.length){var bl=Math.min(255,comp.length-p);wb(bl);for(var j=0;j<bl;j++)wb(comp[p++]);}
      wb(0);
    }
    wb(0x3b);
    return new Blob([new Uint8Array(buf)],{type:'image/gif'});
  }

  // ── Adaptive palette: median-cut quantisation for better GIF quality ──
  function buildAdaptivePalette(imgData,maxColors){
    maxColors=maxColors||256;
    var data=imgData.data,n=data.length/4;
    // Sample every 2nd pixel (better minority-color coverage than every 4th)
    var pixels=[];
    for(var i=0;i<n;i+=2){
      var r=data[i*4],g=data[i*4+1],b=data[i*4+2];
      pixels.push([r,g,b]);
    }
    // Deduplicate with a frequency map — ensures rare sticker colours
    // are not drowned out by the dominant background colour
    var uniq={},uniqArr=[];
    for(var i=0;i<pixels.length;i++){
      // 5-bit key per channel
      var key=((pixels[i][0]>>3)<<10)|((pixels[i][1]>>3)<<5)|(pixels[i][2]>>3);
      if(!uniq[key]){uniq[key]={r:0,g:0,b:0,n:0};uniqArr.push(uniq[key]);}
      uniq[key].r+=pixels[i][0];uniq[key].g+=pixels[i][1];uniq[key].b+=pixels[i][2];uniq[key].n++;
    }
    // Use unique colour centroids so each distinct colour region gets fair weight
    var dedupPixels=[];
    for(var i=0;i<uniqArr.length;i++){
      var u=uniqArr[i];
      dedupPixels.push([Math.round(u.r/u.n),Math.round(u.g/u.n),Math.round(u.b/u.n)]);
    }
    // Median-cut on deduplicated pixels
    function vol(box){
      var rn=box.rMax-box.rMin,gn=box.gMax-box.gMin,bn=box.bMax-box.bMin;
      return rn*gn*bn;
    }
    function makeBox(px){
      var rMin=255,rMax=0,gMin=255,gMax=0,bMin=255,bMax=0;
      for(var i=0;i<px.length;i++){
        var p=px[i];
        if(p[0]<rMin)rMin=p[0];if(p[0]>rMax)rMax=p[0];
        if(p[1]<gMin)gMin=p[1];if(p[1]>gMax)gMax=p[1];
        if(p[2]<bMin)bMin=p[2];if(p[2]>bMax)bMax=p[2];
      }
      return {px:px,rMin:rMin,rMax:rMax,gMin:gMin,gMax:gMax,bMin:bMin,bMax:bMax};
    }
    function splitBox(box){
      var rr=box.rMax-box.rMin,gr=box.gMax-box.gMin,br=box.bMax-box.bMin;
      var ch=rr>=gr&&rr>=br?0:(gr>=br?1:2);
      box.px.sort(function(a,b){return a[ch]-b[ch];});
      var mid=Math.floor(box.px.length/2);
      return [makeBox(box.px.slice(0,mid)),makeBox(box.px.slice(mid))];
    }
    var boxes=[makeBox(dedupPixels)];
    while(boxes.length<maxColors){
      var best=-1,bestVol=-1;
      for(var i=0;i<boxes.length;i++){
        if(boxes[i].px.length>1){
          var v=vol(boxes[i]);
          if(v>bestVol){bestVol=v;best=i;}
        }
      }
      if(best<0)break;
      var pair=splitBox(boxes[best]);
      boxes.splice(best,1,pair[0],pair[1]);
    }
    // Build palette from box averages
    var palette=[];
    for(var i=0;i<boxes.length;i++){
      var bx=boxes[i],rs=0,gs=0,bs=0;
      for(var j=0;j<bx.px.length;j++){rs+=bx.px[j][0];gs+=bx.px[j][1];bs+=bx.px[j][2];}
      var c=bx.px.length;
      palette.push([Math.round(rs/c),Math.round(gs/c),Math.round(bs/c)]);
    }
    while(palette.length<256)palette.push([0,0,0]);
    return palette;
  }

  function quantizeFrameAdaptive(ctx,w,h,palette){
    var data=ctx.getImageData(0,0,w,h).data;
    var idx=new Uint8Array(w*h);
    // Build lookup cache for speed
    var cache={};
    for(var i=0;i<w*h;i++){
      var r=data[i*4],g=data[i*4+1],b=data[i*4+2];
      // Reduce to 5-bit per channel for cache key
      var key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
      if(cache[key]!==undefined){idx[i]=cache[key];continue;}
      var bestD=Infinity,bestJ=0;
      for(var j=0;j<256;j++){
        var dr=r-palette[j][0],dg=g-palette[j][1],db=b-palette[j][2];
        var d=dr*dr+dg*dg+db*db;
        if(d<bestD){bestD=d;bestJ=j;}
      }
      cache[key]=bestJ;
      idx[i]=bestJ;
    }
    return idx;
  }

  // Sign-it input removed — signing integrated into guestbook flow

  // Render placements to an export canvas (default 1080x1080, pass exportSize for smaller)
  function renderExportFrame(tmpCtx,mode,t,exportSize){
    var ew=exportSize||1080,eh=ew;
    var sc=ew/drawCanvas.width;
    tmpCtx.clearRect(0,0,ew,eh);
    // Draw bg scaled — match live canvas exactly (drawBg uses 0.5 scale, full opacity)
    drawBg(tmpCtx,ew,eh);
    // Draw placements scaled
    for(var i=0;i<placements.length;i++){
      var p=placements[i];
      var img=stampImgs[p.si];
      if(!img.complete)continue;
      var cx=p.x*sc,cy=p.y*sc,s=p.sz*sc,rot=0,psc=1;
      var phase=i*0.4;
      if(mode==='bounce'){cy+=Math.sin(t*4+phase)*s*0.3;}
      else if(mode==='beat'){psc=1+Math.sin(t*5+phase)*0.25;}
      else if(mode==='rotate'){rot=Math.sin(t*3+phase)*0.5;}
      tmpCtx.save();
      tmpCtx.translate(cx,cy);
      if(rot)tmpCtx.rotate(rot);
      if(psc!==1)tmpCtx.scale(psc,psc);
      var eiw=img.naturalWidth||1,eih=img.naturalHeight||1;
      var ear=eiw/eih;
      var edw=ear>=1?s:s*ear;
      var edh=ear>=1?s/ear:s;
      tmpCtx.drawImage(img,-edw/2,-edh/2,edw,edh);
      tmpCtx.restore();
    }
    // Message text removed — signing happens via guestbook
  }

  // Download GIF (animated) or PNG (if no animation)
  document.getElementById('euDrawDl').onclick=function(){
    if(placements.length===0) return;
    var ew=1080,eh=1080;
    if(animMode==='none'){
      // Export as PNG at 1080x1080
      var tmpCanvas=document.createElement('canvas');
      tmpCanvas.width=ew;tmpCanvas.height=eh;
      var tmpCtx=tmpCanvas.getContext('2d');
      renderExportFrame(tmpCtx,'none',0);
      var link=document.createElement('a');
      link.download='electro-union-drawing.png';
      link.href=tmpCanvas.toDataURL('image/png');
      link.click();
      return;
    }
    // Render animation frames to GIF at 1080x1080 with adaptive palette
    var tmpCanvas=document.createElement('canvas');
    tmpCanvas.width=ew;tmpCanvas.height=eh;
    var tmpCtx=tmpCanvas.getContext('2d');
    var numFrames=36;
    var cycleDur=2;
    var savedMode=animMode;
    // Build adaptive palette from first frame
    renderExportFrame(tmpCtx,savedMode,0);
    var palette=buildAdaptivePalette(tmpCtx.getImageData(0,0,ew,eh),256);
    // Quantize all frames with this palette
    var gifFrames=[];
    for(var f=0;f<numFrames;f++){
      var t=f*(cycleDur/numFrames);
      renderExportFrame(tmpCtx,savedMode,t);
      gifFrames.push(quantizeFrameAdaptive(tmpCtx,ew,eh,palette));
    }
    var delay=Math.round(cycleDur/numFrames*100);
    var blob=buildGIF(gifFrames,ew,eh,delay,palette);
    var link=document.createElement('a');
    link.download='electro-union-drawing.gif';
    link.href=URL.createObjectURL(blob);
    link.click();
    setTimeout(function(){URL.revokeObjectURL(link.href);},5000);
  };

  // Download PNG (always still, 1080x1080)
  document.getElementById('euDrawDlPng').onclick=function(){
    if(placements.length===0) return;
    var ew=1080,eh=1080;
    var tmpCanvas=document.createElement('canvas');
    tmpCanvas.width=ew;tmpCanvas.height=eh;
    var tmpCtx=tmpCanvas.getContext('2d');
    renderExportFrame(tmpCtx,'none',0);
    var link=document.createElement('a');
    link.download='electro-union-drawing.png';
    link.href=tmpCanvas.toDataURL('image/png');
    link.click();
  };

  // ── Expose drawing internals for the guestbook module ──
  // Gör det möjligt för ../guestbook/script.js att bygga en GIF/PNG som matchar
  // vad som just nu är i drawing-canvas. Ingen beteendeförändring för golden:
  // guestbook-modulen kopplar in sig på #euDrawGuestbook-knappen själv.
  window.EU_DRAWING={
    get placements(){return placements;},
    get animMode(){return animMode;},
    renderExportFrame:renderExportFrame,
    buildAdaptivePalette:buildAdaptivePalette,
    quantizeFrameAdaptive:quantizeFrameAdaptive,
    buildGIF:buildGIF,
    canvas:drawCanvas
  };
})();
