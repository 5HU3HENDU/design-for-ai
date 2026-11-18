import { createBox, clamp, roundedStyle } from './geometry.js';
const $ = id => document.getElementById(id);
const canvas = $('canvas'), stage = $('stage');
const sizes = { mobile: [390,844], laptop:[1440,900], square:[1080,1080] };
const labels = { mobile:'Mobile portrait', laptop:'Laptop landscape', square:'Square' };
const palette = ['#8e9fff','#f6b2bd','#f8d987','#9dd8c1','#27334a'];
const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
const startPreset = phone || innerWidth < 700 ? 'mobile' : 'laptop';
let state = {preset:startPreset,boxes:[]}, selected = null, gesture = null;
let view = {s:1,x:0,y:0,auto:true};
const pointers = new Map();
let pinch = null, multi = false, selBefore = null;
const MIN_ZOOM = 0.1, MAX_ZOOM = 8;
let past = [], future = [], lastTap = {id:null,time:0};
const snapshot = () => JSON.stringify(state);
function checkpoint(){past.push(snapshot());if(past.length>70)past.shift();future=[];historyUI();}
function historyUI(){$('undo').disabled=!past.length;$('redo').disabled=!future.length;}
function announce(text){$('status').textContent=text;$('status').classList.add('visible');clearTimeout(announce.timer);announce.timer=setTimeout(()=>$('status').classList.remove('visible'),1600);}

function applyView(){
 const s=view.s;
 canvas.style.transform=`translate(${view.x}px,${view.y}px) scale(${s})`;
 canvas.style.setProperty('--handle-size',(44/s)+'px');canvas.style.setProperty('--handle-dot',(12/s)+'px');
 canvas.style.setProperty('--ol',(2/s)+'px');canvas.style.setProperty('--ol-off',(3/s)+'px');
 $('zoom').textContent=Math.round(s*100)+'%';
}
function fit(){
 const [w,h]=sizes[state.preset],W=stage.clientWidth,H=stage.clientHeight,pad=10;
 if(!W||!H)return;
 canvas.style.width=w+'px';canvas.style.height=h+'px';
 view.s=Math.max(MIN_ZOOM,Math.min((W-pad*2)/w,(H-pad*2)/h,1));
 view.x=(W-w*view.s)/2;view.y=(H-h*view.s)/2;view.auto=true;applyView();
}
function zoomAt(cx,cy,s){
 const r=stage.getBoundingClientRect(),px=cx-r.left,py=cy-r.top;
 s=clamp(s,MIN_ZOOM,MAX_ZOOM);
 const ux=(px-view.x)/view.s,uy=(py-view.y)/view.s;
 view.x=px-ux*s;view.y=py-uy*s;view.s=s;view.auto=false;applyView();
}
function ensureVisible(){
 const b=state.boxes.find(x=>x.id===selected);if(!b)return;
 const W=stage.clientWidth,H=stage.clientHeight,m=34,s=view.s;
 let l=view.x+b.x*s,t=view.y+b.y*s,r=l+b.w*s,btm=t+b.h*s,dx=0,dy=0;
 if(r+m>W)dx=W-m-r;if(l-m+dx<0)dx=m-l;
 if(btm+m>H)dy=H-m-btm;if(t-m+dy<0)dy=m-t;
 if(dx||dy){view.x+=dx;view.y+=dy;view.auto=false;applyView();}
}
new ResizeObserver(()=>{if(view.auto)fit();else ensureVisible();}).observe(stage);

