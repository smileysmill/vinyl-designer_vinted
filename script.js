/* ====== DOM / Canvas ====== */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const langBar = document.getElementById("langBar");
const titleEl = document.getElementById("title");

const chooseBgBtn = document.getElementById("chooseBg");
const addStraightBtn = document.getElementById("addStraight");
const addCurvedBtn   = document.getElementById("addCurved");
const addShapeBtn    = document.getElementById("addShape");
const savePngBtn     = document.getElementById("savePng");
const bgFile         = document.getElementById("bgFile");

const elementSelect  = document.getElementById("elementSelect");
const textContent = document.getElementById("textContent");
const fontSelect  = document.getElementById("fontSelect");
const fontSize    = document.getElementById("fontSize");
const fontColor   = document.getElementById("fontColor");
const arcControls = document.getElementById("arcControls");
const arcPos      = document.getElementById("arcPos");
const arcRadius   = document.getElementById("arcRadius");
const arcSpacing  = document.getElementById("arcSpacing");
const arcFlip     = document.getElementById("arcFlip");
const deleteItem  = document.getElementById("deleteItem");

const shapeType   = document.getElementById("shapeType");
const shapeW      = document.getElementById("shapeW");
const shapeH      = document.getElementById("shapeH");
const shapeRot    = document.getElementById("shapeRot");
const shapeStroke = document.getElementById("shapeStroke");
const shapeStrokeW= document.getElementById("shapeStrokeW");
const shapeFilled = document.getElementById("shapeFilled");
const shapeFill   = document.getElementById("shapeFill");
const deleteShape = document.getElementById("deleteShape");

const rimEnabled = document.getElementById("rimEnabled");
const rimColor   = document.getElementById("rimColor");
const rimWidth   = document.getElementById("rimWidth");
const rimPattern = document.getElementById("rimPattern");

const trash = document.getElementById("trash");

/* ====== Geometrie / Maße ====== */
const C = 600, CX = 300, CY = 300, R = 300;
const PX_PER_MM = C / 100;          // 100 mm Arbeitsfläche
const R_HOLE = (7.24 * PX_PER_MM) / 2; // 7.24 mm Durchmesser ⇒ Radius

/* ====== i18n ====== */
const t = {
  en:{title:"Customize your vinyl label",chooseBg:"Choose background",addStraight:"Add straight text",addCurved:"Add curved text",addShape:"Add shape",savePng:"Save PNG (hi-res)",element:"Element:",content:"Content:",font:"Font:",size:"Size:",color:"Color:",delete:"Delete selected",arcPos:"Arc position (°):",arcRadius:"Arc radius:",arcSpacing:"Letter spacing:",arcFlip:"Flip inward:",rimTitle:"Rim line:",show:"Show",pattern:"Pattern"},
  de:{title:"Gestalte dein Schallplatten-Label",chooseBg:"Hintergrund wählen",addStraight:"Geraden Text hinzufügen",addCurved:"Gebogenen Text hinzufügen",addShape:"Form hinzufügen",savePng:"PNG speichern (hoch)",element:"Element:",content:"Inhalt:",font:"Schriftart:",size:"Größe:",color:"Farbe:",delete:"Auswahl löschen",arcPos:"Bogen-Position (°):",arcRadius:"Bogen-Radius:",arcSpacing:"Buchstabenabstand:",arcFlip:"Nach innen drehen:",rimTitle:"Randlinie:",show:"Anzeigen",pattern:"Muster"},
  fr:{title:"Personnalise ton étiquette vinyle",chooseBg:"Choisir l’arrière-plan",addStraight:"Ajouter texte droit",addCurved:"Ajouter texte courbé",addShape:"Ajouter une forme",savePng:"Enregistrer PNG (haute)",element:"Élément :",content:"Texte :",font:"Police :",size:"Taille :",color:"Couleur :",delete:"Supprimer la sélection",arcPos:"Position de l’arc (°) :",arcRadius:"Rayon de l’arc :",arcSpacing:"Espacement des lettres :",arcFlip:"Inverser vers l’intérieur :",rimTitle:"Ligne de bord :",show:"Afficher",pattern:"Motif"}
};
let lang = "en";
function setLang(l){
  lang = t[l] ? l : "en";
  titleEl.textContent = t[lang].title;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n");
    if(k && t[lang][k]) el.firstChild.nodeValue = t[lang][k] + (el.tagName==="LABEL"?" ":"");
  });
}
langBar.addEventListener("click",(e)=>{ const l=e.target.getAttribute("data-lang"); if(l){ setLang(l); render(); }});
setLang("en");

