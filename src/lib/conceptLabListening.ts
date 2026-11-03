import manifest from '../../assets/concept-lab/listening.json';
import corpus from '../../assets/concept-lab/corpusListening.json';
export const listeningAssets:Record<string,{id:string;origin:string;model:string;seconds:number;sha256:string;review:string}>={...manifest,...corpus};
