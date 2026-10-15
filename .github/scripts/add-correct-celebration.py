from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
text=p.read_text(encoding='utf-8')
css='''
/* Correct-answer celebration: quick confetti from both bottom corners. */
.celebration-layer{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999}
.confetti-piece{position:absolute;bottom:-18px;width:8px;height:14px;border-radius:2px;background:var(--c);opacity:0;transform:translate(0,0) rotate(0deg);animation:confetti-pop .9s cubic-bezier(.18,.75,.28,1) forwards}
.confetti-piece.left{left:18px}.confetti-piece.right{right:18px}
@keyframes confetti-pop{0%{opacity:0;transform:translate(0,0) rotate(0deg) scale(.8)}8%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(1)}}
@media(prefers-reduced-motion:reduce){.celebration-layer{display:none}}
'''
if '.celebration-layer{' not in text:
    text=text.replace('\n</style>', '\n'+css+'\n</style>', 1)

js='''
function celebrateCorrect(){
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const layer=document.createElement('div');layer.className='celebration-layer';layer.setAttribute('aria-hidden','true');
  const colors=['#f0b83f','#2e9b79','#e56d73','#668de5','#9a6bd1','#f08b4b'];
  for(const side of ['left','right']){
    for(let i=0;i<22;i++){
      const piece=document.createElement('i');piece.className=`confetti-piece ${side}`;
      const outward=side==='left'?1:-1;
      const x=outward*(55+Math.random()*210), y=-(95+Math.random()*270);
      piece.style.setProperty('--dx',`${x}px`);piece.style.setProperty('--dy',`${y}px`);piece.style.setProperty('--rot',`${(Math.random()*900-450)}deg`);piece.style.setProperty('--c',colors[i%colors.length]);piece.style.animationDelay=`${Math.random()*90}ms`;
      layer.append(piece);
    }
  }
  document.body.append(layer);setTimeout(()=>layer.remove(),1150);
}
'''
if 'function celebrateCorrect()' not in text:
    anchor='function checkAnswer(){'
    if anchor not in text: raise SystemExit('JS insertion anchor not found')
    text=text.replace(anchor, js+'\n'+anchor, 1)

old='fb.textContent="✓ Correct!";fb.className="feedback good";'
new='fb.textContent="✓ Correct!";fb.className="feedback good";celebrateCorrect();'
if old in text:
    text=text.replace(old,new,1)
elif new not in text:
    raise SystemExit('Correct-answer anchor not found')

p.write_text(text,encoding='utf-8')

scripts=re.findall(r'<script(?:\s+type="module")?>(.*?)</script>', text, flags=re.S)
for body in scripts:
    suffix='.mjs' if 'import {' in body else '.js'
    with tempfile.NamedTemporaryFile('w',suffix=suffix,delete=False,encoding='utf-8') as f:
        f.write(body); name=f.name
    subprocess.run(['node','--check',name],check=True)
print('Added bottom-corner correct-answer confetti to Basic Quest.')
