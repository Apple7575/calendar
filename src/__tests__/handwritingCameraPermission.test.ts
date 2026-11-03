import React from 'react';
import {Linking} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {emptyData} from '../lib/routineModel';
import {HandwritingStudy} from '../features/routine/HandwritingStudy';
// jest-expo brings react-test-renderer without type declarations.
const {act,create}=require('react-test-renderer');
jest.mock('expo-image-picker',()=>({requestCameraPermissionsAsync:jest.fn(),launchCameraAsync:jest.fn(),launchImageLibraryAsync:jest.fn()}));
jest.mock('expo-image-manipulator',()=>({manipulateAsync:jest.fn(),SaveFormat:{JPEG:'jpeg'}}));
jest.mock('expo-crypto',()=>({digestStringAsync:jest.fn(),randomUUID:()=>'id',CryptoDigestAlgorithm:{SHA256:'SHA-256'}}));
jest.mock('../lib/handwritingApi',()=>({recognizeHandwriting:jest.fn()}));
jest.mock('@react-navigation/native',()=>({useNavigation:()=>({navigate:jest.fn()})}));
jest.mock('../features/routine/RoutineProvider',()=>({useRoutine:jest.fn()}));
jest.mock('../features/routine/ui',()=>{
 const {createElement:h}=jest.requireActual('react'),rn=jest.requireActual('react-native');
 const press=({label,onPress,disabled}:{label:string;onPress:()=>void;disabled?:boolean})=>h(rn.Pressable,{onPress,disabled,accessibilityRole:'button'},h(rn.Text,null,label));
 return {Action:press,Link:press,CardView:({children}:{children:React.ReactNode})=>h(rn.View,null,children),Copy:({children}:{children:React.ReactNode})=>h(rn.Text,null,children)};
});
const {useRoutine}=jest.requireMock('../features/routine/RoutineProvider');
const picker=ImagePicker as jest.Mocked<typeof ImagePicker>;
const text=()=>JSON.stringify(tree.toJSON());
const button=(label:string)=>tree.root.findAll((n:{props:{label?:string}})=>n.props.label===label)[0];
let tree:any;
beforeEach(async()=>{
 jest.clearAllMocks();
 useRoutine.mockReturnValue({data:{...emptyData(),outputDraft:{id:'d',subject:'수능',startedAt:new Date().toISOString()}},dayKey:'2026-11-03',update:jest.fn(),accountId:'me',native:null});
 await act(async()=>{tree=create(React.createElement(HandwritingStudy))});
});
afterEach(async()=>{await act(async()=>tree.unmount())});
const take=async()=>{await act(async()=>{await button('노트 사진 찍기')!.props.onPress()})};
const deny=()=>picker.requestCameraPermissionsAsync.mockResolvedValue({granted:false,canAskAgain:false,status:'denied',expires:'never'} as never);
test('handwriting never offers the album',()=>{
 expect(text()).not.toContain('앨범');
 expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
});
test('denied camera explains settings, offers retry, and never falls back to the album',async()=>{
 deny();await take();
 const copy=text();
 expect(copy).toContain('카메라 권한');expect(copy).toContain('설정');expect(copy).not.toContain('앨범');
 expect(picker.launchCameraAsync).not.toHaveBeenCalled();expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
 expect(button('설정 열기')).toBeDefined();expect(button('다시 시도')).toBeDefined();
});
test('settings button opens system settings',async()=>{
 const open=jest.spyOn(Linking,'openSettings').mockResolvedValue();
 deny();await take();
 button('설정 열기')!.props.onPress();
 expect(open).toHaveBeenCalledTimes(1);
});
test('retry asks again and opens the camera once allowed',async()=>{
 deny();await take();
 picker.requestCameraPermissionsAsync.mockResolvedValue({granted:true,canAskAgain:true,status:'granted',expires:'never'} as never);
 picker.launchCameraAsync.mockResolvedValue({canceled:true,assets:null} as never);
 await act(async()=>{await button('다시 시도')!.props.onPress()});
 expect(picker.launchCameraAsync).toHaveBeenCalledTimes(1);
 expect(button('설정 열기')).toBeUndefined();
});
