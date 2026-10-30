const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('a finished stage records learning even when no coin is earned',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');const fn=source.slice(source.indexOf('function finishStage(){'),source.indexOf('function goHome(){'));
 let learned=0,coins=0;const completed=new Set();const context={currentMode:'basic',isSectionMode:()=>false,currentCompleted:()=>completed,titleBasicEvent(){},completed,currentStage:{number:1,word:'test',questions:[{}]},initialCorrect:0,localStorage:{setItem(){}},renderStages(){},document:{getElementById:()=>({})},celebrateCorrect(){},show(){},window:{basicQuestCloud:{recordStage(){}},EnglishPlayroomCoins:{recordLearningActivity:()=>learned++,awardBasic:()=>coins++}}};
 vm.runInNewContext(fn+';finishStage();',context);assert.equal(learned,1);assert.equal(coins,0);
});
