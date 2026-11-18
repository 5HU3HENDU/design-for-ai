export const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export function createBox(x,y){return{id:crypto.randomUUID(),x,y,w:0,h:0,shape:'rounded',colour:'#8e9fff',ink:'#182238',text:'',fontSize:24};}
export function roundedStyle(box){return{square:'0',rounded:Math.min(28,box.w/5,box.h/5)+'px',pill:Math.min(box.w,box.h)/2+'px',ellipse:'50%'}[box.shape]||'0';}
