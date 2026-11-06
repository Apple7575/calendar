import {priorityGate,reconcilePriorityPlans} from '../../lib/priorityPlan';
import {syncPriorityGate} from '../../lib/screenTime';
import {handwritingAccess,settleHandwritingRewards} from '../../lib/handwriting';
﻿import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { mergePlayLog } from "../../lib/playLog";
import { getScreenTimeStatus, ScreenTimeStatus, syncRoutineRewards,syncFocusWindow,adjustStudyRewards } from "../../lib/screenTime";
import { studyLedger,undoStudyAnswer,validateStudyState } from '../../lib/studyHistory';
import { emptyData, getDay, reconcileStudyExclusions, RoutineData, routineDay } from "../../lib/routineModel";
import { migrateDailyPlan } from "../../lib/dailyPlan";
import { reconcileAdditionalRewards } from "../../lib/studyRewards";
import { receiveLearningSummaries } from "../../lib/learningCloud";
import { mergeLearningSummaries } from "../../lib/learningSummary";
import { settleBookTimer } from "../../lib/bookStudy";
import { receiveDecks } from "../../lib/deckCloud";
import { advanceBoriGrowth } from "../../lib/boriGrowth";
import { isCloudAccount,latestRoutineBackup,uploadRoutineBackup } from "../../lib/routineBackup";
import { migrateN3Deck, mergeStudyDeck } from "../../lib/n3Deck";
import {advanceHabitOrder,initializeHabitOrder} from '../../lib/habitOrder';
import {wordDailyCap} from '../../lib/studyRewards';
import {reconcileMoneyRewards} from '../../lib/moneyRewards';
import {reconcileEmergency} from '../../lib/emergencyUnlock';
import {reconcileCommitments} from '../../lib/commitments';
import {focusLockUntil,penaltyMinutesOnDay,rewardSyncExtras} from '../../lib/focusPenalty';
import {breakAlarmAt,syncBreakAlarm} from '../../lib/breakAlarm';
import {streakWidgetPayload} from '../../lib/streakWidget';
import {writeStreakWidget} from '../../lib/streakWidgetStorage';
import {appIconSlot} from '../../lib/appIcon';
import {syncAppIcon} from '../../lib/appIconSync';

