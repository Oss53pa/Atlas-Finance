import { useState, useEffect } from 'react';

const STORAGE_KEY = 'atlas-seen-tips';

function getSeenTips(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markSeen(tipId: string) {
  const seen = getSeenTips();
  seen.add(tipId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // ignore quota errors
  }
}

export function useFirstVisitTip(tipId: string) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    setShouldShow(!getSeenTips().has(tipId));
  }, [tipId]);

  const dismiss = () => {
    markSeen(tipId);
    setShouldShow(false);
  };

  return { shouldShow, dismiss };
}

export function resetAllTips() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