/* ====== State ====== */
let bgImage=null, bg={x:0,y:0,w:0,h:0};
let items=[]; // z-order: shapes -> texts
// straight: {type:'straight', text,x,y,size,color,font}
// arc:      {type:'arc', text,size,color,font, radius,posDeg,spacingDeg,flip}
// shape:    {type:'shape', kind,x,y,w,h,rot,stroke,strokeW,filled,fill}
let active=null;

/* ====== Utilities ====== */
function measureText(w, font){ ctx.save(); ctx.font=font; const m=ctx.measureText(w); ctx.restore(); return m; }
function fontCSS(it){ return `${it.size}px ${it.font}`; }
function getPos(e){ const r=canvas.getBoundingClientRect(); const t=e.touches&&e.touches[0]; return { x:(t?t.clientX:e.clientX)-r.left, y:(t?t.clientY:e.clientY)-r.top }; }

/* ====== Drawing ====== */
function render(){
  ctx.clearRect(0,0,C,C);

  // Hintergrund im Kreis
  ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip();
  if(bgImage) ctx.drawImage(bgImage,bg.x,bg.y,bg.w,bg.h);
  else { ctx.fillStyle="#fff"; ctx.fillRect(0,0,C,C); }
  ctx.restore();

  // dünner Außenring
  ctx.strokeStyle="#333"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(CX,CY,R-1,0,Math.PI*2); ctx.stroke();

  // SHAPES (unter der Schrift)
  items.filter(i=>i.type==='shape').forEach(drawShape);

  // RIM
  drawRim();

  // TEXTE (oben)
  items.filter(i=>i.type!=='shape').forEach(it=>{
    if(it.type==='straight') drawStraight(it); else drawArcText(it);
  });

  // Loch oben
  ctx.fillStyle="#111"; ctx.beginPath(); ctx.arc(CX,CY,R_HOLE,0,Math.PI*2); ctx.fill();
  const g=ctx.createRadialGradient(CX,CY,R_HOLE*0.2,CX,CY,R_HOLE*1.6);
  g.addColorStop(0,"rgba(0,0,0,.25)"); g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(CX,CY,R_HOLE*1.6,0,Math.PI*2); ctx.fill();
}
function drawStraight(it){
  ctx.font=fontCSS(it); ctx.fillStyle=it.color; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(it.text, it.x, it.y);
}
function drawArcText(it){
  const text=it.text||""; if(!text) return;
  const r=it.radius, pos=(it.posDeg||0)*Math.PI/180, flip=!!it.flip, spacing=(it.spacingDeg||0)*Math.PI/180;
  ctx.save(); ctx.fillStyle=it.color; ctx.font=fontCSS(it); ctx.textBaseline="middle";
  const total=ctx.measureText(text).width, arcLen=total/r;
  let a = pos - arcLen/2 + spacing;
  for(let i=0;i<text.length;i++){
    const ch=text[i], w=ctx.measureText(ch).width, da=w/r;
    const mid=a+da/2, x=CX+r*Math.cos(mid), y=CY+r*Math.sin(mid);
    ctx.save(); ctx.translate(x,y); ctx.rotate(mid + (flip?-Math.PI/2:Math.PI/2));
    ctx.textAlign="center"; ctx.fillText(ch,0,0); ctx.restore(); a+=da;
  }
  ctx.restore();
}
function drawShape(s){
  ctx.save(); ctx.translate(s.x,s.y); ctx.rotate((s.rot||0)*Math.PI/180);
  ctx.strokeStyle=s.stroke; ctx.lineWidth=s.strokeW; ctx.fillStyle=s.fill;
  const draw=()=>{ if(s.filled) ctx.fill(); if(s.strokeW>0) ctx.stroke(); };
  if(s.kind==='rect'||s.kind==='diamond'){ // diamond = square (UI-Text)
    const w=s.w,h=s.h; ctx.beginPath(); ctx.rect(-w/2,-h/2,w,h); draw();
  }else if(s.kind==='square'){ const a=Math.min(s.w,s.h); ctx.beginPath(); ctx.rect(-a/2,-a/2,a,a); draw();
  }else if(s.kind==='circle'){ const r=Math.min(s.w,s.h)/2; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); draw();
  }else if(s.kind==='oval'){ ctx.beginPath(); ctx.ellipse(0,0,s.w/2,s.h/2,0,0,Math.PI*2); draw();
  }else if(s.kind==='triangle'){ const w=s.w,h=s.h; ctx.beginPath(); ctx.moveTo(-w/2,h/2); ctx.lineTo(0,-h/2); ctx.lineTo(w/2,h/2); ctx.closePath(); draw();
  }else if(s.kind==='line'){ ctx.beginPath(); ctx.moveTo(-s.w/2,0); ctx.lineTo(s.w/2,0); ctx.stroke();
  }else if(s.kind==='star'){ starPath(ctx, Math.min(s.w,s.h)/2, 5, 0.5); draw();
  }else if(s.kind==='heart'){ heartPath(ctx, s.w, s.h); draw(); }
  ctx.restore();
}
function starPath(c,r,points=5,inner=0.5){
  c.beginPath();
  for(let i=0;i<points*2;i++){
    const ang=(Math.PI/points)*i-Math.PI/2, rad=(i%2===0)?r:r*inner;
    const x=Math.cos(ang)*rad, y=Math.sin(ang)*rad;
    if(i===0)c.moveTo(x,y); else c.lineTo(x,y);
  } c.closePath();
}
function heartPath(c,w,h){
  const r=Math.min(w,h)/4;
  c.beginPath();
  c.moveTo(0,h/4);
  c.bezierCurveTo(w/2,-h/8,  w/2,h/2,  0,h/2);
  c.bezierCurveTo(-w/2,h/2, -w/2,-h/8, 0,h/4);
}

