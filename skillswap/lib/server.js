import { Client, Account, TablesDB, ID, Query } from 'node-appwrite';
const endpoint=process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project=process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const key=process.env.APPWRITE_API_KEY;
export const databaseId = process.env.APPWRITE_DATABASE_ID?.trim();

if (!databaseId) {
  throw new Error(
    "APPWRITE_DATABASE_ID is missing from .env.local"
  );
}
export const admin=new TablesDB(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
export { ID, Query };
export async function verify(jwt){
  if(!jwt) throw new Error('Sign in required');
  const client=new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt);
  return new Account(client).get();
}
export const tbl=(tableId)=>({databaseId,tableId});
export async function getProfile(user){
  try{return await admin.getRow({...tbl('profiles'),rowId:user.$id});}
  catch(e){if(e.code!==404)throw e;return null;}
}