function paintBox(b){
 let el=canvas.querySelector(`[data-id="${b.id}"]`);
 if(!el){el=document.createElement('div');el.className='box';el.dataset.id=b.id;el.tabIndex=0;el.setAttribute('role','button');el.innerHTML='<span class="box-text"></span>';canvas.append(el);}
 Object.assign(el.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px',background:b.colour,color:b.ink,fontSize:b.fontSize+'px',borderRadius:roundedStyle(b)});
 el.querySelector('.box-text').textContent=b.text;
 el.setAttribute('aria-label',b.text?'Box: '+b.text:'Coloured box. Tap to style; double-tap to type.');
 el.classList.toggle('selected',b.id===selected);
 if(b.id!==selected)el.querySelectorAll('.handle').forEach(x=>x.remove());
 if(b.id===selected&&!el.querySelector('.handle'))for(const corner of ['nw','ne','sw','se']){const handle=document.createElement('span');handle.className='handle';handle.dataset.corner=corner;handle.setAttribute('aria-hidden','true');el.append(handle);}
}
function render(){
 canvas.querySelectorAll('.box').forEach(el=>{if(!state.boxes.some(b=>b.id===el.dataset.id))el.remove();});
 state.boxes.forEach(paintBox);$('empty').hidden=!!state.boxes.length;
 $('box-count').textContent=state.boxes.length+' '+(state.boxes.length===1?'box':'boxes');
 $('canvas-label').textContent=labels[state.preset];$('dimensions').textContent=sizes[state.preset].join(' × ');$('preset').value=state.preset;
 syncInspector();historyUI();
}
// The controls strip changes the stage size, so it only updates between gestures.
function syncInspector(){
 if(gesture)return;
 const b=state.boxes.find(b=>b.id===selected);$('inspector').hidden=!b;
 if(!b)return;
 $('colour').value=b.colour;$('ink').value=b.ink;$('font-size').value=b.fontSize;
 document.querySelectorAll('[data-shape]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.shape===b.shape)));
 document.querySelectorAll('.swatch').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.colour===b.colour)));
}
function select(id){selected=id;render();}
function point(e,limit=true){
 const r=stage.getBoundingClientRect(),[w,h]=sizes[state.preset];
 const x=(e.clientX-r.left-view.x)/view.s,y=(e.clientY-r.top-view.y)/view.s;
 return limit?{x:clamp(x,0,w),y:clamp(y,0,h)}:{x,y};
}
function finish(e,cancelled=false){
 if(!gesture||gesture.pointerId!==e.pointerId)return;
 const g=gesture;gesture=null;
 if(cancelled){state=JSON.parse(g.before);selected=null;render();return;}
 const b=state.boxes.find(x=>x.id===selected);
 if(g.mode==='draw'&&b&&(b.w<20||b.h<20)){state.boxes=state.boxes.filter(x=>x.id!==b.id);selected=null;}
 if(snapshot()!==g.before){past.push(g.before);if(past.length>70)past.shift();future=[];}
 if(g.mode==='move'&&!g.moved&&b){const now=Date.now();if(lastTap.id===b.id&&now-lastTap.time<380){openText();lastTap={id:null,time:0};}else lastTap={id:b.id,time:now};}
 render();
}
function startSingle(e){
 selBefore=selected;
 const target=e.target.closest('.box'),before=snapshot(),[w,h]=sizes[state.preset],raw=point(e,false);
 if(target){
  selected=target.dataset.id;const b=state.boxes.find(x=>x.id===selected),p=point(e);
  gesture={pointerId:e.pointerId,mode:e.target.dataset.corner?'resize':'move',corner:e.target.dataset.corner,start:p,original:{...b},before,moved:false};
 } else if(raw.x>=0&&raw.y>=0&&raw.x<=w&&raw.y<=h){
  const p=point(e),b=createBox(p.x,p.y);state.boxes.push(b);selected=b.id;
  gesture={pointerId:e.pointerId,mode:'draw',start:p,before,moved:false};
 } else {
  selected=null;
  gesture={pointerId:e.pointerId,mode:'pan',cx:e.clientX,cy:e.clientY,vx:view.x,vy:view.y,before,moved:false};
 }
 render();
}
function startPinch(){
 if(gesture){state=JSON.parse(gesture.before);selected=state.boxes.some(b=>b.id===selBefore)?selBefore:null;gesture=null;render();}
 multi=true;
 const [a,b]=[...pointers.values()];
 pinch={d:Math.max(10,Math.hypot(a.x-b.x,a.y-b.y)),mx:(a.x+b.x)/2,my:(a.y+b.y)/2,s:view.s,x:view.x,y:view.y};
}
function movePinch(){
 const [a,b]=[...pointers.values()],r=stage.getBoundingClientRect();
 const d=Math.max(10,Math.hypot(a.x-b.x,a.y-b.y)),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
 const s=clamp(pinch.s*d/pinch.d,MIN_ZOOM,MAX_ZOOM);
 const ux=(pinch.mx-r.left-pinch.x)/pinch.s,uy=(pinch.my-r.top-pinch.y)/pinch.s;
 view.s=s;view.x=mx-r.left-ux*s;view.y=my-r.top-uy*s;view.auto=false;applyView();
}
stage.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 e.preventDefault();
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 try{stage.setPointerCapture(e.pointerId);}catch{}
 if(pointers.size===2){startPinch();return;}
 if(pointers.size>2||multi)return;
 startSingle(e);
});
stage.addEventListener('pointermove',e=>{
 if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(multi){if(pointers.size>=2&&pinch)movePinch();return;}
 if(!gesture||gesture.pointerId!==e.pointerId)return;
 const g=gesture;
 if(g.mode==='pan'){const dx=e.clientX-g.cx,dy=e.clientY-g.cy;if(Math.abs(dx)+Math.abs(dy)>3)g.moved=true;if(g.moved){view.x=g.vx+dx;view.y=g.vy+dy;view.auto=false;applyView();}return;}
 const p=point(e),b=state.boxes.find(x=>x.id===selected);if(!b)return;
 const [w,h]=sizes[state.preset],dx=p.x-g.start.x,dy=p.y-g.start.y;
 if(Math.abs(dx)+Math.abs(dy)>4/view.s)g.moved=true;
 if(g.mode==='draw'){b.x=Math.min(p.x,g.start.x);b.y=Math.min(p.y,g.start.y);b.w=Math.abs(dx);b.h=Math.abs(dy);}
 if(g.mode==='move'){b.x=clamp(g.original.x+dx,0,w-b.w);b.y=clamp(g.original.y+dy,0,h-b.h);}
 if(g.mode==='resize'){
 const o=g.original;let left=o.x,right=o.x+o.w,top=o.y,bottom=o.y+o.h;
 if(g.corner.includes('w'))left=clamp(o.x+dx,0,right-24);else right=clamp(o.x+o.w+dx,left+24,w);
 if(g.corner.includes('n'))top=clamp(o.y+dy,0,bottom-24);else bottom=clamp(o.y+o.h+dy,top+24,h);
 Object.assign(b,{x:left,y:top,w:right-left,h:bottom-top});
 }
 // Keep the captured surface and handles stable while dragging.
 const el=canvas.querySelector(`[data-id="${b.id}"]`);Object.assign(el.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px',borderRadius:roundedStyle(b)});
});
function release(e,cancelled){
 pointers.delete(e.pointerId);
 if(gesture&&gesture.pointerId===e.pointerId)finish(e,cancelled);
 if(pointers.size<2)pinch=null;
 if(!pointers.size)multi=false;
}
stage.addEventListener('pointerup',e=>release(e,false));stage.addEventListener('pointercancel',e=>release(e,true));
stage.addEventListener('wheel',e=>{
 e.preventDefault();
 if(e.ctrlKey||e.metaKey)zoomAt(e.clientX,e.clientY,view.s*Math.exp(-e.deltaY*(e.deltaMode===1?0.05:0.01)));
 else{view.x-=e.deltaX;view.y-=e.deltaY;view.auto=false;applyView();}
},{passive:false});
$('zoom').addEventListener('click',fit);
canvas.addEventListener('keydown',e=>{if(e.target.classList.contains('box')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(e.target.dataset.id);openText();}});
function change(values){const b=state.boxes.find(x=>x.id===selected);if(!b)return;checkpoint();Object.assign(b,values);render();}
for(const colour of palette){const b=document.createElement('button');b.className='swatch';b.style.setProperty('--swatch',colour);b.dataset.colour=colour;b.setAttribute('aria-label','Use '+colour);b.addEventListener('click',()=>change({colour}));document.querySelector('.swatches').append(b);}
document.querySelectorAll('[data-shape]').forEach(b=>b.addEventListener('click',()=>change({shape:b.dataset.shape})));
$('colour').addEventListener('change',e=>change({colour:e.target.value}));$('ink').addEventListener('change',e=>change({ink:e.target.value}));$('text-colour').addEventListener('click',()=>$('ink').click());$('font-size').addEventListener('change',e=>change({fontSize:Number(e.target.value)}));
$('more').addEventListener('click',()=>{const open=$('more-options').hidden;$('more-options').hidden=!open;$('more').setAttribute('aria-expanded',String(open));});
$('close-inspector').addEventListener('click',()=>select(null));
$('duplicate').addEventListener('click',()=>{const b=state.boxes.find(x=>x.id===selected);if(!b)return;checkpoint();const [w,h]=sizes[state.preset];const copy={...b,id:crypto.randomUUID(),x:Math.min(b.x+20,w-b.w),y:Math.min(b.y+20,h-b.h)};state.boxes.push(copy);select(copy.id);announce('Box duplicated');});
function remove(){if(!selected)return;checkpoint();state.boxes=state.boxes.filter(b=>b.id!==selected);select(null);announce('Box deleted');}
$('delete').addEventListener('click',remove);
function openText(){const b=state.boxes.find(x=>x.id===selected);if(!b)return;$('box-text').value=b.text;$('text-dialog').showModal();$('box-text').focus();}
$('edit-text').addEventListener('click',openText);
$('text-dialog').addEventListener('close',()=>{if($('text-dialog').returnValue==='save')change({text:$('box-text').value});});
$('help').addEventListener('click',()=>{render();$('help-dialog').showModal();});
$('preset').addEventListener('change',e=>{checkpoint();const old=sizes[state.preset],next=sizes[e.target.value];for(const b of state.boxes){b.x*=next[0]/old[0];b.w*=next[0]/old[0];b.y*=next[1]/old[1];b.h*=next[1]/old[1];}state.preset=e.target.value;select(null);fit();});
function undo(){if(!past.length)return;future.push(snapshot());state=JSON.parse(past.pop());select(null);}
function redo(){if(!future.length)return;past.push(snapshot());state=JSON.parse(future.pop());select(null);}
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}if(e.key==='Escape')select(null);if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}});
window.addEventListener('resize',()=>{if(view.auto)fit();});
render();fit();

