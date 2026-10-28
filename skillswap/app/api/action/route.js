import { NextResponse } from 'next/server';
import { admin,verify,getProfile,tbl,ID,Query } from '../../../lib/server';
export const runtime='nodejs';
const fail=(message,status=400)=>NextResponse.json({error:message},{status});
const clean=(v,max=200)=>String(v||'').trim().slice(0,max);
async function rows(tableId,queries=[]){return (await admin.listRows({...tbl(tableId),queries:[...queries,Query.limit(100)]})).rows;}
async function transact(operations){
  const tx=await admin.createTransaction();
  try {await admin.createOperations({transactionId:tx.$id,operations});await admin.updateTransaction({transactionId:tx.$id,commit:true});}
  catch(e){try{await admin.updateTransaction({transactionId:tx.$id,rollback:true});}catch{}throw e;}
}
const op=(action,tableId,rowId,data)=>({action,...tbl(tableId),rowId,data});
export async function POST(request){
  try{
    const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    const user=await verify(token);
    const body=await request.json();
    const action=body.action;
    let me=await getProfile(user);
    if(action==='bootstrap'){
      if(!me){
        try{await admin.createRow({...tbl('profiles'),rowId:user.$id,data:{name:clean(user.name||user.email.split('@')[0],80),credits:2,joinedAt:new Date().toISOString()}})}
        catch(e){if(e.code!==409) throw e;}
      }
      me=await getProfile(user);
    }
    if(!me)return fail('Please refresh to initialize your profile');
    if(action==='dashboard'){
      const [profiles,skills,requests]=await Promise.all([rows('profiles'),rows('skills',[Query.equal('active',true)]),rows('requests')]);
      return NextResponse.json({me,profiles:profiles.map(p=>({$id:p.$id,name:p.name,credits:p.$id===user.$id?p.credits:undefined})),skills,requests:requests.filter(r=>r.providerId===user.$id||r.learnerId===user.$id)});
    }
    if(action==='bootstrap')return NextResponse.json({me});
    if(action==='createSkill'){
      const title=clean(body.title,100),description=clean(body.description,500),category=clean(body.category,40);
      if(title.length<4||description.length<12||!category)return fail('Enter a title, category, and meaningful description');
      await admin.createRow({...tbl('skills'),rowId:ID.unique(),data:{ownerId:user.$id,title,description,category,active:true}});
      return NextResponse.json({ok:true});
    }
    if(action==='request'){
      const skill=await admin.getRow({...tbl('skills'),rowId:clean(body.skillId,36)});
      if(!skill.active||skill.ownerId===user.$id)return fail('Choose another member’s active skill');
      if(me.credits<1)return fail('You need at least one time credit');
      const existing=await rows('requests',[Query.equal('skillId',skill.$id),Query.equal('learnerId',user.$id),Query.equal('status',['pending','accepted','delivered'])]);
      if(existing.length)return fail('You already have an open request for this skill');
      await admin.createRow({...tbl('requests'),rowId:ID.unique(),data:{skillId:skill.$id,skillTitle:skill.title,providerId:skill.ownerId,learnerId:user.$id,status:'pending',message:clean(body.message,240)||'I would like to learn this skill.',createdAt:new Date().toISOString()}});
      return NextResponse.json({ok:true});
    }
    if(['accept','reject','deliver','confirm','cancel'].includes(action)){
      const requestRow=await admin.getRow({...tbl('requests'),rowId:clean(body.requestId,36)});
      const provider=requestRow.providerId===user.$id,learner=requestRow.learnerId===user.$id;
      if(!provider&&!learner)return fail('Not your request',403);
      let next;
      if(action==='accept'&&provider&&requestRow.status==='pending')next='accepted';
      if(action==='reject'&&provider&&requestRow.status==='pending')next='rejected';
      if(action==='cancel'&&learner&&['pending','accepted'].includes(requestRow.status))next='cancelled';
      if(action==='deliver'&&provider&&requestRow.status==='accepted')next='delivered';
      if(action==='confirm'&&learner&&requestRow.status==='delivered')next='completed';
      if(!next)return fail('Action is not permitted at this stage');
      if(action==='confirm'){
        const learnerProfile=await admin.getRow({...tbl('profiles'),rowId:requestRow.learnerId});
        if(learnerProfile.credits<1)return fail('Not enough credits; request remains pending confirmation');
        await transact([
          op('decrement','profiles',requestRow.learnerId,{column:'credits',value:1,min:0}),
          op('increment','profiles',requestRow.providerId,{column:'credits',value:1}),
          op('update','requests',requestRow.$id,{status:'completed'}),
          op('create','ledger',ID.unique(),{fromId:requestRow.learnerId,toId:requestRow.providerId,requestId:requestRow.$id,amount:1,createdAt:new Date().toISOString()})
        ]);
      }else{
        await admin.updateRow({...tbl('requests'),rowId:requestRow.$id,data:{status:next}});
      }
      return NextResponse.json({ok:true});
    }
    return fail('Unknown action');
  }catch(error){
    console.error(error);
    if(error.code===401)return fail('Session expired. Please sign in again.',401);
    if(error.code===409)return fail('This action conflicts with a recent change. Refresh and try again.',409);
    return fail(error.message||'Unexpected server error',500);
  }
}