/* Rim */
function drawRim(){
  if(!rimEnabled.checked) return;
  const col=rimColor.value||"#111111", lw=Number(rimWidth.value)||2, pat=(rimPattern.value||"solid");
  const r=R-18;
  ctx.save(); ctx.strokeStyle=col; ctx.lineWidth=lw;
  if(pat==="solid"){ ctx.setLineDash([]); ctx.beginPath(); ctx.arc(CX,CY,r,0,Math.PI*2); ctx.stroke(); }
  else if(pat==="dashed"){ ctx.setLineDash([14,8]); ctx.beginPath(); ctx.arc(CX,CY,r,0,Math.PI*2); ctx.stroke(); }
  else { // dotted
    ctx.setLineDash([]); const n=Math.round(2*Math.PI*r/16);
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, x=CX+r*Math.cos(a), y=CY+r*Math.sin(a);
      ctx.beginPath(); ctx.arc(x,y,Math.max(1,lw/2),0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
    }
  }
  ctx.restore();
}

/* ====== Auswahl / Panel ====== */
function refreshElementList(){
  elementSelect.innerHTML="";
  items.forEach((it,i)=>{
    const o=document.createElement("option");
    o.value=i;
    o.textContent=(it.type==='shape'?`shape (${it.kind})`:it.type)+` #${i+1}`;
    if(it===active) o.selected=true;
    elementSelect.appendChild(o);
  });
  updatePanel();
}
function selectItem(it){ active=it; refreshElementList(); render(); }
function selected(){ const i=Number(elementSelect.value); return Number.isFinite(i)?items[i]:null; }
function updatePanel(){
  const it=selected();
  const showText = it && (it.type==='straight'||it.type==='arc');
  const showShape= it && it.type==='shape';
  document.querySelector(".group-text").style.display  = showText?"inline-flex":"none";
  document.querySelector(".group-shape").style.display = showShape?"inline-flex":"none";
  arcControls.style.display = (it && it.type==='arc') ? "inline-flex":"none";
  if(!it) return;

  if(it.type==='straight'||it.type==='arc'){
    textContent.value=it.text||"";
    fontSelect.value=it.font||"Arial";
    fontSize.value=it.size||32;
    fontColor.value=it.color||"#111111";
  }
  if(it.type==='arc'){
    arcPos.value=it.posDeg??180;
    arcRadius.value=it.radius??240;
    arcSpacing.value=it.spacingDeg??0;
    arcFlip.checked=!!it.flip;
  }
  if(it.type==='shape'){
    shapeType.value=it.kind;
    shapeW.value=Math.round(it.w);
    shapeH.value=Math.round(it.h);
    shapeRot.value=Math.round(it.rot||0);
    shapeStroke.value=it.stroke;
    shapeStrokeW.value=it.strokeW;
    shapeFilled.checked=!!it.filled;
    shapeFill.value=it.fill;
  }
}

