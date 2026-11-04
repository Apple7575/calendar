import { Ionicons } from "@expo/vector-icons";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Keyboard, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextStyle, useWindowDimensions, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/ThemeContext";
import { motion, MotionEnter, usePressMotion, useReducedMotion } from "./motion";
import {useNavigation,useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {tapLight} from '../../lib/haptics';
import {colorRoles} from '../../theme/roles';
import {keyboardScrollDelta} from '../../lib/keyboardScroll';
import {BoriMascot as Mascot} from './BoriMascot';
import type {AnimalActionId,AnimalCharacterId} from './animalAssets';
import type {MascotMood} from './boriAssets';
import {character as characterSize,control,gutter,radii,space,type,TypeRole,typeStep} from '../../theme/tokens';

/** 오른쪽 링크로 지금 나갈 수 있으면 뒤로 화살표를 겹쳐 두지 않는다. 비활성이면 나가는 길이 없어지므로 화살표를 남긴다. */
const EXIT_LABELS=['닫기','나가기','중단'];
function isExitAction(right:ReactNode){return React.isValidElement(right)&&right.type===Link&&EXIT_LABELS.includes((right.props as {label?:string}).label??'')&&!(right.props as {disabled?:boolean}).disabled}
/** Field가 키보드에 가릴 때 자기가 속한 Page를 올리는 통로. */
const PageScroll=createContext<{scrollBy:(dy:number)=>void}|null>(null);
export function ProfileButton(){
 const {colors:c}=useTheme(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 return <Pressable accessibilityRole="button" accessibilityLabel="프로필·설정" onPress={()=>nav.navigate('SettingsHub')} style={{width:control.touch,height:control.touch,borderRadius:control.touch/2,backgroundColor:c.primarySoft,alignItems:'center',justifyContent:'center'}}><Icon name="person-outline" size={21} color={c.primary}/></Pressable>;
}
export function Page({ title, right, children, footer, scrollable = true, floatingFooter = false, fillContent = false,embedded=false,scrollEnabled=true,scrollRef,showHeader=true,keyboardInsets=true }: { title: string; keyboardInsets?:boolean; showHeader?:boolean; right?: ReactNode; children: ReactNode; footer?: ReactNode; scrollable?: boolean; floatingFooter?: boolean;fillContent?:boolean;embedded?:boolean;scrollEnabled?:boolean;scrollRef?:React.RefObject<ScrollView|null> }) {
  const { colors: c } = useTheme();
  const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),route=useRoute();
  const pushed=nav.canGoBack()&&!['Today','Study','GoalTab','Records','Calendar','More'].includes(route.name);
  const back=pushed&&!isExitAction(right);
  const ownScroll=useRef<ScrollView>(null),scroller=scrollRef??ownScroll,offset=useRef(0);
  const pageScroll=useMemo(()=>({scrollBy:(dy:number)=>scroller.current?.scrollTo({y:offset.current+dy,animated:true})}),[scroller]);
  if(embedded)return <View style={{gap:space.md}}>{children}</View>;
  const content = <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.surface }}>
    {showHeader?<View style={u.header}>{back?<Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={()=>nav.goBack()} style={{minWidth:control.touch,minHeight:control.touch,justifyContent:'center'}}><Icon name="arrow-back" size={23} color={c.text}/></Pressable>:null}<Text accessibilityRole="header" style={[type.title, { color: c.text,flex:1 }]}>{title}</Text>{right??(pushed?null:<ProfileButton/>)}</View>:null}
    {scrollable ? <ScrollView ref={scroller} scrollEnabled={scrollEnabled} automaticallyAdjustKeyboardInsets={keyboardInsets} onScroll={event=>{offset.current=event.nativeEvent.contentOffset.y}} scrollEventThrottle={16} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentContainerStyle={[u.page, fillContent?{flexGrow:1}:null, footer ? { paddingBottom: floatingFooter ? fillContent?12:120 : space.xl } : null]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      : <View style={{ flex: 1, minHeight: 0, paddingHorizontal: gutter, paddingBottom: space.sm }}>{children}</View>}
    {footer ? floatingFooter ? <View style={{position:'absolute',left:gutter,right:gutter,bottom:0}}>{footer}</View> : <SafeAreaView edges={["bottom"]} style={{ backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.border, padding: gutter }}>{footer}</SafeAreaView> : null}
  </SafeAreaView>;
  const screen=<PageScroll.Provider value={pageScroll}>{content}</PageScroll.Provider>;
  return Platform.OS === "web" ? <MotionEnter style={{ flex: 1, backgroundColor: c.surface }}>{screen}</MotionEnter> : screen;
}
/** 정보 카드. 누를 수 없는 묶음에만 쓴다. 눌러서 이동하면 NavCard, 고르는 항목이면 Choice. */
export function CardView({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useTheme();
  return <View style={[u.card, { backgroundColor: c.card }, style]}>{children}</View>;
}
/** 글자. 새 코드는 variant로 역할을 고른다. size는 가까운 글자 단계로 맞춰진다. */
export function Copy({ children, muted = false, size, variant, weight,numberOfLines,style }: { children: ReactNode; muted?: boolean; size?: number; variant?:TypeRole; numberOfLines?:number;style?:StyleProp<TextStyle>;weight?: "400" | "500" | "600" | "700" | "800" }) {
  const { colors: c } = useTheme();
  const base=variant?type[variant]:size!==undefined?{...typeStep(size),fontWeight:"500" as const}:type.body;
  return <Text numberOfLines={numberOfLines} style={[base,{ color: muted ? c.textMuted : c.text },weight?{fontWeight:weight}:null,style]}>{children}</Text>;
}
export type ActionVariant="primary"|"secondary"|"danger";
/** 버튼. 입체감 없이 납작하게, 채운 색으로 위계를 나눈다. primary는 화면(또는 영역)의 다음 행동 하나에만 쓴다. */
export function Action({ label, onPress, variant, secondary = false, disabled = false, compact = false, loading = false, icon, accessibilityLabel }: {
  label: string; onPress: () => void; variant?:ActionVariant; secondary?: boolean; disabled?: boolean; compact?: boolean; loading?:boolean; icon?:React.ComponentProps<typeof Ionicons>["name"]; accessibilityLabel?:string;
}) {
  const theme = useTheme(), role=colorRoles(theme);
  const kind=role[variant??(secondary?"secondary":"primary")];
  const inactive=disabled||loading;
  const press = usePressMotion(inactive);
  const reduced = useReducedMotion();
  return <Animated.View style={{ transform: [{ scale: press.scale }] }}><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled:inactive,busy:loading }} aria-busy={loading} disabled={inactive} onPress={()=>{tapLight();onPress();}}
    onPressIn={press.pressIn} onPressOut={press.pressOut}
    style={({ pressed }) => [u.action, { minHeight: compact ? control.compact : control.large, backgroundColor: kind.fill,borderColor:kind.edge,borderWidth:1,
      opacity: disabled ? 0.5 : pressed&&!reduced ? 0.85 : 1 }]}>
    {loading?<ActivityIndicator size="small" color={kind.on}/>:null}
    <Text style={[compact?type.label:type.section,{ color: kind.on, textAlign: "center",flexShrink:1 }]}>{label}</Text>
    {icon&&!loading?<Ionicons name={icon} size={18} color={kind.on}/>:null}
  </Pressable></Animated.View>;
}
/** 아이콘 버튼. 재생·멈춤처럼 아이콘이 더 빠른 조작에 쓴다. 글자가 필요하면 caption을 함께 준다. 라벨은 스크린리더가 읽는다. */
export function IconAction({icon,label,onPress,caption,large=false,disabled=false}:{icon:React.ComponentProps<typeof Ionicons>["name"];label:string;onPress:()=>void;caption?:string;large?:boolean;disabled?:boolean}){
  const theme=useTheme(),{colors:c}=theme,role=colorRoles(theme),box=large?control.large+space.md:control.touch;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPress={()=>{tapLight();onPress();}} style={({pressed})=>({alignItems:'center',gap:space.xxs,minWidth:control.touch,opacity:disabled?0.35:pressed?0.7:1})}>
    <View style={{width:box,height:box,borderRadius:box/2,alignItems:'center',justifyContent:'center',backgroundColor:large?c.primarySoft:c.inputBg}}><Ionicons name={icon} size={large?30:20} color={large?role.primary.ink:c.text}/></View>
    {caption?<Copy variant="caption" muted>{caption}</Copy>:null}
  </Pressable>;
}
/** 글자 버튼. 이동·열기는 기본 색, 닫기·건너뛰기처럼 물러나는 행동은 muted. */
export function Link({ label, onPress,disabled=false,muted }: { label: string; onPress: () => void;disabled?:boolean;muted?:boolean }) {
  const theme=useTheme(),{colors:c}=theme;
  const quiet=muted??EXIT_LABELS.includes(label);
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={{ minHeight: control.touch,minWidth:control.touch, alignItems:"center",justifyContent: "center", paddingHorizontal: space.xs,opacity:disabled?0.5:1 }}>
    <Text style={[type.label,{ color: quiet?c.textMuted:colorRoles(theme).primary.ink, textAlign: "center" }]}>{label}</Text>
  </Pressable>;
}
/** 이동 가능한 카드. 전체가 눌리고 오른쪽 화살표로 이동을 알린다. */
export function NavCard({title,subtitle,icon,right,onPress,disabled=false,accessibilityLabel}:{title:string;subtitle?:string;icon?:React.ComponentProps<typeof Ionicons>["name"];right?:ReactNode;onPress:()=>void;disabled?:boolean;accessibilityLabel?:string}){
  const {colors:c}=useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??title} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[u.between,{minHeight:control.large,padding:space.md,borderRadius:radii.card,backgroundColor:pressed?c.primarySoft:c.card,opacity:disabled?0.5:1}]}>
    {icon?<Icon name={icon} size={22} color={c.primary}/>:null}
    <View style={{flex:1,gap:2}}><Copy variant="label">{title}</Copy>{subtitle?<Copy variant="caption" muted>{subtitle}</Copy>:null}</View>
    {right}<Icon name="chevron-forward" size={18}/>
  </Pressable>;
}
/** 선택 항목. 여러 개 중 하나(또는 여러 개)를 고른다. fill이면 한 줄을 다 쓰는 항목. 학습 내용을 고를 때는 labelVariant="lead"나 "body". */
export function Choice({label,description,selected,onPress,disabled=false,fill=false,accessibilityLabel,labelVariant='caption'}:{label:string;description?:string;selected:boolean;onPress:()=>void;disabled?:boolean;fill?:boolean;accessibilityLabel?:string;labelVariant?:'caption'|'body'|'lead'}){
  const theme=useTheme(),{colors:c}=theme,role=colorRoles(theme);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} accessibilityState={{selected,disabled}} {...({'aria-pressed':selected} as object)} disabled={disabled} onPress={()=>{tapLight();onPress();}} style={{flexDirection:'row',alignItems:'center',gap:space.xs,minHeight:control.touch,paddingHorizontal:space.sm,paddingVertical:space.xs,borderRadius:radii.chip,borderWidth:1,borderColor:selected?c.primary:c.border,backgroundColor:selected?c.primarySoft:c.card,opacity:disabled?0.5:1,alignSelf:fill?'stretch':'flex-start'}}>
    {selected?<Icon name="checkmark-circle" size={17} color={role.primary.ink}/>:null}
    <View style={{flexShrink:1,flexGrow:fill?1:0,gap:2}}><Copy variant={labelVariant} weight={selected?'700':'500'} style={selected?{color:role.primary.ink}:undefined}>{label}</Copy>{description?<Copy variant="caption" muted>{description}</Copy>:null}</View>
  </Pressable>;
}
/** 입력창. 이름표는 위에, 설명과 오류는 아래에 둔다. 플레이스홀더를 이름표 대신 쓰지 않는다. */
export function Field({label,accessibilityLabel,value,onChangeText,placeholder,helper,error,multiline=false,editable=true,maxLength,minHeight}:{label?:string;accessibilityLabel?:string;value:string;onChangeText:(value:string)=>void;placeholder?:string;helper?:string;error?:string;multiline?:boolean;editable?:boolean;maxLength?:number;minHeight?:number}){
  const theme=useTheme(),{colors:c}=theme,role=colorRoles(theme),[focused,setFocused]=useState(false),box=useRef<View>(null),page=useContext(PageScroll);
  const reveal=useCallback((keyboardTop?:number)=>{
    if(Platform.OS!=='ios')return;
    const top=keyboardTop??Keyboard.metrics()?.screenY;
    if(top!==undefined)box.current?.measureInWindow((_x,y,_width,height)=>{const delta=keyboardScrollDelta(y+height,top);if(delta>0)page?.scrollBy(delta)});
  },[page]);
  useEffect(()=>{if(!focused)return;reveal();const shown=Keyboard.addListener('keyboardDidShow',event=>reveal(event.endCoordinates.screenY));return()=>shown.remove()},[focused,reveal]);
  return <View ref={box} style={{gap:space.xs}}>
    {label?<Copy variant="caption" weight="700" muted>{label}</Copy>:null}
    <TextInput keyboardAppearance={theme.isDark?'dark':'light'} accessibilityLabel={accessibilityLabel??label} value={value} onChangeText={onChangeText} multiline={multiline} editable={editable} maxLength={maxLength} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onContentSizeChange={()=>{if(focused)reveal()}} placeholder={placeholder} placeholderTextColor={c.textMuted} selectionColor={c.primary} underlineColorAndroid="transparent" style={[type.body,{outlineWidth:0,borderRadius:radii.control,paddingHorizontal:space.md,paddingVertical:space.sm,borderWidth:1,borderColor:error?role.danger.ink:focused?c.primary:c.border,backgroundColor:focused?c.card:c.inputBg,color:c.text,minHeight:minHeight??(multiline?104:control.compact),textAlignVertical:multiline?'top':'center',opacity:editable?1:.7}]}/>
    {error?<Copy variant="caption" style={{color:role.danger.ink}}>{error}</Copy>:helper?<Copy variant="caption" muted>{helper}</Copy>:null}
  </View>;
}
export type NoticeTone="info"|"success"|"warning"|"error";
/** 상태 안내 한 줄. 오류는 일어난 자리에서 무슨 일이 있었는지와 다음 행동을 함께 말한다. */
export function Notice({tone="info",children,actionLabel,onAction}:{tone?:NoticeTone;children:ReactNode;actionLabel?:string;onAction?:()=>void}){
  const role=colorRoles(useTheme()),kind=tone==="error"?role.danger:role[tone];
  const icon=({info:'information-circle',success:'checkmark-circle',warning:'alert-circle',error:'alert-circle'} as const)[tone];
  return <View accessibilityRole={tone==="error"?"alert":undefined} style={{flexDirection:'row',gap:space.xs,alignItems:'flex-start',padding:space.sm,borderRadius:radii.chip,backgroundColor:kind.soft}}>
    <Icon name={icon} size={18} color={kind.ink}/>
    <View style={{flex:1,alignItems:'flex-start'}}><Copy variant="caption">{children}</Copy>{actionLabel&&onAction?<Link label={actionLabel} onPress={onAction} muted={false}/>:null}</View>
  </View>;
}
/** 빈 상태. 왜 비어 있는지와 첫 행동을 내용이 나타날 자리에 둔다. */
export function EmptyState({title,description,actionLabel,onAction,peek=false,character,mood='cheer'}:{title:string;description?:string;actionLabel?:string;onAction?:()=>void;peek?:boolean;character?:AnimalCharacterId;mood?:MascotMood}){
  const content=<><Copy variant="section">{title}</Copy>{description?<Copy variant="body" muted>{description}</Copy>:null}{actionLabel&&onAction?<View style={{paddingTop:space.xs}}><Action label={actionLabel} onPress={onAction}/></View>:null}</>;
  return peek||character?<View><CharacterPeek character={character} mood={mood}/><CardView>{content}</CardView></View>:<View style={{gap:space.xs,paddingVertical:space.lg}}>{content}</View>;
}
/** 화면의 주인공 친구. 누르면 반응한다. 배경 없이 크게 그리고 몸 아래쪽이 잘리므로, 같은 View 안에서 바로 다음에 카드를 놓아 카드 뒤에서 내다보게 한다. */
export function CharacterPeek({character,action,mood,maxSize=characterSize.peekMax,interactive=true}:{character?:AnimalCharacterId;action?:AnimalActionId;mood?:MascotMood;maxSize?:number;interactive?:boolean}){
  const {width}=useWindowDimensions(),size=Math.min(maxSize,width*characterSize.peekWidthRatio);
  return <View pointerEvents={interactive?'box-none':'none'} style={{alignItems:'center',height:size*characterSize.peekVisible,overflow:'hidden'}}><View style={{marginTop:-size*characterSize.peekTopCrop}}><Mascot size={size} character={character} action={action} mood={mood}/></View></View>;
}
/** 불러오는 중. 무엇을 기다리는지 함께 적는다. */
export function LoadingState({label}:{label:string}){
  const {colors:c}=useTheme();
  return <View accessibilityLiveRegion="polite" style={[u.row,{gap:space.xs,paddingVertical:space.md}]}><ActivityIndicator size="small" color={c.primary}/><Copy variant="caption" muted>{label}</Copy></View>;
}
export function Progress({ value, label }: { value: number; label: string }) {
  const { colors: c } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const amount = useRef(new Animated.Value(Math.min(1, Math.max(0, value)))).current;
  useEffect(() => {
    const next = Math.min(1, Math.max(0, value));
    if (reduced) { amount.setValue(next); return; }
    const animation = Animated.timing(amount, { toValue: next, duration: motion.reward, easing: motion.ease, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [value, reduced, amount]);
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ height: 12, borderRadius: 6, backgroundColor: c.border, overflow: "hidden" }}>
    <Animated.View style={{ width: "100%", height: "100%", backgroundColor: c.primary, borderRadius: 6,
      transform: [{ translateX: amount.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) }, { scaleX: amount }] }} />
  </View>;
}
export { Mascot };
export type { MascotMood } from "./boriAssets";
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
function RingSegment({ amount, arc, length, rotation, locked, color }: {
  amount: number; arc: number; length: number; rotation: number; locked: boolean; color: string;
}) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(reduced ? amount : 0)).current;
  const [webAmount, setWebAmount] = useState(reduced ? amount : 0);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const listener = value.addListener(({ value: next }) => setWebAmount(next));
    return () => value.removeListener(listener);
  }, [value]);
  useEffect(() => {
    if (reduced) { value.setValue(amount); return; }
    const animation = Animated.timing(value, { toValue: amount, duration: 650, easing: motion.ease, useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [amount, reduced, value]);
  if (Platform.OS === "web") return <Circle cx="120" cy="120" r="100" stroke={color} strokeOpacity={locked ? 0.4 : 1} strokeWidth="17" fill="none"
    strokeDasharray={`${webAmount * arc} ${length - webAmount * arc}`} transform={`rotate(${rotation} 120 120)`} strokeLinecap="round" />;
  return <AnimatedCircle cx="120" cy="120" r="100" stroke={color} strokeOpacity={locked ? 0.4 : 1} strokeWidth="17" fill="none"
    strokeDasharray={value.interpolate({ inputRange: [0, 1], outputRange: [`0 ${length}`, `${arc} ${length - arc}`] })}
    transform={`rotate(${rotation} 120 120)`} strokeLinecap="round" />;
}
export function TimeRing({ paid, locked, children }: { paid: number[]; locked: boolean; children: ReactNode }) {
  const { colors: c } = useTheme();
  const radius = 100, length = 2 * Math.PI * radius;
  const budgets = [10, 20, 30]; let offset = 0;
  return <View style={{ width: 240, height: 240, alignSelf: "center", alignItems: "center", justifyContent: "center" }}>
    <Svg width="240" height="240" style={StyleSheet.absoluteFill}>
      {budgets.map((budget, i) => {
        const start = offset; offset += budget;
        const arc = budget / 60 * length - 9;
        const fill = Math.max(0, Math.min(1, paid[i] / budget)) * arc;
        return <React.Fragment key={i}>
          <Circle cx="120" cy="120" r={radius} stroke={c.border} strokeWidth="17" fill="none"
            strokeDasharray={`${arc} ${length - arc}`} transform={`rotate(${-90 + start / 60 * 360} 120 120)`} strokeLinecap="round" />
          {fill > 0 ? <RingSegment amount={Math.max(0, Math.min(1, paid[i] / budget))} arc={arc} length={length} rotation={-90 + start / 60 * 360} locked={locked} color={c.primary} /> : null}
        </React.Fragment>;
      })}
    </Svg>{children}
  </View>;
}
export function Icon({ name, size = 24, color }: { name: keyof typeof Ionicons.glyphMap; size?: number; color?: string }) {
  const { colors } = useTheme(); return <Ionicons name={name} size={size} color={color ?? colors.textMuted} />;
}
export const u = StyleSheet.create({
  header: { paddingHorizontal: gutter, paddingTop: space.xs, paddingBottom: space.sm, minHeight: control.touch + space.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.xs },
  title: type.title,
  page: { paddingHorizontal: gutter, gap: space.md, paddingBottom: space.xxl },
  card: { padding: space.lg, borderRadius: radii.card, gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  action: { flexDirection: "row", gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radii.control, alignItems: "center", justifyContent: "center" },
});
