/**
 * 빌드 확인표의 "앱이 스스로 확인한 칸". 사람이 눌러 보기 전에, 설치된 바이너리에 네이티브 부품이 실제로 들어갔는지 본다.
 * 근거: 음성 인식 모듈이 최소 iOS 차이로 빌드 48~50에서 조용히 빠졌고(1106-11), 빌드 51은 없는 함수를 불렀다(1106-14).
 * 이 파일은 판정만 한다. 값을 모으는 일(selfCheckProbe.ts)은 읽기만 하고 권한 요청·잠금 같은 부작용을 일으키지 않는다.
 */
export type SelfCheckProbe={
 platform:string;expoGo:boolean;
 /** Info.plist CFBundleVersion. Expo Go와 웹에서는 null. */
 installedBuild:string|null;checklistBuild:number;
 speech:{present:boolean;missing:string[]};
 screenTime:{present:boolean;authorized:boolean|null};
 /** 네이티브 Lottie 뷰가 등록됐는지. 알 수 없으면 null. */
 lottie:boolean|null;
 records:{ready:boolean;error:string|null};
};
export type SelfCheckState='ok'|'fail'|'wait'|'skip';
export type SelfCheckResult={id:'build'|'records'|'speech'|'screenTime'|'lottie';title:string;state:SelfCheckState;detail:string};

export function evaluateSelfCheck(p:SelfCheckProbe):SelfCheckResult[]{
 const nativeApp=p.platform==='ios'&&!p.expoGo;
 const skip=p.platform==='web'?'웹 미리보기에서는 확인하지 않아요.':p.expoGo?'Expo Go에서는 확인하지 않아요.':'아이폰 빌드에서만 확인해요.';
 const out:SelfCheckResult[]=[];
 const installed=Number(p.installedBuild);
 out.push(!nativeApp?{id:'build',title:'설치된 빌드 번호',state:'skip',detail:skip}
  :!p.installedBuild||!Number.isFinite(installed)?{id:'build',title:'설치된 빌드 번호',state:'fail',detail:'빌드 번호를 읽지 못했어요.'}
  :installed<p.checklistBuild?{id:'build',title:'설치된 빌드 번호',state:'fail',detail:`설치된 앱은 빌드 ${installed}인데 확인표는 빌드 ${p.checklistBuild}용이에요. 새 빌드가 깔렸는지 확인해 주세요.`}
  :{id:'build',title:'설치된 빌드 번호',state:'ok',detail:installed===p.checklistBuild?`빌드 ${installed}`:`빌드 ${installed} (확인표는 빌드 ${p.checklistBuild}까지 있어요)`});
 out.push(p.records.error&&!p.records.ready?{id:'records',title:'저장된 기록 불러오기',state:'fail',detail:`불러오지 못했어요: ${p.records.error}`}
  :!p.records.ready?{id:'records',title:'저장된 기록 불러오기',state:'wait',detail:'불러오는 중이에요.'}
  :{id:'records',title:'저장된 기록 불러오기',state:'ok',detail:'불러왔어요.'});
 out.push(!nativeApp?{id:'speech',title:'음성 인식 모듈',state:'skip',detail:skip}
  :!p.speech.present?{id:'speech',title:'음성 인식 모듈',state:'fail',detail:'빌드에서 빠져 있어요. 말하기와 일기 음성 입력이 동작하지 않아요.'}
  :p.speech.missing.length?{id:'speech',title:'음성 인식 모듈',state:'fail',detail:`모듈은 있지만 앱이 부르는 함수가 없어요: ${p.speech.missing.join(', ')}`}
  :{id:'speech',title:'음성 인식 모듈',state:'ok',detail:'들어 있어요.'});
 out.push(!nativeApp?{id:'screenTime',title:'스크린 타임 모듈',state:'skip',detail:skip}
  :!p.screenTime.present?{id:'screenTime',title:'스크린 타임 모듈',state:'fail',detail:'빌드에서 빠져 있어요. 앱 제한과 보상이 동작하지 않아요.'}
  :{id:'screenTime',title:'스크린 타임 모듈',state:'ok',detail:p.screenTime.authorized===false?'들어 있어요. 스크린 타임 권한은 아직 허용되지 않았어요.':'들어 있어요.'});
 out.push(!nativeApp?{id:'lottie',title:'캐릭터 애니메이션 엔진',state:'skip',detail:skip}
  :p.lottie===null?{id:'lottie',title:'캐릭터 애니메이션 엔진',state:'wait',detail:'확인할 수 없었어요.'}
  :p.lottie?{id:'lottie',title:'캐릭터 애니메이션 엔진',state:'ok',detail:'들어 있어요.'}
  :{id:'lottie',title:'캐릭터 애니메이션 엔진',state:'fail',detail:'빌드에서 빠져 있어요. 동물 친구가 움직이지 않아요.'});
 return out;
}

const MARK:Record<SelfCheckState,string>={ok:'✓',fail:'✗',wait:'…',skip:'–'};
/** PM에게 보낼 글에 넣는 줄. 첫 줄은 합계. */
export function selfCheckLines(results:SelfCheckResult[]):string[]{
 const n=(s:SelfCheckState)=>results.filter(r=>r.state===s).length;
 return [`자동 확인: 됨 ${n('ok')} · 안 됨 ${n('fail')}`,...results.map(r=>`${MARK[r.state]} ${r.title} — ${r.detail}`)];
}
