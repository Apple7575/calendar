import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useSession } from "../../hooks/useSession";
import { signInWithGoogle } from "../../lib/auth";
import { Action, Copy, Link } from "./ui";

export function AccountConnection({ onConnected,purpose='decks' }: { onConnected?: () => Promise<unknown>;purpose?:'decks'|'ai' }) {
  const { session, loading } = useSession();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const connect = async () => {
    if (busy || loading) return;
    setBusy(true); setError("");
    try {
      const result = await signInWithGoogle({ selectAccount: true });
      if (!result.canceled && alive.current) await onConnected?.();
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "구글 계정을 연결하지 못했어요."); }
    finally { if (alive.current) setBusy(false); }
  };
  return <View style={{ gap: 9 }}>
    <Copy muted size={12}>현재 앱 계정</Copy>
    <Copy weight="700">{loading ? "계정 확인 중…" : session?.user.email ?? (session ? "이메일을 확인할 수 없는 계정" : "구글 계정 연결이 필요해요")}</Copy>
    <Copy muted size={12}>{purpose==='ai'?'새 문제를 만들고 생성 결과를 보관할 계정을 연결해 주세요.':'컴퓨터 관리 화면에도 이 이메일이 표시돼야 해요. 이전 앱의 로그인 상태가 유지될 수 있어요.'}</Copy>
    {!session ? <Action label={busy ? "구글 연결 중…" : "구글 계정 연결"} disabled={loading || busy} onPress={() => void connect()} />
      : <Link label={busy ? "구글 연결 중…" : purpose==='ai'?"다른 구글 계정 선택":"컴퓨터와 같은 구글 계정 선택"} onPress={() => { if (!busy) void connect(); }} />}
    {error ? <Copy size={13}>{error}</Copy> : null}
  </View>;
}
