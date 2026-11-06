import { AutomaticDayNotes } from "../features/routine/AutomaticDayNotes";
import {Mascot,Copy,Link} from '../features/routine/ui';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from "expo-image-picker";
import { ArrowUp } from "phosphor-react-native/src/icons/ArrowUp";
import { Camera } from "phosphor-react-native/src/icons/Camera";
import { ChatsCircle } from "phosphor-react-native/src/icons/ChatsCircle";
import { Heartbeat } from "phosphor-react-native/src/icons/Heartbeat";
import { Lightning } from "phosphor-react-native/src/icons/Lightning";
import { MinusCircle } from "phosphor-react-native/src/icons/MinusCircle";
import { PencilSimpleLine } from "phosphor-react-native/src/icons/PencilSimpleLine";
import { PlusCircle } from "phosphor-react-native/src/icons/PlusCircle";
import { Sparkle } from "phosphor-react-native/src/icons/Sparkle";
import { X } from "phosphor-react-native/src/icons/X";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Confetti } from "../components/cute/Confetti";
import { MoodFace } from "../components/cute/MoodFace";
import { MicButton } from "../components/MicButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { linkDiaryToGoals } from "../lib/goals";
import {
  DiaryQuestion,
  generateDiaryQuestions,
  generateHighlight,
  parseDiaryDictation,
} from "../lib/aiHelper";
import { formatKoreanDate } from "../lib/dateUtils";
import {
  addPhoto,
  deletePhoto,
  DiaryPhoto,
  getDiaryWithPhotos,
  parseExifGps,
  parseExifTakenAt,
  recentPeople,
  setCoverPhoto,
  toViewerPhoto,
  upsertDiary,
} from "../lib/diary";
import { placeNameOf } from "../lib/location";
import { fetchSleepHours, isHealthAvailable } from "../lib/health";
import { RootScreenProps } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const THUMB = 96;
const MOODS = ["😊", "🙂", "😐", "😢", "😠"] as const;

