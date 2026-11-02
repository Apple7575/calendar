const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'../assets/animals/runtime'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const characters=manifest.map(c=>c.id),actions=Object.keys(manifest[0].actions);
const out=["// Generated from the supplied manifest. Run node scripts/generate-animal-registry.cjs.",
 "import manifest from '../../../assets/animals/runtime/manifest.json';",
 'export type AnimalCharacterId='+characters.map(JSON.stringify).join('|')+';',
 'export type AnimalActionId='+actions.map(JSON.stringify).join('|')+';',
 'export type AnimalClip={slug:string;name:string;frames:number;loop:boolean;duration_seconds:number;json:string;poster_frame:number;bytes:number;bitmap_assets:number};',
 'export const animalCharacters=manifest as {id:AnimalCharacterId;name:string;actions:Record<AnimalActionId,AnimalClip>}[];',
 'const loaders={'];
for(const c of manifest){out.push(c.id+':{');for(const[id,a]of Object.entries(c.actions)){if(!/^(C0[1-4])\/A\d\d_[a-z_]+\.json$/.test(a.json))throw Error('Invalid JSON path');out.push(id+":()=>require('../../../assets/animals/runtime/"+a.json+"'),");}out.push('},');}
out.push('};','export const loadAnimalClip=(character:AnimalCharacterId,action:AnimalActionId)=>loaders[character][action]();','export const animalClip=(character:AnimalCharacterId,action:AnimalActionId)=>animalCharacters.find(c=>c.id===character)!.actions[action];','export const sharedClips={');
for(const file of fs.readdirSync(path.join(root,'shared')).filter(f=>f.endsWith('.json')))out.push(JSON.stringify(file.slice(0,-5))+":()=>require('../../../assets/animals/runtime/shared/"+file+"'),");
out.push('};','export type SharedClipId=keyof typeof sharedClips;');
fs.writeFileSync(path.join(__dirname,'../src/features/routine/animalAssets.ts'),out.join('\n')+'\n');
console.log('Generated',characters.length,'characters,',characters.length*actions.length,'lazy JSON loaders');
