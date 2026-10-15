from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8')

text = text.replace("animation:confetti-pop .9s cubic-bezier(.18,.75,.28,1) forwards", "animation:confetti-pop var(--dur,1.9s) cubic-bezier(.18,.75,.28,1) forwards", 1)
text = text.replace(".confetti-piece.left{left:18px}.confetti-piece.right{right:18px}", ".confetti-piece.left,.celebration-spark.left{left:18px}.confetti-piece.right,.celebration-spark.right{right:18px}\n.celebration-layer.grand .confetti-piece{filter:drop-shadow(0 2px 2px #8a651d44)}\n.celebration-spark{position:absolute;bottom:8px;color:#ffd75f;font-size:20px;font-weight:900;opacity:0;text-shadow:0 1px 5px #fff7c7;animation:celebration-spark var(--dur,2.8s) ease-out forwards}", 1)
text = text.replace("@keyframes confetti-pop{0%{opacity:0;transform:translate(0,0) rotate(0deg) scale(.8)}8%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(1)}}", "@keyframes confetti-pop{0%{opacity:0;transform:translate(0,0) rotate(0deg) scale(.8)}7%{opacity:1}72%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(1)}}\n@keyframes celebration-spark{0%{opacity:0;transform:translate(0,0) scale(.4) rotate(0deg)}10%{opacity:1}65%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.25) rotate(var(--rot))}}", 1)

start = text.find('function celebrateCorrect(){')
end = text.find('function checkAnswer(){', start)
if start < 0 or end < 0:
    raise SystemExit('celebration function anchor not found')
new_function = '''function celebrateCorrect(grand=false){
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const layer=document.createElement('div');layer.className='celebration-layer'+(grand?' grand':'');layer.setAttribute('aria-hidden','true');
  const colors=['#f0b83f','#2e9b79','#e56d73','#668de5','#9a6bd1','#f08b4b','#ffd86a'];
  const count=grand?42:24;
  const duration=grand?'2.8s':'1.9s';
  for(const side of ['left','right']){
    for(let i=0;i<count;i++){
      const piece=document.createElement('i');piece.className=`confetti-piece ${side}`;
      const outward=side==='left'?1:-1;
      const x=outward*(50+Math.random()*(grand?330:240)), y=-(110+Math.random()*(grand?440:320));
      piece.style.setProperty('--dx',`${x}px`);piece.style.setProperty('--dy',`${y}px`);piece.style.setProperty('--rot',`${(Math.random()*1100-550)}deg`);piece.style.setProperty('--c',colors[i%colors.length]);piece.style.setProperty('--dur',duration);piece.style.animationDelay=`${Math.random()*(grand?180:120)}ms`;
      piece.style.width=`${6+Math.random()*5}px`;piece.style.height=`${10+Math.random()*8}px`;
      layer.append(piece);
    }
    if(grand){
      for(let i=0;i<9;i++){
        const spark=document.createElement('b');spark.className=`celebration-spark ${side}`;spark.textContent=i%2?'✦':'★';
        const outward=side==='left'?1:-1;
        spark.style.setProperty('--dx',`${outward*(80+Math.random()*300)}px`);spark.style.setProperty('--dy',`${-(180+Math.random()*380)}px`);spark.style.setProperty('--rot',`${Math.random()*360-180}deg`);spark.style.setProperty('--dur','2.8s');spark.style.animationDelay=`${Math.random()*220}ms`;
        layer.append(spark);
      }
    }
  }
  document.body.append(layer);setTimeout(()=>layer.remove(),grand?3300:2300);
}

'''
text = text[:start] + new_function + text[end:]
old = 'fb.textContent="✓ Correct!";fb.className="feedback good";celebrateCorrect();'
new = 'fb.textContent="✓ Correct!";fb.className="feedback good";celebrateCorrect(qIndex===3);'
if old not in text:
    raise SystemExit('correct-answer call not found')
text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
