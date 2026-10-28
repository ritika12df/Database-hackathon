"use client";
import { Client, Account, ID } from "appwrite";
const client = new Client().setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1").setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "");
export const account = new Account(client);
export { ID };
export async function api(action, payload={}) {
  const {jwt} = await account.createJWT();
  const response = await fetch('/api/action', {method:'POST', headers:{'content-type':'application/json',authorization:`Bearer ${jwt}`},body:JSON.stringify({action,...payload})});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
