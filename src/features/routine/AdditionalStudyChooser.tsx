import React,{useState} from 'react';
import { Pressable,TextInput,View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Action,Copy } from './ui';

export function AdditionalStudyChooser({newCount,reviewCount,busy,onStart}:{newCount:number;reviewCount:number;busy:boolean;onStart:(kind:'new'|'review',count:number)=>void}){
  const {colors:c}=useTheme();
  const [count,setCount]=useState('10');
  const value=Number(count),valid=/^\d+$/.test(count)&&Number.isSafeInteger(value)&&value>0;
  return <View style={{gap:14}}>
    <View style={{gap:4}}><Copy size={19} weight="700">조금 더 공부할까요?</Copy><Copy muted size={13}>이번에 할 만큼만 골라요. 오늘 목표는 그대로예요.</Copy></View>
    <View style={{flexDirection:'row',gap:8}}>{[5,10,20,30].map(n=><Pressable key={n} accessibilityRole="radio" accessibilityLabel={`추가 ${n}장`} accessibilityState={{checked:count===String(n)}} aria-checked={count===String(n)} onPress={()=>setCount(String(n))} style={{flex:1,minHeight:44,borderRadius:13,backgroundColor:count===String(n)?c.primarySoft:c.inputBg,borderWidth:1,borderColor:count===String(n)?c.primary:'transparent',alignItems:'center',justifyContent:'center'}}><Copy weight="700">{n}장</Copy></Pressable>)}</View>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Copy size={14}>직접 정하기</Copy><View style={{flexDirection:'row',alignItems:'center',gap:8}}><TextInput accessibilityLabel="추가 학습 장수" keyboardType="number-pad" maxLength={6} selectTextOnFocus value={count} onChangeText={setCount} style={{width:86,minHeight:44,borderRadius:12,backgroundColor:c.inputBg,textAlign:'center',color:c.text,fontSize:18,fontWeight:'700'}}/><Copy muted>장</Copy></View></View>
    {!valid?<Copy muted size={12}>1장 이상의 정수를 입력해 주세요.</Copy>:null}
    <Action label={`새 단어 더 하기 · ${valid?Math.min(value,newCount):0}장`} disabled={busy||!valid||!newCount} onPress={()=>onStart('new',Math.min(value,newCount))}/>
    <Action secondary label={`복습 더 하기 · ${valid?Math.min(value,reviewCount):0}장`} disabled={busy||!valid||!reviewCount} onPress={()=>onStart('review',Math.min(value,reviewCount))}/>
    <Copy muted size={12}>남은 새 카드 {newCount}장 · 복습 가능 {reviewCount}장{valid&&value>Math.max(newCount,reviewCount)?' · 남아 있는 카드만 준비해요.':''}</Copy>
  </View>;
}
