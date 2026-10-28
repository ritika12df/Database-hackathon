import fs from 'node:fs';
import { Client,TablesDB } from 'node-appwrite';
const envFile=fs.existsSync('.env.local')?fs.readFileSync('.env.local','utf8'):'';
for(const l of envFile.split(/\r?\n/)){const ix=l.indexOf('=');if(ix>0&&!l.startsWith('#'))process.env[l.slice(0,ix).trim()]=l.slice(ix+1).trim();}
const {NEXT_PUBLIC_APPWRITE_ENDPOINT:endpoint,NEXT_PUBLIC_APPWRITE_PROJECT_ID:project,APPWRITE_API_KEY:key}=process.env;
if(!endpoint||!project||!key)throw new Error('Set variables in .env.local first');
const db=process.env.APPWRITE_DATABASE_ID||'skillswap';
const tables=new TablesDB(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
async function ensure(label,fn){try{const r=await fn();console.log('Created',label);return r}catch(e){if(e.code===409){console.log('Already exists:',label);return}throw e}}
await ensure('database',()=>tables.create({databaseId:db,name:'SkillSwap'}));
const definitions={
profiles:[['name','string',80],['credits','integer'],['joinedAt','string',40]],
skills:[['ownerId','string',36],['title','string',100],['description','string',500],['category','string',40],['active','boolean']],
requests:[['skillId','string',36],['skillTitle','string',100],['providerId','string',36],['learnerId','string',36],['status','string',25],['message','string',240],['createdAt','string',40]],
ledger:[['fromId','string',36],['toId','string',36],['requestId','string',36],['amount','integer'],['createdAt','string',40]]};
for(const [tableId,columns] of Object.entries(definitions)){
 await ensure(tableId,()=>tables.createTable({databaseId:db,tableId,name:tableId,rowSecurity:true}));
 for(const [key,type,size] of columns){
   await ensure(`${tableId}.${key}`,()=>type==='string'?tables.createVarcharColumn({databaseId:db,tableId,key,size,required:true}):type==='integer'?tables.createIntegerColumn({databaseId:db,tableId,key,required:true}):tables.createBooleanColumn({databaseId:db,tableId,key,required:true}));
 }
}
console.log('\nDone. Wait for all columns to show Available in Appwrite Console before launching.');