/* ====== Interaktion / Drag ====== */
function hitStraight(x,y){
  for(let i=items.length-1;i>=0;i--){
    const it=items[i]; if(it.type!=='straight') continue;
    ctx.font = fontCSS(it);
    const w=ctx.measureText(it.text).width, h=it.size;
    if(Math.abs(x-it.x)<=w/2 && Math.abs(y-it.y)<=h/2) return it;
  } return null;
}
function hitShape(x,y){
  for(let i=items.length-1;i>=0;i--){
    const s=items[i]; if(s.type!=='shape') continue;
    if(Math.abs(x-s.x)<=s.w/2 && Math.abs(y-s.y)<=s.h/2) return s;
  } return null;
}
let dragKind=null, dx=0, dy=0;
function onDown(e){
  const p=getPos(e);
  const t=hitStraight(p.x,p.y);
  if(t){ dragKind="text"; selectItem(t); dx=p.x-t.x; dy=p.y-t.y; e.preventDefault(); return; }
  const s=hitShape(p.x,p.y);
  if(s){ dragKind="shape"; selectItem(s); dx=p.x-s.x; dy=p.y-s.y; e.preventDefault(); return; }
  // Hintergrund verschieben?
  if(bgImage){
    if(p.x>=bg.x && p.x<=bg.x+bg.w && p.y>=bg.y && p.y<=bg.y+bg.h){
      dragKind="bg"; dx=p.x-bg.x; dy=p.y-bg.y; e.preventDefault(); return;
    }
  }
  selectItem(null);
}
function onMove(e){
  if(!dragKind) return;
  const p=getPos(e);
  if(dragKind==="text"){ active.x=p.x-dx; active.y=p.y-dy; }
  else if(dragKind==="shape"){ active.x=p.x-dx; active.y=p.y-dy; }
  else if(dragKind==="bg"){ bg.x=p.x-dx; bg.y=p.y-dy; }
  // Trash highlight
  const tr=trash.getBoundingClientRect(), cv=canvas.getBoundingClientRect();
  const tx=p.x+cv.left, ty=p.y+cv.top;
  if(tx>tr.left && tx<tr.right && ty>tr.top && ty<tr.bottom) trash.classList.add("drag");
  else trash.classList.remove("drag");
  render();
}
function onUp(e){
  if(!dragKind) return;
  // Drop to trash?
  const p=getPos(e); const tr=trash.getBoundingClientRect(), cv=canvas.getBoundingClientRect();
  const tx=p.x+cv.left, ty=p.y+cv.top;
  if(active && dragKind!=="bg" && tx>tr.left && tx<tr.right && ty>tr.top && ty<tr.bottom){
    items = items.filter(i=>i!==active); active=null; refreshElementList();
  }
  dragKind=null; trash.classList.remove("drag"); render();
}
canvas.addEventListener("mousedown",onDown);
canvas.addEventListener("mousemove",onMove);
window.addEventListener("mouseup",onUp);
canvas.addEventListener("touchstart",onDown,{passive:false});
canvas.addEventListener("touchmove",onMove,{passive:false});
window.addEventListener("touchend",onUp);

/* ====== Buttons ====== */
chooseBgBtn.addEventListener("click", ()=> bgFile.click());
bgFile.addEventListener("change", ()=>{
  const f=bgFile.files && bgFile.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const sc=Math.max(C/img.width, C/img.height);
      bgImage=img; bg.w=img.width*sc; bg.h=img.height*sc; bg.x=(C-bg.w)/2; bg.y=(C-bg.h)/2;
      render();
    }; img.src=e.target.result;
  }; r.readAsDataURL(f);
});

