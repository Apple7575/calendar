import {useEffect,useState} from 'react';

/** Time to read a question and choose. Left alone it closes, so a stray press later cannot cost money. */
const QUESTION_MS=10000,PLAIN_MS=5000;

/**
 * The step before anything that ends a run for a penalty: the first press asks, the second goes. With no penalty the
 * press goes straight through and nothing is asked. `ask` gives the question to show, or null over the daily limit.
 */
export function useQuitConfirm(penalty:string,ask?:()=>string|null){
 const [open,setOpen]=useState(false),[question,setQuestion]=useState<string|null>(null);
 useEffect(()=>{if(!open)return;const id=setTimeout(()=>setOpen(false),question?QUESTION_MS:PLAIN_MS);return()=>clearTimeout(id)},[open,question]);
 useEffect(()=>{if(!penalty)setOpen(false)},[penalty]);
 const asking=open&&!!penalty;
 const press=(go:()=>void)=>{if(penalty&&!open){setQuestion(ask?.()??null);setOpen(true);return}setOpen(false);go()};
 return {open:asking,question:asking?question:null,press,stay:()=>setOpen(false)};
}
