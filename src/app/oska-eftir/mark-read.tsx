"use client";

import { useEffect } from "react";
import { UNREAD_EVENT } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

// Merkir tilkynningar lesnar þegar notandi hefur séð þær á síðunni
export function MarkNotificationsRead({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (!hasUnread) return;
    createClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .then(() => window.dispatchEvent(new Event(UNREAD_EVENT)));
  }, [hasUnread]);

  return null;
}
