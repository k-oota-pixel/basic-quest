const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function app(mode='basic-grammar',saved={}){
 const nodes=new Map(),storage=new Map(Object.entries(saved)),timers=[];
 function element(){return {textContent:'',children:[],disabled:false,classList:{flags:new Set(),toggle(k,v){if(v)this.flags.add(k);else this.flags.delete(k)},contains(k){return this.flags.has(k)},add(k){this.flags.add(k)},remove(k){this.flags.delete(k)}},set innerHTML(v){this.children=[];this._html=v},get innerHTML(){return this.textContent||this._html||''},appendChild(v){this.children.push(v)},append(...v){this.children.push(...v)}}}
 const c={console,URL,URLSearchParams,location:{href:'https://example.com/?mode='+mode,search:'?mode='+mode},history:{replaceState(){}},document:{body:element(),createElement:element,querySelector:()=>element(),getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:fn=>timers.push(fn),window:{confirm:()=>true,matchMedia:()=>({matches:true})},alert:m=>{throw Error(m)}};
 vm.createContext(c);for(const f of ['grammar-data.js','basic-grammar-data.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
 const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const stages ='));
 vm.runInContext(script,c);
 return {c,run:s=>vm.runInContext(s,c),storage,nodes,timers};
}
test('12 units, all 204 questions and every supplied variant are playable',()=>{
 const a=app();assert.equal(a.nodes.get('stageGrid').children.length,12);
 assert.equal(a.run('basicGrammarStages.reduce((n,s)=>n+s.questions.length,0)'),204);
 a.run(`for(const s of basicGrammarStages)for(const q of s.questions)for(const en of q.variants){if(!tokenize(en).length||!answerMatches(q,tokenize(en)))throw Error(q.id);}`);
 assert.equal(a.run('tokenize("Is Mr. Shikama happy?").length'),3);
 assert.equal(a.run('answerMatches(basicGrammarStages[2].questions[5],tokenize("Yesterday I played baseball."))'),true);
 assert.equal(a.run('answerMatches(basicGrammarStages[0].questions[0],tokenize("I a am new teacher."))'),false);
});

test('grammar answers include give-up, ignore locked clicks and flush on save without basic coins',async()=>{
 const a=app(),events=[];let flushes=0;
 a.c.window.EnglishPlayroomCoins={getUserId:()=> 'learner',recordGrammarAnswer:(...args)=>events.push(args),flushGrammarAnswers:()=>flushes++};
 a.run('startStage(1);giveUp();giveUp();');assert.deepEqual(events,[['basic-grammar','1:0',false]]);
 a.run('continueAfterAnswer();selected=[];for(const t of tokenize(currentItem().q.en))selected.push(pieces.find(p=>canonical([p.text])===canonical([t])).id);checkAnswer();checkAnswer();');
 assert.equal(events.length,2);assert.equal(events[1][2],true);
 await a.run('saveAndExitGrammar()');assert.equal(flushes,1);
});
test('wrong answers retry, correct answers save/resume, existing modes stay separate',async()=>{
 const a=app();a.run('startStage(1);giveUp();');assert.equal(a.run('retryQueue.length'),1);
 a.run('continueAfterAnswer();selected=tokenize(currentItem().q.en).map(t=>pieces.find(p=>canonical([p.text])===canonical([t])&&(currentMode==="basic-grammar"||!selected.includes(p.id)))?.id);');
 // Use IDs in original token order, including repeated words.
 a.run('selected=[];for(const t of tokenize(currentItem().q.en)){selected.push(pieces.find(p=>canonical([p.text])===canonical([t])&&(currentMode==="basic-grammar"||!selected.includes(p.id))).id)}checkAnswer();');
 assert.equal(a.run('grammarSolved.has(1)'),true);
 await a.run('saveAndExitGrammar()');
 const b=app('basic-grammar',Object.fromEntries(a.storage));b.run('startStage(1)');assert.equal(b.run('currentQueue.length'),19);
 assert.equal(b.run('currentQueue.some(item=>item.index===1)'),false);
 b.run('setMode("grammar");startStage(1)');assert.equal(b.run('currentQueue.length'),15);
 b.run('setMode("basic");startStage(1)');assert.equal(b.run('currentQueue.length'),4);
 assert.equal(b.run('window.basicQuestBridge.getCompleted().length'),0);
});
test('all units finish; finished units can be practised again without basic rewards',()=>{
 const a=app();let coins=0;a.c.window.EnglishPlayroomCoins={awardBasic(){coins++}};
 a.run(`for(const s of basicGrammarStages){startStage(s.number);let guard=0;while(!document.getElementById('quizScreen').classList.contains('hidden')){if(++guard>30)throw Error('loop');selected=[];for(const t of tokenize(currentItem().q.en))selected.push(pieces.find(p=>canonical([p.text])===canonical([t])&&(currentMode==="basic-grammar"||!selected.includes(p.id))).id);checkAnswer();advanceQuestion();}}`);
 assert.equal(a.run('basicGrammarCompleted.size'),12);assert.equal(coins,0);
 a.run('startStage(1)');assert.equal(a.run('currentQueue.length'),20);
});
test('cloud merge retains newer progress and sanitizes invalid units/indices',()=>{
 const a=app();a.run('window.basicQuestBridge.mergeBasicGrammarProgress({1:{solved:[0,1,999],completed:false,updatedAt:20},13:{solved:[0]}})');
 assert.equal(a.run('window.basicQuestBridge.getBasicGrammarProgress()[1].solved.join(",")'),'0,1');
 a.run('window.basicQuestBridge.mergeBasicGrammarProgress({1:{solved:[2],completed:false,updatedAt:10}})');
 assert.equal(a.run('window.basicQuestBridge.getBasicGrammarProgress()[1].solved.join(",")'),'0,1');
 assert.equal(a.run('Object.keys(window.basicQuestBridge.getGrammarProgress()).length'),0);
 assert.match(html,/basicGrammarProgress:window.basicQuestBridge.getBasicGrammarProgress\(\)/);
});

test('shared unit bank stays visible, permits reuse, and removes only the clicked occurrence',()=>{
 const a=app();a.run('startStage(1)');const initial=a.nodes.get('bank').children.map(b=>b.textContent);
 const id=a.run('pieces.find(p=>p.text==="I").id');
 const button=a.nodes.get('bank').children.find(b=>b.textContent==='I');
 button.onclick();a.nodes.get('bank').children.find(b=>b.textContent==='I').onclick();
 assert.equal(a.run('selected.length'),2);assert.deepEqual(a.nodes.get('bank').children.map(b=>b.textContent),initial);
 a.nodes.get('answer').children[1].onclick();assert.equal(a.run('selected.length'),1);
 assert.equal(a.run('selected[0]'),id);
 a.run('advanceQuestion()');assert.deepEqual(a.nodes.get('bank').children.map(b=>b.textContent),initial);
});
test('unused bank words are allowed and both short and long variants can be answered',()=>{
 const a=app();a.run('startStage(4)');
 a.run('checkAnswer()');assert.equal(a.run('locked'),false);
 a.run('qIndex=5;loadQuestion();selected=tokenize("I have never been to Hawaii.").map(t=>pieces.find(p=>canonical([p.text])===canonical([t])).id);checkAnswer();');
 assert.equal(a.run('grammarSolved.has(5)'),true);
 assert.equal(a.nodes.get('feedback').textContent,'✓ Correct!');
 a.run('loadQuestion();selected=tokenize("I have never been to Hawaii before.").map(t=>pieces.find(p=>canonical([p.text])===canonical([t])).id);checkAnswer();');
 assert.equal(a.nodes.get('feedback').textContent,'✓ Correct!');
});
test('all registered answers can be built from each unit bank',()=>{
 const a=app();a.run('for(const stage of basicGrammarStages){const keys=new Set(sharedWordBank(stage).map(p=>canonical([p.text])));for(const q of stage.questions)for(const text of q.acceptedAnswers)for(const t of tokenize(text)){if(!keys.has(canonical([t])))throw Error(q.id+":"+t);}}');
});

