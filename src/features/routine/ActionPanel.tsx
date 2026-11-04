import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {control,radii,space,type} from '../../theme/tokens';

export type ActionPanelColors={panel:string;cell:string;text:string;accent:string;onAccent:string};

/** 캐릭터 위에 겹쳐 놓는 버튼 묶음. 두 칸씩 놓고, 칸이 하나 남으면 그 줄을 다 쓴다. */
export function ActionPanel({background,children}:{background:string;children:React.ReactNode}){
 return <View testID="action-panel" style={{flexDirection:'row',flexWrap:'wrap',gap:space.xs,padding:space.xs,borderRadius:radii.card,backgroundColor:background}}>{children}</View>;
}

export function PanelButton({label,onPress,colors,primary=false,wide=false,tight=false,accessibilityLabel,expanded}:{label:string;onPress:()=>void;colors:ActionPanelColors;primary?:boolean;wide?:boolean;tight?:boolean;accessibilityLabel?:string;expanded?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={expanded===undefined?undefined:{expanded}} onPress={onPress} style={({pressed})=>({flexGrow:1,flexBasis:tight?0:wide?'100%':'40%',minHeight:primary?control.compact:control.touch,justifyContent:'center',paddingHorizontal:space.xs,borderRadius:radii.control,backgroundColor:primary?colors.accent:colors.cell,transform:[{scale:pressed?.97:1}]})}><Text style={{...type.label,color:primary?colors.onAccent:colors.text,fontWeight:primary?'800':'700',textAlign:'center'}}>{label}</Text></Pressable>;
}
