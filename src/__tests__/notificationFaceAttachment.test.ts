import * as FileSystem from 'expo-file-system/legacy';
import {Image,Platform} from 'react-native';
import {faceAttachments} from '../lib/notificationFaceAttachment';

jest.mock('expo-file-system/legacy',()=>({
 cacheDirectory:'file:///cache/',
 makeDirectoryAsync:jest.fn(async()=>{}),
 deleteAsync:jest.fn(async()=>{}),
 copyAsync:jest.fn(async()=>{}),
 downloadAsync:jest.fn(async()=>({status:200})),
}));
const F=FileSystem as jest.Mocked<typeof FileSystem>;
let source='file:///app/assets/notification-faces/smile-otter.png';
beforeEach(()=>{jest.clearAllMocks();(Platform as {OS:string}).OS='ios';source='file:///app/assets/notification-faces/smile-otter.png';jest.spyOn(Image,'resolveAssetSource').mockImplementation(()=>({uri:source,width:600,height:600,scale:1}));});

test('a copy of the picture for this notification, in the cache, attached by its own file',async()=>{
 const list=await faceAttachments('smile-otter','routine.break-end');
 expect(F.copyAsync).toHaveBeenCalledWith({from:source,to:'file:///cache/notification-faces/routine.break-end-smile-otter.png'});
 const file='file:///cache/notification-faces/routine.break-end-smile-otter.png';
 // iOS (expo-notifications Records.swift) reads `uri`, not the typed `url`: without it the picture is silently dropped.
 expect(list).toEqual([{identifier:'smile-otter',url:file,uri:file,type:'public.png',typeHint:'public.png'}]);
});
test('each notification gets its own copy, since iOS moves the file when it schedules',async()=>{
 await faceAttachments('smile-otter','routine.reflect.0');
 await faceAttachments('smile-otter','routine.reflect.1');
 const targets=F.copyAsync.mock.calls.map(c=>c[0].to);
 expect(new Set(targets).size).toBe(2);
});
test('in development the picture comes from the dev server and is downloaded',async()=>{
 source='http://localhost:8081/assets/notification-faces/smile-otter.png';
 await faceAttachments('smile-otter','routine.next-study');
 expect(F.downloadAsync).toHaveBeenCalledWith(source,'file:///cache/notification-faces/routine.next-study-smile-otter.png');
});
test('an unknown name, the web, or a failed copy attaches nothing, so the notification still goes',async()=>{
 expect(await faceAttachments('angry-dragon','x')).toEqual([]);
 F.copyAsync.mockRejectedValueOnce(new Error('disk'));
 expect(await faceAttachments('smile-otter','x')).toEqual([]);
 (Platform as {OS:string}).OS='web';
 expect(await faceAttachments('smile-otter','x')).toEqual([]);
});
test('no picture asked for, none attached',async()=>{
 expect(await faceAttachments(undefined,'x')).toEqual([]);
 expect(F.copyAsync).not.toHaveBeenCalled();
});
