import { useState, useEffect, useRef, useCallback } from 'react';
import { learningApi } from '../api';
import { getApiBaseUrl } from '@/shared/api/client';

export type PlaybackHookStatus = 'IDLE' | 'PREPARING' | 'READY' | 'ERROR';

export interface UsePlaybackState {
  status: PlaybackHookStatus;
  url: string | null;
  expiresAt: string | null;
  leaseId: string | null;
  errorMessage: string | null;
}

export interface UsePlaybackReturn extends UsePlaybackState {
  refreshUrl: () => Promise<void>;
}

/**
 * Hook to manage video playback lifecycle:
 * - Requests playback lease and presigned URL from backend
 * - Handles PREPARING status with automatic polling
 * - Maintains active lease with 60s heartbeat and pre-expiry URL refresh
 * - Releases lease on unmount and pagehide/beforeunload
 * - Exposes refreshUrl callback for error recovery
 */
export function usePlayback(lessonId: string): UsePlaybackReturn {
  const [status, setStatus] = useState<PlaybackHookStatus>('IDLE');
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeLessonIdRef = useRef(lessonId);
  const isMountedRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (heartbeatTimerRef.current !== null) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (expiryTimerRef.current !== null) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const sendBeaconRelease = useCallback((id: string) => {
    if (!id || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
      return;
    }
    try {
      const beaconUrl = `${getApiBaseUrl()}/student/learning/lessons/${id}/playback/release`;
      navigator.sendBeacon(beaconUrl);
    } catch (err) {
      // Non-fatal: sendBeacon may fail during teardown
      console.warn('usePlayback: sendBeacon release failed non-fatally:', err);
    }
  }, []);

  const doHeartbeat = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const res = await learningApi.heartbeatPlayback(id);
      if (!isMountedRef.current || activeLessonIdRef.current !== id) return;

      setUrl(res.url);
      setExpiresAt(res.expiresAt);

      // Re-schedule pre-expiry refresh based on new expiresAt
      scheduleExpiryRefresh(id, res.expiresAt);
    } catch (err) {
      // Non-fatal: heartbeat may fail on momentary glitch; refreshUrl can recover
      console.warn('usePlayback: heartbeat failed non-fatally:', err);
    }
  }, []);

  const scheduleExpiryRefresh = useCallback(
    (id: string, expiresAtStr: string) => {
      if (expiryTimerRef.current !== null) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
      const expiryTime = new Date(expiresAtStr).getTime();
      const now = Date.now();
      // Refresh 30 seconds before expiry (or in at least 3 seconds if imminent)
      const refreshInMs = Math.max(3000, expiryTime - now - 30_000);

      expiryTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && activeLessonIdRef.current === id) {
          void doHeartbeat(id);
        }
      }, refreshInMs);
    },
    [doHeartbeat],
  );

  const requestPlayback = useCallback(
    async (id: string) => {
      if (!id) return;
      clearAllTimers();
      setErrorMessage(null);
      setStatus('PREPARING');

      try {
        const res = await learningApi.getPlayback(id);
        if (!isMountedRef.current || activeLessonIdRef.current !== id) return;

        if (res.status === 'PREPARING') {
          setStatus('PREPARING');
          const delayMs = (res.retryAfterSec || 3) * 1000;
          pollTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && activeLessonIdRef.current === id) {
              void requestPlayback(id);
            }
          }, delayMs);
        } else if (res.status === 'READY') {
          setStatus('READY');
          setUrl(res.url);
          setExpiresAt(res.expiresAt);
          setLeaseId(res.leaseId);
          setErrorMessage(null);
          scheduleExpiryRefresh(id, res.expiresAt);
        }
      } catch (err: any) {
        if (!isMountedRef.current || activeLessonIdRef.current !== id) return;
        setStatus('ERROR');
        setErrorMessage(err?.message || 'Unable to load video playback');
      }
    },
    [clearAllTimers, scheduleExpiryRefresh],
  );

  const refreshUrl = useCallback(async () => {
    if (!lessonId) return;
    await requestPlayback(lessonId);
  }, [lessonId, requestPlayback]);

  // Main lifecycle effect
  useEffect(() => {
    isMountedRef.current = true;
    activeLessonIdRef.current = lessonId;

    if (lessonId) {
      void requestPlayback(lessonId);
    } else {
      clearAllTimers();
      setStatus('IDLE');
      setUrl(null);
      setExpiresAt(null);
      setLeaseId(null);
      setErrorMessage(null);
    }

    const handlePageHide = () => {
      if (lessonId) {
        sendBeaconRelease(lessonId);
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      clearAllTimers();
      if (lessonId) {
        sendBeaconRelease(lessonId);
        learningApi.releasePlayback(lessonId).catch(() => {});
      }
    };
  }, [lessonId, requestPlayback, clearAllTimers, sendBeaconRelease]);

  // 60-second periodic heartbeat while READY
  useEffect(() => {
    if (status !== 'READY' || !lessonId) return;

    const interval = setInterval(() => {
      void doHeartbeat(lessonId);
    }, 60_000);
    heartbeatTimerRef.current = interval;

    return () => {
      clearInterval(interval);
      if (heartbeatTimerRef.current === interval) {
        heartbeatTimerRef.current = null;
      }
    };
  }, [status, lessonId, doHeartbeat]);

  return {
    status,
    url,
    expiresAt,
    leaseId,
    errorMessage,
    refreshUrl,
  };
}
