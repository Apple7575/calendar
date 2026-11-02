import {animalRoles} from './animalCast';
import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {animalCharacters} from './animalAssets';
import {BoriMascot} from './AnimalMascot';
import {useAnimalCharacter,setAnimalCharacter} from '../../lib/animalPreference';
import {useTheme} from '../../theme/ThemeContext';
export function AnimalCharacterPicker(){
 const selected=useAnimalCharacter(),{colors:c}=useTheme(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <View style={{gap:10}}><Text style={{fontSize:19,fontWeight:'800',color:c.text}}>홈에서 함께할 친구</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{animalCharacters.map(character=><Pressable key={character.id} accessibilityRole="button" accessibilityLabel={character.name+' 선택'} accessibilityState={{selected:selected===character.id,disabled:busy}} disabled={busy} onPress={()=>{setBusy(true);setError('');void setAnimalCharacter(character.id).catch(()=>setError('선택을 저장하지 못했어요. 다시 눌러 주세요.')).finally(()=>setBusy(false))}} style={{minWidth:72,flex:1,alignItems:'center',padding:8,borderRadius:16,borderWidth:selected===character.id?2:1,borderColor:selected===character.id?c.primary:c.border,backgroundColor:c.card}}><View pointerEvents="none"><BoriMascot interactive={false} size={56} character={character.id} action={animalRoles[character.id].pose}/></View><Text style={{fontSize:13,color:c.text,fontWeight:'700'}}>{selected===character.id?'✓ ':''}{character.name}</Text><Text style={{fontSize:10,color:c.textMuted,marginTop:3}}>{animalRoles[character.id].label}</Text></Pressable>)}</View>{error?<Text style={{color:c.text}}>{error}</Text>:null}</View>;
}
