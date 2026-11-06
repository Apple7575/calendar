import Constants from 'expo-constants';
import {Platform,UIManager} from 'react-native';
import type {ScreenTimeStatus} from './screenTime';
import {isScreenTimeInstalled} from './screenTime';
import type {SelfCheckProbe} from './selfCheck';
import {speechModuleCheck} from './stt';

/**
 * 빌드 자가 점검에 쓸 값을 모은다. 읽기만 한다: 권한을 묻지 않고, 네이티브 함수를 부르지 않고, 잠금·보상을 바꾸지 않는다.
 * 스크린 타임 상태는 RoutineProvider가 이미 받아 둔 값(native)을 그대로 쓴다.
 */
export function collectSelfCheckProbe(input:{checklistBuild:number;native:ScreenTimeStatus|null;ready:boolean;error:string|null}):SelfCheckProbe{
 const expoGo=Constants.appOwnership==='expo';
 let lottie:boolean|null=null;
 try{lottie=typeof UIManager.hasViewManagerConfig==='function'?UIManager.hasViewManagerConfig('LottieAnimationView'):null;}catch{lottie=null;}
 return {
  platform:Platform.OS,expoGo,
  installedBuild:Constants.platform?.ios?.buildNumber??null,
  checklistBuild:input.checklistBuild,
  speech:speechModuleCheck(),
  screenTime:{present:isScreenTimeInstalled(),authorized:input.native?input.native.authorized:null},
  lottie,
  records:{ready:input.ready,error:input.error},
 };
}
