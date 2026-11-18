import { createBox, clamp, roundedStyle } from './geometry.js';
const $ = id => document.getElementById(id);
const canvas = $('canvas');
const sizes = { mobile: [390,844], laptop:[1440,900], square:[1080,1080] };
const labels = { mobile:'Mobile portrait', laptop:'Laptop landscape', square:'Square' };
const palette = ['#8e9fff','#f6b2bd','#f8d987','#9dd8c1','#27334a'];
let state = {preset:'mobile',boxes:[]}, selected = null, gesture = null, scale = 1;
let past = [], future = [], lastTap = {id:null,time:0};
const snapshot = () => JSON.stringify(state);
function checkpoint(){past.push(snapshot());if(past.length>70)past.shift();future=[];historyUI();}
function historyUI(){$('undo').disabled=!past.length;$('redo').disabled=!future.length;}
function announce(text){$('status').textContent=text;$('status').classList.add('visible');clearTimeout(announce.timer);announce.timer=setTimeout(()=>$('status').classList.remove('visible'),1600);}
function fit(){
 const [w,h]=sizes[state.preset];
 const maxW=Math.min(innerWidth-44,1120);
 const maxH=Math.max(240,innerHeight-(innerWidth<=700?340:390));
 scale=Math.min(maxW/w,maxH/h,1);
 const rw=w*scale,rh=h*scale;
 canvas.style.setProperty('--handle-size',(44/scale)+'px');canvas.style.setProperty('--handle-dot',(12/scale)+'px');
 canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.style.transform=`scale(${scale})`;
 $('canvas-wrap').style.width=rw+'px';$('canvas-wrap').style.height=rh+'px';
 $('workspace').style.setProperty('--render-width',rw+'px');
}
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
 $('hint').textContent=selected?'Drag to move · pull a corner to resize':'Drag to draw a box';
 syncInspector();fit();historyUI();
}
function syncInspector(){
 const b=state.boxes.find(b=>b.id===selected);$('inspector').hidden=!b;
 if(!b)return;
 $('colour').value=b.colour;$('ink').value=b.ink;$('font-size').value=b.fontSize;
 document.querySelectorAll('[data-shape]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.shape===b.shape)));
 document.querySelectorAll('.swatch').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.colour===b.colour)));
}
function select(id){selected=id;render();}
function point(e){const r=canvas.getBoundingClientRect();const [w,h]=sizes[state.preset];return{x:clamp((e.clientX-r.left)/scale,0,w),y:clamp((e.clientY-r.top)/scale,0,h)};}
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
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0||gesture)return;e.preventDefault();
 const p=point(e),target=e.target.closest('.box'),before=snapshot();
 if(target){selected=target.dataset.id;const b=state.boxes.find(x=>x.id===selected);gesture={pointerId:e.pointerId,mode:e.target.dataset.corner?'resize':'move',corner:e.target.dataset.corner,start:p,original:{...b},before,moved:false};}
 else {selected=null;const b=createBox(p.x,p.y);state.boxes.push(b);selected=b.id;gesture={pointerId:e.pointerId,mode:'draw',start:p,before,moved:false};}
 canvas.setPointerCapture(e.pointerId);render();
});
canvas.addEventListener('pointermove',e=>{
 if(!gesture||gesture.pointerId!==e.pointerId)return;
 const g=gesture,p=point(e),b=state.boxes.find(x=>x.id===selected);if(!b)return;
 const [w,h]=sizes[state.preset],dx=p.x-g.start.x,dy=p.y-g.start.y;
 if(Math.abs(dx)+Math.abs(dy)>4/scale)g.moved=true;
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
canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));
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
$('help').addEventListener('click',()=>$('help-dialog').showModal());
$('preset').addEventListener('change',e=>{checkpoint();const old=sizes[state.preset],next=sizes[e.target.value];for(const b of state.boxes){b.x*=next[0]/old[0];b.w*=next[0]/old[0];b.y*=next[1]/old[1];b.h*=next[1]/old[1];}state.preset=e.target.value;select(null);});
function undo(){if(!past.length)return;future.push(snapshot());state=JSON.parse(past.pop());select(null);}
function redo(){if(!future.length)return;past.push(snapshot());state=JSON.parse(future.pop());select(null);}
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}if(e.key==='Escape')select(null);if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#canvas,#inspector,.dock,dialog')&&selected)select(null);});
window.addEventListener('resize',fit);render();
