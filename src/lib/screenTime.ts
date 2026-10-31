import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type ScreenTimeStatus = {
  policyVersion?:number;supportsStudyUndo?:boolean;supportsOrderBonus?:boolean;supportsFreeStudyRewards?:boolean;supportsHandwritingRewards?:boolean;sleepLocked?:boolean;usingRewards?:boolean;focusUntil?:number;
  supported: boolean;
  authorized: boolean;
  day: string;
  enabled: boolean;
  selectedApps: number;
  selectedCategories: number;
  selectedWebsites: number;
  grantedMinutes: number;
  consumedMinutes: number;
  morningComplete: boolean;
  locked: boolean;
  lastEvent: string;
  lastEventAt: number;
  rewardMode?: boolean;
};

type NativeScreenTime = {
  getStatus(): Promise<ScreenTimeStatus | { supported: false }>;
  requestAuthorization(): Promise<void>;
  selectApps(): Promise<void>;
  enable(): Promise<void>;
  completeMorning(): Promise<void>;
  grantTestTime(): Promise<void>;
  disable(): Promise<void>;
  enableRoutineMode(): Promise<void>;
  startRewardUse():Promise<void>;pauseRewardUse():Promise<void>;setFocusWindow(until:number):Promise<void>;
  syncRewards(day: string, paid: Record<string, number>): Promise<void>;
  adjustStudyRewards(day:string,previous:Record<string,number>,target:Record<string,number>):Promise<void>;
};

const native = Platform.OS === "ios"
  ? requireOptionalNativeModule<NativeScreenTime>("RoutineScreenTime") : null;

export type ScreenTimeAction = Exclude<keyof NativeScreenTime, "getStatus" | "syncRewards" | "setFocusWindow" | "adjustStudyRewards">;

export function isScreenTimeInstalled(): boolean {
  return native !== null;
}

export async function getScreenTimeStatus(): Promise<ScreenTimeStatus | null> {
  if (!native) return null;
  const result = await native.getStatus();
  return result.supported ? result as ScreenTimeStatus : null;
}

export async function runScreenTimeAction(action: ScreenTimeAction): Promise<void> {
  if (!native) throw new Error("스크린타임 기능이 포함된 새 아이폰 빌드를 설치해 주세요.");
  if (typeof native[action] !== "function") throw new Error("이 기능이 포함된 새 아이폰 빌드를 설치해 주세요.");
  await native[action]();
}

let ledgerQueue:Promise<void>=Promise.resolve();
function ledgerOperation(action:()=>Promise<void>):Promise<void>{const next=ledgerQueue.catch(()=>{}).then(action);ledgerQueue=next;return next;}
export async function syncRoutineRewards(day: string, paid: Record<string, number>): Promise<void> {
  if (!native?.syncRewards) throw new Error("루틴 연결을 지원하는 새 아이폰 빌드가 필요해요.");
  await ledgerOperation(()=>native.syncRewards(day, paid));
}
export async function adjustStudyRewards(day:string,from:Record<string,number>,to:Record<string,number>):Promise<void>{
 if(!native?.adjustStudyRewards)throw new Error('보상까지 채점 취소하려면 새 아이폰 빌드가 필요해요.');
 await ledgerOperation(()=>native.adjustStudyRewards(day,from,to));
}

export async function syncFocusWindow(until:number):Promise<void>{
 if(!native?.setFocusWindow)throw new Error('공부 잠금을 지원하는 새 빌드가 필요해요.');
 await native.setFocusWindow(until);
}
