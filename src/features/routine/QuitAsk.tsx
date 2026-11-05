import React,{useEffect} from 'react';
import {View} from 'react-native';
import {loadFocusQuestions,takeFocusQuestion} from '../../lib/focusQuestions';
import {useTheme} from '../../theme/ThemeContext';
import {MascotBubble} from './MascotBubble';
import {Action} from './ui';

/** The question for a penalised finish outside the timer, which draws its own. Uses the day's shared count. */
export function useQuitQuestion(dayKey:string){
 useEffect(()=>{void loadFocusQuestions()},[]);
 return ()=>takeFocusQuestion('quit',dayKey);
}
/** Shown while a penalised finish waits for its second press and there is a question to ask. */
export function QuitAsk({question,onStay,go}:{question:string|null;onStay:()=>void;go?:{label:string;onPress:()=>void}}){
 const {colors:c}=useTheme();
 if(!question&&!go)return null;
 return <View style={{gap:8,paddingVertical:8}}>{question?<MascotBubble text={question} background={c.text} color={c.background} tail="none"/>:null}{question?<Action label="계속 공부" onPress={onStay}/>:null}{go?<Action secondary label={go.label} onPress={go.onPress}/>:null}</View>;
}