export function DiaryEditScreen({ route, navigation }: RootScreenProps<"DiaryEdit">) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { date } = route.params;
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [photos, setPhotos] = useState<DiaryPhoto[]>([]);
  const [pending, setPending] = useState<
    { uri: string; takenAt: string | null; gps: { lat: number; lng: number } | null }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [photosOpen,setPhotosOpen]=useState(false),[conditionOpen,setConditionOpen]=useState(false);
  // 말로 쓰기: 전사 결과 확인 → AI가 기분/에너지/수면/감사/사람/본문으로 분류
  // (TestFlight 빌드에서는 말하는 동안 실시간으로 텍스트가 카드에 흐른다)
  const [transcript, setTranscript] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [classifying, setClassifying] = useState(false);

  const applyDictation = async () => {
    if (!transcript) return;
    setClassifying(true);
    try {
      const r = await parseDiaryDictation(transcript);
      const filled: string[] = [];
      if (r.mood) {
        setMood(r.mood);
        filled.push(`기분 ${r.mood}`);
      }
      if (r.energy != null) {
        setEnergy(Math.min(5, Math.max(1, Math.round(r.energy))));
        filled.push(`에너지 ${r.energy}`);
      }
      if (r.sleepHours != null) {
        setSleepHours(r.sleepHours);
        filled.push(`수면 ${r.sleepHours}시간`);
      }
      if (r.gratitude) {
        setGratitude(r.gratitude);
        filled.push("감사");
      }
      if (r.people.length > 0) {
        setPeople((prev) => [...new Set([...prev, ...r.people])]);
        filled.push(`함께한 사람 ${r.people.length}명`);
      }
      if (r.content.trim()) {
        setContent((prev) =>
          prev.trim() ? `${prev.trimEnd()}\n${r.content.trim()}` : r.content.trim()
        );
        filled.push("본문");
      }
      setTranscript(null);
      Alert.alert(
        "채웠어요 ✨",
        filled.length > 0 ? filled.join(" · ") : "분류할 내용을 찾지 못했어요."
      );
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "분류에 실패했어요.");
    } finally {
      setClassifying(false);
    }
  };

  // 질문-답변 모드
  const [writeMode, setWriteMode] = useState<"free" | "qa">("free");
  const [questions, setQuestions] = useState<DiaryQuestion[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [customAnswer, setCustomAnswer] = useState("");

  // 추가 기록 필드
  const [highlight, setHighlight] = useState("");
  const [generatingHighlight, setGeneratingHighlight] = useState(false);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [people, setPeople] = useState<string[]>([]);
  const [peopleInput, setPeopleInput] = useState("");
  const [peopleSuggestions, setPeopleSuggestions] = useState<string[]>([]);
  const [gratitude, setGratitude] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({ title: formatKoreanDate(date) });
  }, [navigation, date]);

  useEffect(() => {
    getDiaryWithPhotos(date)
      .then(({ diary, photos: rows }) => {
        setContent(diary?.content ?? "");
        setMood(diary?.mood ?? null);
        setHighlight(diary?.highlight ?? "");
        setEnergy(diary?.energy ?? null);
        setSleepHours(diary?.sleep_hours != null ? Number(diary.sleep_hours) : null);
        setPeople(diary?.people ?? []);
        setGratitude(diary?.gratitude ?? "");
        setPhotos(rows);
      })
      .catch((e) => {
        Alert.alert("오류", e instanceof Error ? e.message : "일기를 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
    recentPeople().then(setPeopleSuggestions).catch(() => {});
  }, [date]);

  const addPerson = (name: string) => {
    const trimmed = name.trim().replace(/,$/, "");
    if (!trimmed) return;
    setPeople((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setPeopleInput("");
  };

  const handleGenerateHighlight = async () => {
    if (!content.trim()) {
      Alert.alert("알림", "일기 내용을 먼저 써 주세요.");
      return;
    }
    setGeneratingHighlight(true);
    try {
      setHighlight(await generateHighlight(content, mood));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "한 줄 요약에 실패했어요.");
    } finally {
      setGeneratingHighlight(false);
    }
  };

  const allViewerPhotos = [
    ...photos.map(toViewerPhoto),
    ...pending.map((p) => ({ url: p.uri, takenAt: p.takenAt })),
  ];

  const enterQaMode = async () => {
    setWriteMode("qa");
    if (questions !== null) return;
    setLoadingQuestions(true);
    try {
      const qs = await generateDiaryQuestions(date, mood);
      setQuestions(qs);
      setQIndex(0);
    } catch (e) {
      setWriteMode("free");
      Alert.alert(
        "오류",
        e instanceof Error ? e.message : "질문을 만들지 못했어요. 자유 작성으로 써 주세요."
      );
    } finally {
      setLoadingQuestions(false);
    }
  };

  const appendAnswer = (question: string, answer: string) => {
    const block = `Q. ${question}\n${answer.trim()}\n\n`;
    setContent((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${block}` : block));
    setCustomAnswer("");
    if (questions && qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
    } else {
      setWriteMode("free");
    }
  };

  const skipQuestion = () => {
    if (questions && qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
    } else {
      setWriteMode("free");
    }
  };

  const openViewer = (index: number) => {
    navigation.navigate("PhotoViewer", { photos: allViewerPhotos, index });
  };

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
      exif: true,
    });
    if (result.canceled) return;
    setPending((prev) => [
      ...prev,
      ...result.assets.map((a) => ({
        uri: a.uri,
        takenAt: parseExifTakenAt(a.exif),
        gps: parseExifGps(a.exif),
      })),
    ]);
  };

  const removePending = (uri: string) => {
    setPending((prev) => prev.filter((p) => p.uri !== uri));
  };

  const photoMenu = (photo: DiaryPhoto) => {
    Alert.alert("사진", undefined, [
      {
        text: "⭐ 대표사진 (달력 배경으로)",
        onPress: async () => {
          try {
            await setCoverPhoto(date, photo);
            setPhotos((prev) => prev.map((p) => ({ ...p, is_cover: p.id === photo.id })));
            Alert.alert("설정 완료", "이 사진이 달력에서 그 날의 배경이 됐어요.");
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "대표사진 설정에 실패했어요.");
          }
        },
      },
      { text: "삭제", style: "destructive", onPress: () => removeSaved(photo) },
      { text: "취소", style: "cancel" },
    ]);
  };

  const removeSaved = (photo: DiaryPhoto) => {
    Alert.alert("사진 삭제", "이 사진을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePhoto(photo);
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "사진 삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!content.trim() && photos.length === 0 && pending.length === 0 && !mood) {
      Alert.alert("알림", "내용, 사진, 기분 중 하나 이상을 넣어 주세요.");
      return;
    }
    setSaving(true);
    try {
      // 한 줄이 비어 있으면 AI로 자동 추출 (실패해도 저장은 진행)
      let finalHighlight = highlight.trim();
      if (!finalHighlight && content.trim()) {
        try {
          finalHighlight = await generateHighlight(content, mood);
          setHighlight(finalHighlight);
        } catch {
          // AI 미설정/실패 시 하이라이트 없이 저장
        }
      }
      const diary = await upsertDiary(date, {
        content: content.trim(),
        mood,
        highlight: finalHighlight || null,
        energy,
        sleepHours,
        people,
        gratitude: gratitude.trim() || null,
      });
      let position = photos.length;
      const failed: typeof pending = [];
      for (const p of pending) {
        try {
          const location = p.gps
            ? { ...p.gps, place: await placeNameOf(p.gps.lat, p.gps.lng) }
            : null;
          await addPhoto(diary, p.uri, position++, { takenAt: p.takenAt, location });
        } catch {
          failed.push(p);
        }
      }
      if (failed.length > 0) {
        setPending(failed);
        Alert.alert("안내", `사진 ${failed.length}장은 업로드하지 못했어요. 다시 저장해 보세요.`);
      } else {
        // 목표 진전 자동 기록 (백그라운드, 실패 무시)
        void linkDiaryToGoals(date, content);
        // 컨페티 한 번 보여주고 닫기
        setCelebrate(true);
        navigation.replace('DiaryDetail',{date,saved:true});
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "일기 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const photoSection=<>
        {/* 사진 — 맨 위. 길게 누르면 대표사진(달력 배경)/삭제 메뉴 */}
        <View style={styles.photoGrid}>
          {photos.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => openViewer(i)}
              onLongPress={() => photoMenu(p)}
            >
              <Image source={{ uri: p.url }} style={styles.thumb} />
              {p.is_cover ? <Text style={styles.coverBadge}>⭐</Text> : null}
            </TouchableOpacity>
          ))}
          {pending.map((p, i) => (
            <TouchableOpacity
              key={p.uri}
              onPress={() => openViewer(photos.length + i)}
              onLongPress={() => removePending(p.uri)}
            >
              <Image source={{ uri: p.uri }} style={[styles.thumb, styles.thumbPending]} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addThumb} onPress={pickPhotos}>
            <Camera size={26} color={c.textMuted} />
            <Text style={styles.addThumbLabel}>사진</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 || pending.length > 0 ? (
          <Text style={styles.hint}>
            누르면 크게 보고, 길게 누르면 ⭐대표사진(달력 배경)·삭제 메뉴가 열려요.
          </Text>
        ) : null}


  </>;
  const moodSection=<>
        <View style={styles.moodRow}>
          <Text style={styles.moodLabel}>오늘 기분</Text>
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.moodChip, mood === m && styles.moodChipSelected]}
              onPress={() => setMood(mood === m ? null : m)}
            >
              <MoodFace mood={m} size={30} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 에너지 / 수면 */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>에너지</Text>
            <View style={styles.energyRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setEnergy(energy === v ? null : v)}
                  hitSlop={4}
                >
                  <Lightning
                    size={22}
                    weight={energy !== null && v <= energy ? "fill" : "regular"}
                    color={energy !== null && v <= energy ? "#FFB020" : c.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.sleepLabelRow}>
              <Text style={styles.metaLabel}>수면</Text>
              {isHealthAvailable() ? (
                <TouchableOpacity
                  hitSlop={6}
                  onPress={async () => {
                    try {
                      const hours = await fetchSleepHours(date);
                      if (hours === null) {
                        Alert.alert("알림", "건강 앱에 그날 수면 기록이 없어요.");
                      } else {
                        setSleepHours(hours);
                      }
                    } catch (e) {
                      Alert.alert(
                        "오류",
                        e instanceof Error ? e.message : "건강 데이터를 읽지 못했어요."
                      );
                    }
                  }}
                >
                  <Heartbeat size={18} weight="duotone" color={c.danger} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.sleepRow}>
              <TouchableOpacity
                onPress={() =>
                  setSleepHours(sleepHours === null ? 7 : Math.max(0, sleepHours - 0.5))
                }
                hitSlop={6}
              >
                <MinusCircle size={22} color={c.primary} />
              </TouchableOpacity>
              <Text style={styles.sleepText}>
                {sleepHours === null ? "기록 안 함" : `${sleepHours}시간`}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setSleepHours(sleepHours === null ? 7 : Math.min(24, sleepHours + 0.5))
                }
                hitSlop={6}
              >
                <PlusCircle size={22} color={c.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>


  </>;
  const writingSection=<>
        {/* 작성 모드 토글 */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeChip, writeMode === "free" && styles.modeChipActive]}
            onPress={() => setWriteMode("free")}
          >
            <PencilSimpleLine
              size={13}
              color={writeMode === "free" ? c.primary : c.textMuted}
            />
            <Text style={[styles.modeChipText, writeMode === "free" && styles.modeChipTextActive]}>
              자유 작성
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, writeMode === "qa" && styles.modeChipActive]}
            onPress={enterQaMode}
          >
            <ChatsCircle
              size={13}
              color={writeMode === "qa" ? c.primary : c.textMuted}
            />
            <Text style={[styles.modeChipText, writeMode === "qa" && styles.modeChipTextActive]}>
              질문으로 쓰기
            </Text>
          </TouchableOpacity>
        </View>

        {/* 질문-답변 카드 */}
        {writeMode === "qa" ? (
          <View style={styles.qaCard}>
            {loadingQuestions || !questions ? (
              <View style={styles.qaLoading}>
                <ActivityIndicator color={c.primary} />
                <Text style={styles.qaLoadingText}>오늘에 맞는 질문을 만드는 중…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.qaProgress}>
                  질문 {qIndex + 1} / {questions.length}
                </Text>
                <Text style={styles.qaQuestion}>{questions[qIndex].question}</Text>
                <View style={styles.qaOptions}>
                  {questions[qIndex].options.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.qaOption}
                      onPress={() => appendAnswer(questions[qIndex].question, opt)}
                    >
                      <Text style={styles.qaOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.qaCustomRow}>
                  <TextInput
                    style={styles.qaCustomInput}
                    placeholder="직접 답하기"
                    placeholderTextColor={c.textMuted}
                    value={customAnswer}
                    onChangeText={setCustomAnswer}
                    onSubmitEditing={() =>
                      customAnswer.trim() &&
                      appendAnswer(questions[qIndex].question, customAnswer)
                    }
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.qaCustomSend, !customAnswer.trim() && { opacity: 0.4 }]}
                    disabled={!customAnswer.trim()}
                    onPress={() => appendAnswer(questions[qIndex].question, customAnswer)}
                  >
                    <ArrowUp size={16} weight="bold" color={c.white} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={skipQuestion} hitSlop={8}>
                  <Text style={styles.qaSkip}>
                    {qIndex + 1 < questions.length ? "건너뛰기" : "질문 끝내기"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        <View>
          <TextInput
            style={[styles.diaryInput,{backgroundColor:"transparent",borderWidth:0,padding:0,minHeight:190,fontSize:18,lineHeight:29}]}
            placeholder={
              writeMode === "qa"
                ? "답변을 고르면 여기에 일기가 쌓여요."
                : "오늘 하루는 어땠나요? (🎙️로 말해도 돼요)"
            }
            placeholderTextColor={c.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
          />
          {/* 음성 일기: 전사 → 아래 확인 카드에서 분류/붙이기 선택 */}
          <View style={styles.micWrap}>
            <MicButton
              onText={setTranscript}
              onPartial={setTranscript}
              onListeningChange={setListening}
            />
          </View>
        </View>

        {/* 쓴 일기 듣기 — 배속·구간·쉐도잉 플레이어로 */}
        {content.trim() ? (
          <TouchableOpacity
            style={styles.listenRow}
            onPress={() => navigation.navigate("DiaryListen", { text: content })}
            hitSlop={6}
          >
            <Text style={styles.listenText}>🎧 듣기 · 쉐도잉</Text>
          </TouchableOpacity>
        ) : null}

        {/* 받아쓰기 카드 — 실시간(빌드)/종료 후(Expo Go) 인식 내용을 보여준다 */}
        {listening && !transcript ? (
          <View style={styles.dictCard}>
            <Text style={styles.dictLabel}>🎙️ 듣고 있어요… 말해 보세요</Text>
          </View>
        ) : null}
        {transcript ? (
          <View style={styles.dictCard}>
            <Text style={styles.dictLabel}>
              {listening ? "🎙️ 듣는 중… (끝나면 마이크를 다시 누르세요)" : "🎙️ 이렇게 들었어요"}
            </Text>
            <Text style={styles.dictText}>{transcript}</Text>
            {/* 버튼들은 말이 끝난 뒤에만 */}
            {!listening ? (
              <>
                <TouchableOpacity
                  style={styles.dictPrimary}
                  onPress={applyDictation}
                  disabled={classifying}
                >
                  {classifying ? (
                    <ActivityIndicator size="small" color={c.white} />
                  ) : (
                    <Text style={styles.dictPrimaryText}>✨ 자동 분류해서 채우기</Text>
                  )}
                </TouchableOpacity>
                <View style={styles.dictRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setContent((prev) =>
                        prev.trim() ? `${prev.trimEnd()} ${transcript}` : transcript
                      );
                      setTranscript(null);
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.dictSecondaryText}>본문에 그대로 붙이기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setTranscript(null)} hitSlop={6}>
                    <Text style={styles.dictDiscard}>버리기</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.dictHint}>
                  "기분은 좋음, 에너지 4, 수면 6시간, 감사한 건 ○○" 처럼 말하면 각 칸으로 쏙
                  들어가요.
                </Text>
              </>
            ) : null}
          </View>
        ) : null}


  </>;
  const extraSection=<>
        {/* 오늘의 한 줄 */}
        <Text style={styles.fieldLabel}>
          오늘의 한 줄 <Text style={styles.fieldHint}>(비워두면 저장할 때 AI가 뽑아줘요)</Text>
        </Text>
        <View style={styles.highlightRow}>
          <TextInput
            style={styles.fieldInput}
            placeholder="오늘을 한 줄로 남긴다면?"
            placeholderTextColor={c.textMuted}
            value={highlight}
            onChangeText={setHighlight}
          />
          <TouchableOpacity
            style={styles.highlightButton}
            onPress={handleGenerateHighlight}
            disabled={generatingHighlight}
          >
            {generatingHighlight ? (
              <ActivityIndicator size="small" color={c.white} />
            ) : (
              <Sparkle size={16} weight="fill" color={c.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* 감사 한 가지 */}
        <Text style={styles.fieldLabel}>감사 한 가지</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="오늘 고마웠던 것 하나"
          placeholderTextColor={c.textMuted}
          value={gratitude}
          onChangeText={setGratitude}
        />

        {/* 함께한 사람 */}
        <Text style={styles.fieldLabel}>함께한 사람</Text>
        <View style={styles.peopleWrap}>
          {people.map((p) => (
            <TouchableOpacity
              key={p}
              style={styles.personChip}
              onPress={() => setPeople((prev) => prev.filter((x) => x !== p))}
            >
              <Text style={styles.personChipText}>{p}</Text>
              <X size={12} weight="bold" color={c.primary} />
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.personInput}
            placeholder={people.length === 0 ? "이름 입력 후 엔터" : "+ 추가"}
            placeholderTextColor={c.textMuted}
            value={peopleInput}
            onChangeText={(t) => {
              if (t.endsWith(",") || t.endsWith(" ")) addPerson(t);
              else setPeopleInput(t);
            }}
            onSubmitEditing={() => addPerson(peopleInput)}
            returnKeyType="done"
          />
        </View>
        {peopleSuggestions.filter((s) => !people.includes(s)).length > 0 ? (
          <View style={styles.peopleSuggestRow}>
            {peopleSuggestions
              .filter((s) => !people.includes(s))
              .slice(0, 6)
              .map((s) => (
                <TouchableOpacity key={s} style={styles.suggestChip} onPress={() => addPerson(s)}>
                  <Text style={styles.suggestChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
          </View>
        ) : null}


  </>;
  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}><View style={{paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Copy weight="700">{formatKoreanDate(date)}</Copy><Link label="닫기" onPress={()=>navigation.goBack()}/></View><KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <View style={[styles.hero,{flexDirection:'row',alignItems:'center',gap:14}]}><Mascot size={76} action="A51"/><View style={{flex:1}}><Text style={[styles.heroTitle,{fontSize:23}]}>오늘, 기억하고 싶은 순간은?</Text><Text style={styles.heroSubtitle}>한 줄, 목소리, 사진. 편한 만큼만 남겨요.</Text></View></View>
        <View style={styles.surfaceCard}>{writingSection}</View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="사진 선택 항목" onPress={()=>setPhotosOpen(!photosOpen)} style={styles.surfaceCard}><Text style={styles.sectionTitle}>사진 {photos.length+pending.length?`${photos.length+pending.length}장`:'추가'} {photosOpen?'접기':'+'}</Text><Text style={styles.heroSubtitle}>선택 · 작은 장면을 사진으로 남겨요.</Text></TouchableOpacity>{photosOpen?<View style={styles.surfaceCard}>{photoSection}</View>:null}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="기분·수면 선택 항목" onPress={()=>setConditionOpen(!conditionOpen)} style={styles.surfaceCard}><Text style={styles.sectionTitle}>기분·수면 {mood??''} {conditionOpen?'접기':'+'}</Text><Text style={styles.heroSubtitle}>선택 · 모두 채우지 않아도 저장할 수 있어요.</Text></TouchableOpacity>{conditionOpen?<View style={styles.surfaceCard}>{moodSection}</View>:null}
        <AutomaticDayNotes date={date}/>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="선택 기록 펼치기" onPress={()=>setDetailsOpen(!detailsOpen)} style={styles.surfaceCard}><Text style={styles.sectionTitle}>{detailsOpen?'선택 기록 접기':'한 줄 요약·감사·함께한 사람'}</Text><Text style={styles.heroSubtitle}>남기고 싶은 것만 적어보세요.</Text></TouchableOpacity>
        {detailsOpen?<View style={styles.surfaceCard}>{extraSection}</View>:null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="하루 기록 저장" onPress={handleSave} loading={saving} />
      </View>
      <Confetti visible={celebrate} onDone={() => setCelebrate(false)} />
    </KeyboardAvoidingView></SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
    },
    content: { padding:16,gap:16,paddingBottom:28 },
    hero:{paddingHorizontal:4,paddingVertical:8},
    heroTitle:{fontSize:27,lineHeight:36,fontWeight:'800',color:c.text},
    heroSubtitle:{fontSize:14,lineHeight:22,color:c.textMuted,marginTop:4},
    surfaceCard:{padding:20,borderRadius:24,backgroundColor:c.card},
    sectionTitle:{fontSize:18,fontWeight:'700',color:c.text,marginBottom:12},
    moodRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
    moodLabel: {
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.text,
      marginRight: spacing.sm,
    },
    moodChip: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.xs,
    },
    moodChipSelected: {
      backgroundColor: c.primarySoft,
      borderWidth: 2,
      borderColor: c.primary,
    },
    moodEmoji: { fontSize: 24 },
    metaRow: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radii.button,
      padding: spacing.sm + 2,
    },
    metaCol: { flex: 1, gap: 4 },
    metaLabel: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    energyRow: { flexDirection: "row", gap: 2 },
    sleepLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    sleepRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    sleepText: { fontSize: fontSizes.small, fontWeight: "700", color: c.text, minWidth: 66, textAlign: "center" },
    fieldLabel: {
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.text,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    fieldHint: { fontWeight: "400", fontSize: fontSizes.caption, color: c.textMuted },
    fieldInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSizes.body,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    highlightRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    highlightButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    peopleWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.xs + 2,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
    },
    personChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: c.primarySoft,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
    },
    personChipText: { fontSize: fontSizes.small, color: c.primary, fontWeight: "600" },
    personInput: {
      minWidth: 110,
      flex: 1,
      fontSize: fontSizes.small,
      color: c.text,
      paddingVertical: 4,
    },
    peopleSuggestRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2, marginTop: spacing.xs + 2 },
    suggestChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
    },
    suggestChipText: { fontSize: fontSizes.caption, color: c.textMuted },
    modeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
    modeChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 2,
      backgroundColor: c.surface,
    },
    modeChipActive: { backgroundColor: c.primarySoft },
    modeChipText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    modeChipTextActive: { color: c.primary },
    qaCard: {
      backgroundColor: c.surface,
      borderRadius: radii.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    qaLoading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    qaLoadingText: { color: c.textMuted, fontSize: fontSizes.small },
    qaProgress: { fontSize: fontSizes.caption, fontWeight: "700", color: c.primary },
    qaQuestion: {
      fontSize: fontSizes.emphasis,
      fontWeight: "700",
      color: c.text,
      lineHeight: 25,
    },
    qaOptions: { gap: spacing.xs + 2 },
    qaOption: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
    },
    qaOptionText: { fontSize: fontSizes.body, color: c.text },
    qaCustomRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    qaCustomInput: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      fontSize: fontSizes.body,
      color: c.text,
    },
    qaCustomSend: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    qaSkip: {
      fontSize: fontSizes.small,
      color: c.textMuted,
      textAlign: "center",
      paddingVertical: 2,
    },
    micWrap: { position: "absolute", right: spacing.sm, bottom: spacing.sm },
    listenRow: { alignSelf: "flex-end", marginTop: spacing.xs },
    listenText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.primary },
    dictCard: {
      backgroundColor: c.primarySoft,
      borderRadius: radii.card,
      padding: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    dictLabel: { fontSize: fontSizes.caption, fontWeight: "800", color: c.primary },
    dictText: { fontSize: fontSizes.small, color: c.text, lineHeight: 21 },
    dictPrimary: {
      backgroundColor: c.primary,
      borderRadius: 999,
      paddingVertical: spacing.sm + 4,
      alignItems: "center",
    },
    dictPrimaryText: { color: c.white, fontSize: fontSizes.small, fontWeight: "800" },
    dictRow: { flexDirection: "row", justifyContent: "space-between" },
    dictSecondaryText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.primary },
    dictDiscard: { fontSize: fontSizes.caption, fontWeight: "700", color: c.danger },
    dictHint: { fontSize: fontSizes.caption, color: c.textMuted, lineHeight: 16 },
    coverBadge: {
      position: "absolute",
      top: 4,
      right: 4,
      fontSize: 14,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowRadius: 3,
    },
    diaryInput: {
      minHeight: 180,
      fontSize: fontSizes.body,
      color: c.text,
      lineHeight: 26,
      textAlignVertical: "top",
      padding: spacing.sm,
    },
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: radii.button,
      backgroundColor: c.surface,
    },
    thumbPending: { opacity: 0.85 },
    addThumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: radii.button,
      borderWidth: 2,
      borderColor: c.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    addThumbLabel: { fontSize: fontSizes.caption, color: c.textMuted },
    hint: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: spacing.sm },
    footer: {
      padding: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
  });
