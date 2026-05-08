import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useConversationTyping(conversationId: string | null | undefined, draft: string) {
  const typingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    const isTyping = draft.length > 0;
    if (isTyping && !typingRef.current) {
      typingRef.current = true;
      supabase.rpc("set_typing" as any, { p_conversation_id: conversationId, p_is_typing: true });
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (typingRef.current) {
        typingRef.current = false;
        supabase.rpc("set_typing" as any, { p_conversation_id: conversationId, p_is_typing: false });
      }
    }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [draft, conversationId]);

  useEffect(() => {
    return () => {
      if (conversationId && typingRef.current) {
        supabase.rpc("set_typing" as any, { p_conversation_id: conversationId, p_is_typing: false });
        typingRef.current = false;
      }
    };
  }, [conversationId]);
}
