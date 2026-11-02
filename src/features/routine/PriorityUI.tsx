import React,{ReactNode,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {priorityVisuals} from '../../theme/themes';
import {useReducedMotion} from './motion';
import {tapLight} from '../../lib/haptics';
import {Icon} from './ui';
export function usePriorityVisuals(){return priorityVisuals(useTheme())}
export function PriorityButton({label,accessibilityLabel,onPress,disabled=false,secondary=false,icon='arrow-forward'}:{label:string;accessibilityLabel?:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;icon?:'play'|'checkmark'|'pause'|'arrow-forward'}){
 const p=usePriorityVisuals(),reduced=useReducedMotion();
 return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} accessibilityState={{disabled}} disabled={disabled} onPress={()=>{tapLight();onPress()}} style={({pressed})=>({minHeight:58,paddingHorizontal:20,paddingVertical:14,borderRadius:18,backgroundColor:secondary?p.brandSoft:p.brand,borderWidth:1,borderBottomWidth:pressed?1:4,borderColor:secondary?p.line:p.brandDeep,transform:[{translateY:pressed&&!reduced?3:0}],opacity:disabled?0.45:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10})}><Text style={{fontSize:17,fontWeight:'800',textAlign:'center',color:secondary?p.brandInk:p.onBrand,flex:1}}>{label}</Text><Icon name={icon} color={secondary?p.brandInk:p.onBrand} size={18}/></Pressable>;
}
export function PriorityField({label,accessibilityLabel,value,onChangeText,placeholder,multiline=false,editable=true,limit=300}:{label:string;accessibilityLabel:string;value:string;onChangeText:(value:string)=>void;placeholder:string;multiline?:boolean;editable?:boolean;limit?:number}){
 const p=usePriorityVisuals(),[focused,setFocused]=useState(false);
 return <View style={{gap:8}}>{label?<Text style={{fontSize:13,color:p.muted,fontWeight:'700'}}>{label}</Text>:null}<TextInput accessibilityLabel={accessibilityLabel} value={value} onChangeText={onChangeText} multiline={multiline} editable={editable} maxLength={limit} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={placeholder} placeholderTextColor={p.muted} selectionColor={p.brand} underlineColorAndroid="transparent" style={{outlineWidth:0,borderRadius:15,padding:15,borderWidth:1.5,borderColor:focused?p.brand:p.line,backgroundColor:focused?p.paper:p.mutedSurface,color:p.ink,fontSize:multiline?17:16,lineHeight:25,minHeight:multiline?105:54,textAlignVertical:multiline?'top':'center',opacity:editable?1:.7}}/></View>;
}
export function PriorityChip({children,done=false}:{children:ReactNode;done?:boolean}){const p=usePriorityVisuals();return <View style={{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:done?p.successSoft:p.mutedSurface,borderRadius:10,paddingHorizontal:10,paddingVertical:7}}><Icon name={done?'checkmark-circle':'ellipse-outline'} size={14} color={done?p.success:p.muted}/><Text style={{fontSize:12,color:done?p.success:p.muted,fontWeight:'700'}}>{children}</Text></View>}
