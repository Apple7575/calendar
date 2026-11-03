import React,{ReactNode} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '../../theme/ThemeContext';
/** Secondary options of a study page, grouped as one list so they do not float as loose links. */
export function FocusList({children}:{children:ReactNode}){
 const {colors:c}=useTheme();
 return <View style={{backgroundColor:c.card,borderRadius:26,paddingHorizontal:22,paddingVertical:4}}>{children}</View>;
}
export function FocusListRow({label,onPress,open,disabled=false,last=false}:{label:string;onPress:()=>void;open?:boolean;disabled?:boolean;last?:boolean}){
 const {colors:c}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,expanded:open}} disabled={disabled} onPress={onPress} style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,opacity:disabled?.45:1,borderBottomWidth:last?0:1,borderBottomColor:c.border}}>
  <Text style={{color:c.text,fontSize:15,fontWeight:'600',flex:1}}>{label}</Text>
  <Ionicons name={open===undefined?'chevron-forward':open?'chevron-up':'chevron-down'} size={18} color={c.textMuted}/>
 </Pressable>;
}
