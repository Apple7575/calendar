import React,{ReactNode} from 'react';
import {Text,View} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {priorityVisuals} from '../../theme/themes';
import {Action,Field,Icon} from './ui';
import {radii,space,type} from '../../theme/tokens';
export function usePriorityVisuals(){return priorityVisuals(useTheme())}
/** Action과 Field의 예전 이름. 새 화면은 ui.tsx의 Action·Field를 바로 쓴다. */
export function PriorityButton({label,accessibilityLabel,onPress,disabled=false,secondary=false,icon='arrow-forward'}:{label:string;accessibilityLabel?:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;icon?:'play'|'checkmark'|'pause'|'arrow-forward'}){
 return <Action label={label} accessibilityLabel={accessibilityLabel??label} onPress={onPress} disabled={disabled} secondary={secondary} icon={icon}/>;
}
export function PriorityField({label,accessibilityLabel,value,onChangeText,placeholder,multiline=false,editable=true,limit=300}:{label:string;accessibilityLabel:string;value:string;onChangeText:(value:string)=>void;placeholder:string;multiline?:boolean;editable?:boolean;limit?:number}){
 return <Field label={label||undefined} accessibilityLabel={accessibilityLabel} value={value} onChangeText={onChangeText} placeholder={placeholder} multiline={multiline} editable={editable} maxLength={limit}/>;
}
export function PriorityChip({children,done=false}:{children:ReactNode;done?:boolean}){const p=usePriorityVisuals();return <View style={{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:done?p.successSoft:p.mutedSurface,borderRadius:radii.chip,paddingHorizontal:space.sm,paddingVertical:space.xs-2}}><Icon name={done?'checkmark-circle':'ellipse-outline'} size={14} color={done?p.success:p.muted}/><Text style={[type.caption,{color:done?p.success:p.muted,fontWeight:'700'}]}>{children}</Text></View>}
