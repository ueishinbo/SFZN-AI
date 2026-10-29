import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
const prefix = 'comac-task-product-v2:'
export function readProductState<T>(key:string,fallback:T):T {
 try { const value=localStorage.getItem(prefix+key);return value?JSON.parse(value) as T:fallback }catch{return fallback}
}
export function writeProductState<T>(key:string,value:T) {
 try {localStorage.setItem(prefix+key,JSON.stringify(value));return true}catch{return false}
}
export function useProductState<T>(key:string,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>] {
 const [value,setValue]=useState<T>(()=>readProductState(key,typeof initial==='function'?(initial as ()=>T)():initial))
 useEffect(()=>{writeProductState(key,value)},[key,value])
 return [value,setValue]
}
