const mockStore:Record<string,string>={};
jest.mock('@react-native-async-storage/async-storage',()=>({getItem:jest.fn(async(k:string)=>mockStore[k]??null),setItem:jest.fn(async(k:string,v:string)=>{mockStore[k]=v})}));
import {loadRestAlarmSetting,onRestAlarmSetting,REST_ALARM_SETTING_KEY,resetRestAlarmSettingForTest,restAlarmOn,setRestAlarmOn} from '../lib/restAlarmSetting';

beforeEach(()=>{for(const k of Object.keys(mockStore))delete mockStore[k];resetRestAlarmSettingForTest();});
test('on by default',async()=>{expect(await loadRestAlarmSetting()).toBe(true);});
test('the choice is kept on the device and told to every listener',async()=>{
 const seen:boolean[]=[];onRestAlarmSetting(v=>seen.push(v));
 await setRestAlarmOn(false);
 expect(mockStore[REST_ALARM_SETTING_KEY]).toBe('off');
 expect(restAlarmOn()).toBe(false);
 resetRestAlarmSettingForTest();
 expect(await loadRestAlarmSetting()).toBe(false);
 expect(seen).toEqual([false]);
});