addStraightBtn.addEventListener("click", ()=>{
  const it={type:'straight', text:"Type your text", x:CX, y:CY+20, size:32, color:"#111111", font:fontSelect.value};
  items.push(it); selectItem(it);
});
addCurvedBtn.addEventListener("click", ()=>{
  const it={type:'arc', text:"Curved text", size:22, color:"#111111", font:fontSelect.value, radius:240, posDeg:180, spacingDeg:0, flip:false};
  items.push(it); selectItem(it);
});
addShapeBtn.addEventListener("click", ()=>{
  let kind=prompt("Shape? star, oval, circle, triangle, square, rect, heart, line","star");
  if(!kind) return; kind=kind.toLowerCase().trim();
  if(!["star","oval","circle","triangle","square","rect","heart","line"].includes(kind)) return;
  const s={type:'shape', kind, x:CX, y:CY, w:160, h:80, rot:0, stroke:"#111111", strokeW:3, filled:false, fill:"#ffffff"};
  if(kind==="square"||kind==="circle"){ s.w=140; s.h=140; }
  if(kind==="line"){ s.w=180; s.h=4; s.filled=false; }
  items.push(s); selectItem(s);
});

elementSelect.addEventListener("change", ()=> selectItem(selected()));

[textContent,fontSelect,fontSize,fontColor].forEach(el=>{
  el.addEventListener("input", ()=>{
    const it=selected(); if(!it) return;
    if(it.type==='straight'||it.type==='arc'){
      if(el===textContent) it.text=textContent.value;
      if(el===fontSelect)  it.font=fontSelect.value;
      if(el===fontSize)    it.size=Number(fontSize.value);
      if(el===fontColor)   it.color=fontColor.value;
      render();
    }
  });
});
[arcPos,arcRadius,arcSpacing,arcFlip].forEach(el=>{
  el.addEventListener("input", ()=>{
    const it=selected(); if(!it||it.type!=='arc') return;
    if(el===arcPos)     it.posDeg   = Number(arcPos.value);
    if(el===arcRadius)  it.radius   = Number(arcRadius.value);
    if(el===arcSpacing) it.spacingDeg = Number(arcSpacing.value);
    if(el===arcFlip)    it.flip = arcFlip.checked;
    render();
  });
});
deleteItem.addEventListener("click", ()=>{ const it=selected(); if(!it) return; items=items.filter(x=>x!==it); active=null; refreshElementList(); render(); });

[shapeW,shapeH,shapeRot,shapeStroke,shapeStrokeW,shapeFilled,shapeFill].forEach(el=>{
  el.addEventListener("input", ()=>{
    const s=selected(); if(!s||s.type!=='shape') return;
    if(el===shapeW){ s.w=Number(shapeW.value); if(s.kind==='square'||s.kind==='circle') s.h=s.w; }
    if(el===shapeH){ s.h=Number(shapeH.value); if(s.kind==='square'||s.kind==='circle') s.w=s.h; }
    if(el===shapeRot)     s.rot = Number(shapeRot.value);
    if(el===shapeStroke)  s.stroke = shapeStroke.value;
    if(el===shapeStrokeW) s.strokeW = Number(shapeStrokeW.value);
    if(el===shapeFilled)  s.filled = shapeFilled.checked;
    if(el===shapeFill)    s.fill = shapeFill.value;
    render();
  });
});
deleteShape.addEventListener("click", ()=>{ const it=selected(); if(!it||it.type!=='shape') return; items=items.filter(x=>x!==it); active=null; refreshElementList(); render(); });

[rimEnabled,rimColor,rimWidth,rimPattern].forEach(el=>{
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});

