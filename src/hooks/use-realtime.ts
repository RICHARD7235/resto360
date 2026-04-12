"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeConfig {
  /** Unique channel name (e.g. "orders-rt") */
  channel: string;
  /** Supabase table to subscribe to */
  table: string;
  /** Optional filter (e.g. "restaurant_id=eq.xxx") */
  filter?: string;
  /** Callback when a change is detected — typically a refetch function */
  onUpdate: () => void;
  /** Debounce delay in ms (default 100) */
  debounceMs?: number;
  /** Fallback polling interval in ms when WS disconnects (default 30000) */
  fallbackPollingMs?: number;
}

/**
 * Subscribes to Supabase Realtime changes on a table.
 * Debounces rapid updates and falls back to polling on WS disconnect.
 */
export function useRealtimeSubscription({
  channel: channelName,
  table,
  filter,
  onUpdate,
  debounceMs = 100,
  fallbackPollingMs = 30_000,
}: RealtimeConfig): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let channel: RealtimeChannel | null = null;

    const debouncedUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onUpdateRef.current();
      }, debounceMs);
    };

    const startFallbackPolling = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(() => {
        onUpdateRef.current();
      }, fallbackPollingMs);
    };

    const stopFallbackPolling = () => {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    // Build channel subscription
    channel = supabase.channel(channelName);

    const pgChangesConfig: {
      event: "*";
      schema: "public";
      table: string;
      filter?: string;
    } = {
      event: "*",
      schema: "public",
      table,
    };

    if (filter) {
      pgChangesConfig.filter = filter;
    }

    channel
      .on("postgres_changes", pgChangesConfig, () => {
        debouncedUpdate();
      })
      .on("system", {}, (payload: { extension: string; status: string; message: string }) => {
        if (payload.status === "error" || payload.message?.includes("disconnected")) {
          startFallbackPolling();
        } else if (payload.status === "ok") {
          stopFallbackPolling();
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          stopFallbackPolling();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          startFallbackPolling();
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      stopFallbackPolling();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channelName, table, filter, debounceMs, fallbackPollingMs]);
}
