import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAttendantPresence(currentConversationId?: string | null) {
  useEffect(() => {
    let alive = true;
    const beat = (status: "online" | "offline" | "ausente" | "ocupado" = "online") => {
      supabase.rpc("update_attendant_presence" as any, {
        p_status: status,
        p_current_conversation_id: currentConversationId ?? null,
      }).then(() => {});
    };
    beat("online");
    const t = setInterval(() => { if (alive) beat("online"); }, 30_000);
    const onHide = () => beat(document.visibilityState === "hidden" ? "ausente" : "online");
    const onUnload = () => beat("offline");
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      beat("offline");
    };
  }, [currentConversationId]);
}