/* ====== Speichern: PNG 3000×3000 ====== */
savePngBtn.addEventListener("click", ()=>{
  const OUT=3000; // hi-res quadratisch
  const s=OUT/C, CXo=OUT/2, CYo=OUT/2, Ro=OUT/2;

  const off=document.createElement("canvas"); off.width=OUT; off.height=OUT;
  const o=off.getContext("2d");

  // BG
  o.save(); o.beginPath(); o.arc(CXo,CYo,Ro,0,Math.PI*2); o.clip();
  if(bgImage) o.drawImage(bgImage,bg.x*s,bg.y*s,bg.w*s,bg.h*s); else { o.fillStyle="#fff"; o.fillRect(0,0,OUT,OUT); }
  o.restore();

  // dünner Außenring
  o.strokeStyle="#333"; o.lineWidth=2*s; o.beginPath(); o.arc(CXo,CYo,Ro-1*s,0,Math.PI*2); o.stroke();

  // Shapes
  items.filter(i=>i.type==='shape').forEach(sv=>{
    o.save(); o.translate(sv.x*s,sv.y*s); o.rotate((sv.rot||0)*Math.PI/180);
    o.strokeStyle=sv.stroke; o.lineWidth=sv.strokeW*s; o.fillStyle=sv.fill;
    if(sv.kind==='rect'||sv.kind==='diamond'){ if(sv.filled) o.fillRect(-sv.w*s/2,-sv.h*s/2,sv.w*s,sv.h*s); if(sv.strokeW>0) o.strokeRect(-sv.w*s/2,-sv.h*s/2,sv.w*s,sv.h*s); }
    else if(sv.kind==='square'){ const a=Math.min(sv.w,sv.h)*s; if(sv.filled) o.fillRect(-a/2,-a/2,a,a); if(sv.strokeW>0) o.strokeRect(-a/2,-a/2,a,a); }
    else if(sv.kind==='circle'){ o.beginPath(); o.arc(0,0,Math.min(sv.w,sv.h)*s/2,0,Math.PI*2); if(sv.filled) o.fill(); if(sv.strokeW>0)o.stroke(); }
    else if(sv.kind==='oval'){ o.beginPath(); o.ellipse(0,0,sv.w*s/2,sv.h*s/2,0,0,Math.PI*2); if(sv.filled) o.fill(); if(sv.strokeW>0)o.stroke(); }
    else if(sv.kind==='triangle'){ o.beginPath(); o.moveTo(-sv.w*s/2, sv.h*s/2); o.lineTo(0,-sv.h*s/2); o.lineTo(sv.w*s/2, sv.h*s/2); o.closePath(); if(sv.filled)o.fill(); if(sv.strokeW>0)o.stroke(); }
    else if(sv.kind==='line'){ o.beginPath(); o.moveTo(-sv.w*s/2,0); o.lineTo(sv.w*s/2,0); o.stroke(); }
    else if(sv.kind==='star'){ starPath(o, Math.min(sv.w,sv.h)*s/2, 5, 0.5); if(sv.filled)o.fill(); if(sv.strokeW>0)o.stroke(); }
    else if(sv.kind==='heart'){ heartPath(o, sv.w*s, sv.h*s); if(sv.filled)o.fill(); if(sv.strokeW>0)o.stroke(); }
    o.restore();
  });

  // Rim
  if(rimEnabled.checked){
    const r=Ro-18*s;
    o.save(); o.strokeStyle=rimColor.value; o.lineWidth=Number(rimWidth.value)*s;
    const pat=rimPattern.value;
    if(pat==='solid'){ o.setLineDash([]); o.beginPath(); o.arc(CXo,CYo,r,0,Math.PI*2); o.stroke(); }
    else if(pat==='dashed'){ o.setLineDash([14*s,8*s]); o.beginPath(); o.arc(CXo,CYo,r,0,Math.PI*2); o.stroke(); }
    else { o.setLineDash([]); const n=Math.round(2*Math.PI*r/16); for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, x=CXo+r*Math.cos(a), y=CYo+r*Math.sin(a); o.beginPath(); o.arc(x,y,Math.max(1,Number(rimWidth.value)*s/2),0,Math.PI*2); o.fillStyle=rimColor.value; o.fill(); } }
    o.restore();
  }

  // Texte
  items.filter(i=>i.type!=='shape').forEach(it=>{
    o.fillStyle=it.color; o.font=`${it.size*s}px ${it.font}`; o.textBaseline="middle";
    if(it.type==='straight'){ o.textAlign="center"; o.fillText(it.text, it.x*s, it.y*s); }
    else {
      const r=it.radius*s, pos=(it.posDeg||0)*Math.PI/180, flip=!!it.flip, spacing=(it.spacingDeg||0)*Math.PI/180;
      const total=o.measureText(it.text).width, arcLen=total/r; let a=pos-arcLen/2+spacing;
      for(let i=0;i<it.text.length;i++){ const ch=it.text[i], w=o.measureText(ch).width, da=w/r; const mid=a+da/2, x=CXo+r*Math.cos(mid), y=CYo+r*Math.sin(mid);
        o.save(); o.translate(x,y); o.rotate(mid+(flip?-Math.PI/2:Math.PI/2)); o.textAlign="center"; o.fillText(ch,0,0); o.restore(); a+=da; }
    }
  });

  // Loch
  o.fillStyle="#111"; o.beginPath(); o.arc(CXo,CYo,R_HOLE*s,0,Math.PI*2); o.fill();

  const a=document.createElement("a");
  a.download="vinyl-label-3000.png";
  a.href=off.toDataURL("image/png");
  a.click();
});

/* ====== Init ====== */
render();
refreshElementList();