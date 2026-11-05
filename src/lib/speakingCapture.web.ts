/** Web preview only: there is no speech recognition here, so a sample answer types itself out. No microphone is used. */
import type {SpeakingLanguage} from './speakingTopics';
export type SpeakingStop='denied'|'silent'|'failed';
export const speakingCaptureAvailable=()=>true;
export const SPEAKING_SAMPLE=true;
const ANSWER='저는 AI가 코드를 빠르게 만들어 주는 시대일수록 개발자의 역할이 문제를 정의하는 쪽으로 옮겨 간다고 봅니다. 무엇을 만들어야 하는지, 왜 만들어야 하는지를 사용자와 동료의 말에서 찾아내는 일은 여전히 사람의 몫이라고 생각합니다. 또한 AI가 내놓은 결과가 요구 사항을 정말 만족하는지 검증하고, 장애가 났을 때 책임지고 원인을 추적하는 역할도 중요해집니다. 보안이나 개인정보처럼 한 번의 실수가 큰 피해로 이어지는 영역에서는 기준을 세우고 검토하는 사람이 반드시 필요합니다. 그래서 앞으로의 개발자는 구현 속도보다 판단의 품질로 평가받게 될 것입니다. 저는 이런 변화에 맞춰 도구를 적극적으로 쓰면서도, 결과를 설명할 수 있을 만큼 이해한 뒤에 배포하는 습관을 지키려고 합니다. 팀 안에서는 어떤 일을 AI에 맡기고 어떤 일을 사람이 확인할지 합의하는 데 앞장서고 싶습니다. 결국 기술은 바뀌어도 사용자에게 필요한 가치를 끝까지 책임지는 태도가 개발자의 핵심 역할로 남는다고 믿습니다.';
const FOLLOW_UP='네, 지난 프로젝트에서 요청받은 기능을 바로 만들지 않고 사용자가 실제로 겪는 불편을 먼저 인터뷰로 확인했습니다. 그 결과 화면을 새로 만드는 대신 기존 흐름의 단계 하나를 줄이는 것으로 문제를 풀 수 있었고, 일정도 절반으로 줄었습니다.';
const JAPANESE='私は週末によく近くの公園を散歩します。季節によって景色が変わるので、歩いているだけで気持ちが落ち着きます。最近は友だちと一緒にお弁当を持って行くこともあります。';
export async function startSpeakingCapture(kind:'answer'|'followUp',language:SpeakingLanguage,onText:(text:string)=>void,_onStopped:(reason:SpeakingStop)=>void):Promise<()=>Promise<string>>{
 const source=language==='ja-JP'?JAPANESE:kind==='answer'?ANSWER:FOLLOW_UP;let shown=0;
 const id=setInterval(()=>{shown=Math.min(source.length,shown+12);onText(source.slice(0,shown))},100);
 return async()=>{clearInterval(id);return source.slice(0,shown)};
}
