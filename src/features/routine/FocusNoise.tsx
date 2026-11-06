import React, {useEffect, useState} from 'react';
import {Modal, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FOCUS_NOISE_LABEL, FOCUS_NOISES, FocusNoise, shouldPlayFocusNoise} from '../../lib/focusNoise';
import {focusNoiseChoice, loadFocusNoise, saveFocusNoise, subscribeFocusNoise} from '../../lib/focusNoisePrefs';
import {setFocusNoise} from '../../lib/focusNoisePlayer';
import {ThemeOverride, useTheme} from '../../theme/ThemeContext';
import {focusTheme} from '../../theme/themes';
import {useRoutine} from './RoutineProvider';
import {Copy, Icon, Link} from './ui';
import {useReducedMotion} from './motion';
import type {Ionicons} from '@expo/vector-icons';

export function useFocusNoiseChoice(): FocusNoise {
  const [value, setValue] = useState(focusNoiseChoice());
  useEffect(() => { const off = subscribeFocusNoise(setValue); void loadFocusNoise().then(setValue); return off; }, []);
  return value;
}

/** Mounted once at the root: plays the chosen noise only while a focus run is running, anywhere in the app. */
export function FocusNoiseHost() {
  const {data} = useRoutine(), choice = useFocusNoiseChoice();
  const kind: FocusNoise = shouldPlayFocusNoise(choice, data.bookTimer) ? choice : 'off';
  useEffect(() => { void setFocusNoise(kind); }, [kind]);
  useEffect(() => () => { void setFocusNoise('off'); }, []);
  return null;
}

const ICON: Record<FocusNoise, keyof typeof Ionicons.glyphMap> = {off: 'volume-mute-outline', rain: 'rainy-outline', white: 'radio-outline', cafe: 'cafe-outline'};

/** Small button for the focus timer. Colours come from the caller because the timer has its own dark theme. */
export function FocusNoiseButton({color, phase}: {color: string; phase: 'focus' | 'break' | 'idle'}) {
  const reduced = useReducedMotion(), choice = useFocusNoiseChoice();
  const [open, setOpen] = useState(false);
  const resting = choice !== 'off' && phase === 'break';
  return <>
    <Pressable testID="focus-noise-button" accessibilityRole="button" accessibilityLabel={`집중 소리 · ${FOCUS_NOISE_LABEL[choice]}`} onPress={() => setOpen(true)} hitSlop={6}
      style={({pressed}) => ({minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 22, opacity: pressed ? 0.6 : 1})}>
      <Icon name={ICON[choice]} size={18} color={color}/>
      <Text style={{color, fontSize: 13, fontWeight: '600'}}>{choice === 'off' ? '소리' : resting ? `${FOCUS_NOISE_LABEL[choice]} · 휴식 중 멈춤` : FOCUS_NOISE_LABEL[choice]}</Text>
    </Pressable>
    <Modal visible={open} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setOpen(false)}>
      {/* The timer always uses the dark focus colours, whatever theme the app is in; the sheet follows it (Diana). */}
      {open ? <ThemeOverride theme={focusTheme}><FocusNoiseSheet choice={choice} close={() => setOpen(false)}/></ThemeOverride> : null}
    </Modal>
  </>;
}

function FocusNoiseSheet({choice, close}: {choice: FocusNoise; close: () => void}) {
  const {colors: c} = useTheme(), insets = useSafeAreaInsets();
  const [error, setError] = useState('');
  const pick = (value: FocusNoise) => { setError(''); void saveFocusNoise(value).then(close).catch(() => setError('설정을 저장하지 못했어요. 다시 눌러 주세요.')); };
  return <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,30,25,0.35)'}}>
    <Pressable accessibilityRole="button" accessibilityLabel="집중 소리 닫기" onPress={close} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}/>
    <View testID="focus-noise-sheet" style={{borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: c.card, paddingHorizontal: 22, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16), gap: 6}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}><Copy size={20} weight="800">집중 소리</Copy><Link label="닫기" onPress={close}/></View>
      <Copy muted size={13}>집중하는 동안만 나오고, 휴식이 시작되면 멈춰요. 다른 앱 음악과 같이 들을 수 있어요.</Copy>
      <View accessibilityRole="radiogroup" style={{marginTop: 6}}>{FOCUS_NOISES.map((value, index) => {
        const selected = choice === value;
        return <Pressable key={value} accessibilityRole="radio" accessibilityState={{checked: selected}} aria-checked={selected} accessibilityLabel={FOCUS_NOISE_LABEL[value]} onPress={() => pick(value)}
          style={({pressed}) => ({minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, borderBottomWidth: index < FOCUS_NOISES.length - 1 ? 1 : 0, borderColor: c.border, backgroundColor: pressed ? c.primarySoft : 'transparent'})}>
          <Icon name={ICON[value]} size={20}/>
          <View style={{flex: 1}}><Copy weight={selected ? '800' : '500'}>{FOCUS_NOISE_LABEL[value]}</Copy></View>
          {selected ? <Icon name="checkmark" size={20} color={c.primary}/> : null}
        </Pressable>;
      })}</View>
      {error ? <Copy size={13}>{error}</Copy> : null}
    </View>
  </View>;
}
