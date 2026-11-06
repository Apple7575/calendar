import * as FileSystem from 'expo-file-system/legacy';
import {Image,Platform} from 'react-native';
import type {NotificationContentAttachmentIos} from 'expo-notifications';

/**
 * 알림에 붙일 동물 얼굴 파일 (S2-12). 그림은 앱 묶음에 들어 있고, iOS는 알림을 걸 때 붙인 파일을 자기 저장소로 옮겨 간다.
 * 그래서 알림마다 캐시에 사본을 하나 만들어 붙인다. 무엇이든 실패하면 그림 없이 알림만 간다(알림을 막지 않는다).
 * 새 네이티브 부품 없음: expo-file-system과 expo-notifications의 attachments만 쓴다.
 */
const FACES:Record<string,number>={
 'smile-otter':require('../../assets/notification-faces/smile-otter.png'),
 'smile-bear':require('../../assets/notification-faces/smile-bear.png'),
 'smile-cat':require('../../assets/notification-faces/smile-cat.png'),
 'smile-hedgehog':require('../../assets/notification-faces/smile-hedgehog.png'),
 'cheer-otter':require('../../assets/notification-faces/cheer-otter.png'),
 'cheer-bear':require('../../assets/notification-faces/cheer-bear.png'),
 'cheer-cat':require('../../assets/notification-faces/cheer-cat.png'),
 'cheer-hedgehog':require('../../assets/notification-faces/cheer-hedgehog.png'),
 'worried-otter':require('../../assets/notification-faces/worried-otter.png'),
 'worried-bear':require('../../assets/notification-faces/worried-bear.png'),
 'worried-cat':require('../../assets/notification-faces/worried-cat.png'),
 'worried-hedgehog':require('../../assets/notification-faces/worried-hedgehog.png'),
};

/** name은 notificationFace()의 결과, tag는 알림 id(사본 파일 이름이 알림마다 다르게). */
export async function faceAttachments(name:string|undefined,tag:string):Promise<NotificationContentAttachmentIos[]>{
 if(Platform.OS!=='ios'||!name||!(name in FACES)||!FileSystem.cacheDirectory)return [];
 try{
  const uri=Image.resolveAssetSource(FACES[name])?.uri;if(!uri)return [];
  const dir=FileSystem.cacheDirectory+'notification-faces/',to=`${dir}${tag.replace(/[^\w.-]/g,'_')}-${name}.png`;
  await FileSystem.makeDirectoryAsync(dir,{intermediates:true});
  await FileSystem.deleteAsync(to,{idempotent:true});
  if(/^https?:/.test(uri))await FileSystem.downloadAsync(uri,to);
  else await FileSystem.copyAsync({from:uri,to});
  // The native side (expo-notifications 0.32 Records.swift) reads `uri`; the TS type only names `url`. Send both.
  return [{identifier:name,url:to,uri:to,type:'public.png',typeHint:'public.png'} as NotificationContentAttachmentIos];
 }catch{return [];}
}
