import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const n2Root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../output/vocabulary/n2-20261102');
fs.mkdirSync(n2Root,{recursive:true});
const ledger=path.join(n2Root,'cost-ledger.jsonl');
const append=row=>fs.appendFileSync(ledger,JSON.stringify({at:new Date().toISOString(),...row})+'\n');
export function costs(){
 const rows=fs.existsSync(ledger)?fs.readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 const done=new Map(rows.filter(r=>r.type==='finished').map(r=>[r.id,r]));
 let reserved=0,estimated=0,text=0;
 for(const r of rows.filter(r=>r.type==='started')){
  const final=done.get(r.id),value=final?.estimatedUSD??r.reservedUSD;
  estimated+=value;if(!final)reserved+=value;if(r.kind==='text')text+=value;
 }
 return {estimatedUSD:estimated,reservedUSD:reserved,textUSD:text,actualBillVerified:false,approvedLimitUSD:15,operatingLimitUSD:12};
}
export function reserveRequest(kind,reservedUSD,metadata={}){
 const intake=JSON.parse(fs.readFileSync(path.join(n2Root,'intake.json'),'utf8'));
 if(intake.paidApiBudget?.approvedUSD!==15)throw Error('N2 budget approval is not recorded.');
 const current=costs();
 if(current.estimatedUSD+reservedUSD>12)throw Error('N2 cost guard: reserving remaining $3 for estimate uncertainty.');
 if(kind==='text'&&current.textUSD+reservedUSD>4)throw Error('N2 text/review-stage $4 limit reached.');
 const id=crypto.randomUUID();append({type:'started',id,kind,reservedUSD,...metadata});return id;
}
export const reserveTextRequest=metadata=>reserveRequest('text',.04,metadata);
export function finishTextRequest(id,usage,model='gpt-4.1-mini'){
 if(!usage)return;
 const full=model.startsWith('gpt-4.1')&&!model.includes('mini');
 const estimatedUSD=(usage.input_tokens??0)*(full?2:.4)/1e6+(usage.output_tokens??0)*(full?8:1.6)/1e6;
 append({type:'finished',id,estimatedUSD,usage,method:model+' input/output token estimate'});
}
export function finishRequest(id,estimatedUSD,metadata={}){append({type:'finished',id,estimatedUSD,...metadata});}