type Value = {
  accountId?:string;data: RoutineData; ready: boolean; error: string | null; dayKey: string; now: Date;
  native: ScreenTimeStatus | null; refreshNative: () => Promise<void>;
  syncingDecks: boolean; deckError: string | null; syncDecks: () => Promise<number>;
  backupState: {busy:boolean;lastAt:string|null;error:string|null}; backupNow:()=>Promise<void>; restoreBackup:()=>Promise<void>;
  update: (fn: (current: RoutineData) => RoutineData) => Promise<void>;
  undoStudy:()=>Promise<void>;retryStudyAdjustment:()=>void;
};
const Context = createContext<Value | null>(null);
export function RoutineProvider({ userId, children,initialData,cloudUserId }: { userId?: string; children: ReactNode;initialData?:RoutineData;cloudUserId?:string }) {
  const [data, setData] = useState<RoutineData>(emptyData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [native, setNative] = useState<ScreenTimeStatus | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [syncingDecks, setSyncingDecks] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [adjustmentAttempt,setAdjustmentAttempt]=useState(0);
  const [backupState,setBackupState]=useState<{busy:boolean;lastAt:string|null;error:string|null}>({busy:false,lastAt:null,error:null});
  const backupBusy=useRef(false),lastBackedUp=useRef<RoutineData|null>(null),identity=useRef(userId);identity.current=userId;
  const cloudChecked=useRef(false);
  const loadedIdentity=useRef<string|undefined>(undefined);
  const receiving = useRef(false);
  const current = useRef(data);
  const alive = useRef(true);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const key = `routine.v1.${userId ?? "signed-out"}`;
  const expectedDay = routineDay(now);
  const refreshNative = useCallback(async () => {
    try { const status = await getScreenTimeStatus(); if (alive.current) setNative(status); }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "앱 제한 상태를 확인하지 못했어요."); }
  }, []);
  useEffect(() => {
    alive.current = true;let live=true;cloudChecked.current=false;loadedIdentity.current=undefined;lastBackedUp.current=null;setReady(false);setError(null);setBackupState({busy:false,lastAt:null,error:null});
    AsyncStorage.getItem(key).then(async raw => {
      if (!alive.current) return;
      let recovered=null;
      if(!raw&&isCloudAccount(userId)){try{recovered=await latestRoutineBackup(userId!);if(live)cloudChecked.current=true;}catch(e){if(live)setBackupState({busy:false,lastAt:null,error:e instanceof Error?e.message:"백업을 확인하지 못했어요."});}}
      else cloudChecked.current=true;
      if(!live)return;
      const saved = recovered?.data ?? (raw ? JSON.parse(raw) as RoutineData : initialData ?? emptyData());
      if (saved.version !== 1 || !Array.isArray(saved.words) || !saved.days || !Array.isArray(saved.decks)) throw new Error("저장된 루틴 데이터 형식을 확인해 주세요.");
      validateStudyState(saved);
      const migrated = migrateN3Deck(saved);
      if (migrated !== saved && raw && !await AsyncStorage.getItem(`${key}.backup.n3-unified.v1`)) {
        await AsyncStorage.setItem(`${key}.backup.n3-unified.v1`, raw);
      }
      const grown = initializeHabitOrder(reconcileStudyExclusions(reconcileAdditionalRewards(settleBookTimer(migrateDailyPlan(advanceBoriGrowth(migrated, routineDay()))),routineDay()),routineDay()),routineDay());
      if (recovered||grown !== saved) await AsyncStorage.setItem(key, JSON.stringify(grown));
      if (!alive.current||!live) return;
      if(recovered){lastBackedUp.current=grown;setBackupState({busy:false,lastAt:recovered.createdAt,error:null});}
      loadedIdentity.current=userId;current.current = grown; setData(grown); setReady(true);
    }).catch(e => { if (alive.current) setError(e instanceof Error ? e.message : "저장한 데이터를 읽지 못했어요."); });
    const tick = () => { setNow(new Date()); void refreshNative(); };
    tick();
    const timer = setInterval(() => { if (AppState.currentState === "active") tick(); }, 15000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") tick(); });
    return () => {live=false; alive.current = false; clearInterval(timer); listener.remove(); };
  }, [key, refreshNative,initialData]);
  const update = useCallback((fn: (current: RoutineData) => RoutineData) => {
    const operation = queue.current.catch(() => {}).then(async () => {
      if (!userId || identity.current!==userId || loadedIdentity.current!==userId || !alive.current || !ready) throw new Error("데이터를 불러온 뒤 다시 시도해 주세요.");
      if (routineDay() !== expectedDay) {
        setNow(new Date());
        throw new Error("새 하루가 시작됐어요. 화면을 확인하고 다시 시도해 주세요.");
      }
      const before=initializeHabitOrder(reconcileStudyExclusions(reconcileAdditionalRewards(current.current,expectedDay),expectedDay),expectedDay);
      const next = reconcileMoneyRewards(before,advanceBoriGrowth(advanceHabitOrder(before,reconcileStudyExclusions(reconcileAdditionalRewards(reconcilePriorityPlans(settleHandwritingRewards(fn(before)),expectedDay),expectedDay),expectedDay),expectedDay), expectedDay),expectedDay);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      if (alive.current&&identity.current===userId) { current.current = next; setData(next); setError(null); }
    });
    queue.current = operation;
    return operation;
  }, [key, userId, ready, expectedDay]);
  useEffect(()=>{
    if(!ready)return;
    if(reconcilePriorityPlans(data,expectedDay)!==data){void update(s=>s).catch(()=>{});return;}
    const subjects=[...new Set((data.handwritingReceipts??[]).filter(r=>r.rewardStatus==='pending').map(r=>r.subject))];
    if(subjects.some(subject=>handwritingAccess(data,subject).ready))void update(s=>s).catch(()=>{});
  },[ready,now,data.handwritingReceipts,data.bookTimer,data.bookSessions,update]);
  // Copies closed play stretches from the phone so they reach backups. Unchanged status writes nothing.
  useEffect(()=>{
    if(!ready||!native||mergePlayLog(current.current,native)===current.current)return;
    void update(s=>mergePlayLog(s,native)).catch(()=>{});
  },[ready,native,update]);
  const undoStudy=useCallback(async()=>{
    await update(s=>{
      const next=undoStudyAnswer(s,expectedDay),from=studyLedger(getDay(s,expectedDay)),to=studyLedger(getDay(next,expectedDay));
      if(!native?.supportsOrderBonus){delete from.order;delete to.order;}
      if(JSON.stringify(from)!==JSON.stringify(to)&&native?.enabled&&native.rewardMode){
        if(!native.supportsStudyUndo)throw new Error('보상까지 되돌리려면 채점 취소를 지원하는 새 아이폰 빌드가 필요해요.');
        return {...next,pendingStudyAdjustment:{eventId:s.studyUndo!.eventId,day:expectedDay,from,to}};
      }
      return next;
    });
  },[update,expectedDay,native?.enabled,native?.rewardMode,native?.supportsStudyUndo,native?.supportsOrderBonus]);
  const backupNow=useCallback(async()=>{
    if(!isCloudAccount(userId))throw new Error('실제 앱 계정으로 로그인하면 백업할 수 있어요.');
    if(!ready||backupBusy.current)return;
    backupBusy.current=true;setBackupState(s=>({...s,busy:true,error:null}));const snapshot=current.current;
    try{
      if(!cloudChecked.current){const previous=await latestRoutineBackup(userId!);if(previous)throw new Error('기존 백업이 있어요. 먼저 백업 복구로 확인해 주세요.');cloudChecked.current=true;}
      const at=await uploadRoutineBackup(snapshot,userId!);if(identity.current===userId){lastBackedUp.current=snapshot;setBackupState({busy:false,lastAt:at,error:null});}}
    catch(e){if(identity.current===userId)setBackupState(s=>({...s,busy:false,error:e instanceof Error?e.message:'백업 실패'}));throw e;}
    finally{backupBusy.current=false;}
  },[userId,ready]);
  const restoreBackup=useCallback(async()=>{
    if(!isCloudAccount(userId))throw new Error('백업한 계정으로 로그인해 주세요.');
    const backup=await latestRoutineBackup(userId!);if(!backup)throw new Error('아직 저장된 백업이 없어요.');
    await AsyncStorage.setItem(`${key}.before-restore`,JSON.stringify(current.current));
    await update(s=>{void s;return migrateN3Deck(backup.data);});
    cloudChecked.current=true;
    setBackupState({busy:false,lastAt:backup.createdAt,error:null});
  },[userId,update,key]);
  useEffect(()=>{
    if(!ready||!cloudChecked.current||!isCloudAccount(userId)||data===lastBackedUp.current)return;
    const timer=setTimeout(()=>{void backupNow().catch(()=>{});},5000);
    return()=>clearTimeout(timer);
  },[ready,userId,data,backupNow,backupState.busy]);
  const dayKey = expectedDay;
  const syncDecks = useCallback(async () => {
    if (!userId || loadedIdentity.current!==userId || !ready || receiving.current) return 0;
    receiving.current = true; setSyncingDecks(true); setDeckError(null);
    try {
      const owner=cloudUserId??userId;
      const decks = await receiveDecks(owner);
      if (!alive.current) return 0;
      let changed = 0;
      if (decks.length) await update(current => decks.reduce((state, deck) => {
        const next = mergeStudyDeck(state, deck); if (next !== state) changed++; return next;
      }, current));
      if(isCloudAccount(owner)){
        const summaries=await receiveLearningSummaries(owner);
        if(summaries.length)await update(s=>({...s,learningSummaries:mergeLearningSummaries(s.learningSummaries??[],summaries)}));
      }
      return changed;
    } catch (e) { if (alive.current) setDeckError(e instanceof Error ? e.message : "덱을 받지 못했어요."); return -1; }
    finally { receiving.current = false; if (alive.current) setSyncingDecks(false); }
  }, [userId,cloudUserId, ready, update]);
  useEffect(() => {
    if (ready) void syncDecks();
    const listener = AppState.addEventListener("change", state => { if (state === "active" && ready) void syncDecks(); });
    return () => listener.remove();
  }, [ready, syncDecks]);
  // 기록이 저장되거나 04시에 하루가 바뀌면 연속 실천 위젯에 같은 값을 넘긴다. 홈의 연속 실천과 같은 계산이다.
  useEffect(()=>{if(ready)writeStreakWidget(streakWidgetPayload(data,dayKey));},[ready,data,dayKey]);
  // 앱 아이콘: 12시 기준 오전·오후 칸마다 그날 동물의 표정으로 바꾼다(appIcon.ts). 앱이 열려 있을 때만 바뀐다.
  const iconSlot=appIconSlot(now.getHours());
  useEffect(()=>{if(ready)void syncAppIcon(dayKey,now.getHours(),streakWidgetPayload(data,dayKey).todayDone);},[ready,data,dayKey,iconSlot]);// eslint-disable-line react-hooks/exhaustive-deps
  const today=getDay(data,dayKey),paid=today.paid;
  const bonus=today.bonus;
  const adjustment=data.pendingStudyAdjustment;
  useEffect(()=>{
    if(!ready||!adjustment)return;
    let active=true;
    const operation=adjustment.day===dayKey?adjustStudyRewards(adjustment.day,adjustment.from,adjustment.to):Promise.resolve();
    void operation.then(async()=>{
      if(!active)return;
      await update(s=>s.pendingStudyAdjustment?.eventId===adjustment.eventId?{...s,pendingStudyAdjustment:undefined}:s);await refreshNative();
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'학습 보상을 되돌리지 못했어요. 다시 시도해 주세요.');});
    return()=>{active=false};
  },[ready,adjustment,adjustmentAttempt,dayKey,update,refreshNative]);
  const priority=priorityGate(data,dayKey,now.getTime());
  useEffect(()=>{if(ready&&native?.supportsPriorityGate)void syncPriorityGate(dayKey,data.priorityPolicy?.enabled?data.priorityPolicy.from:'',priority.complete).then(refreshNative).catch(e=>setError(e.message));},[ready,native?.supportsPriorityGate,native?.enabled,native?.rewardMode,dayKey,data.priorityPolicy?.enabled,data.priorityPolicy?.from,priority.complete,refreshNative]);
  const t=data.bookTimer;
  const focusUntil=focusLockUntil(t);
  useEffect(()=>{
    if(ready&&native?.policyVersion&&native.policyVersion>=2)void syncFocusWindow(focusUntil).then(refreshNative).catch(e=>setError(e.message));
  },[ready,native?.policyVersion,focusUntil,refreshNative]);
  // Promises, interest and stakes settle as soon as they are due: on open, on a new day, and whenever the saved data changes.
  useEffect(()=>{if(ready&&reconcileCommitments(data)!==data)void update(s=>reconcileCommitments(s)).catch(e=>setError(e.message));},[ready,data,dayKey,Math.floor(now.getTime()/60000)]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(ready&&native?.supportsEmergencyUnlock&&reconcileEmergency(data,native.emergencyLog)!==data)void update(s=>reconcileEmergency(s,native.emergencyLog)).catch(e=>setError(e.message));},[ready,native?.supportsEmergencyUnlock,native?.emergencyLog?.length,data.emergencyPending?.id,data.emergencyUnlocks?.length]);
  const breakAlarm=breakAlarmAt(t);
  useEffect(()=>{if(ready)void syncBreakAlarm(breakAlarm).catch(e=>setError(e.message));},[ready,breakAlarm]);
  useEffect(() => {
    let active = true;
      if (ready && !adjustment && native?.enabled && native.rewardMode) {
      syncRoutineRewards(dayKey,native.policyVersion&&native.policyVersion>=2?{...paid,book:bonus?.book??0,extra:bonus?.words??0,quick:bonus?.quick??0,wordDailyCap:wordDailyCap(data,dayKey),...(native.supportsOrderBonus?{order:bonus?.order??0}:{}),...(native.supportsFreeStudyRewards?{freeStudy:bonus?.freeStudy??0}:{}),...rewardSyncExtras(data,dayKey,native)}:paid).then(() => refreshNative()).catch(e => {
        if (active && alive.current) setError(e instanceof Error ? e.message : "이용 시간 연결에 실패했어요.");
      });
    }
    return () => { active = false; };
    }, [ready, adjustment,dayKey, paid.morning, paid.words, paid.gym,bonus?.book,bonus?.words,bonus?.quick,bonus?.order,bonus?.freeStudy,bonus?.handwriting,bonus?.speaking,bonus?.content,bonus?.promise,penaltyMinutesOnDay(data,dayKey),native?.supportsMinuteHandwriting,native?.supportsSpeakingRewards,native?.supportsContentRewards,native?.supportsPromiseRewards,wordDailyCap(data,dayKey),native?.supportsOrderBonus,native?.supportsFreeStudyRewards,native?.supportsHandwritingRewards,native?.policyVersion, native?.enabled, native?.rewardMode, refreshNative]);
  return <Context.Provider value={{accountId:userId, data, ready, error, native, refreshNative, dayKey, now, update,undoStudy,retryStudyAdjustment:()=>setAdjustmentAttempt(n=>n+1), syncingDecks, deckError, syncDecks,backupState,backupNow,restoreBackup }}>{children}</Context.Provider>;
}
export function useRoutine() {
  const value = useContext(Context);
  if (!value) throw new Error("RoutineProvider is required");
  return value;
}
export function useOptionalRoutine() { return useContext(Context); }

