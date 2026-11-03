import data from '../../assets/concept-lab/sourceCorpus.json';
import type {Extraction,Concept,LabCard,ProblemBundle} from './conceptLabTypes';
export const sourceCorpus=data as unknown as {extractions:Extraction[];concepts:Concept[];cards:LabCard[];bundles:ProblemBundle[];coverage:Record<string,unknown>};
