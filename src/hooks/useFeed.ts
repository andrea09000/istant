import { useEffect, useState } from 'react';

import { subscribeFeed } from '../lib/posts';
import type { PostDoc } from '../types';

export function useFeed(uid: string | undefined) {
  const [posts, setPosts] = useState<(PostDoc & { id: string })[]>([]);

  useEffect(() => {
    if (!uid) {
      setPosts([]);
      return;
    }
    const unsub = subscribeFeed(uid, setPosts, 100);
    return () => {
      try {
        unsub();
      } catch {
        // ignore
      }
    };
  }, [uid]);

  return { posts };
}
