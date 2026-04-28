import { useEffect, useState } from 'react';

import { getUser, subscribeUser } from '../lib/users';
import type { UserProfile } from '../types';

export function useUserProfile(
  uid: string | undefined,
  opts?: { subscribe: boolean },
) {
  const subscribe = opts?.subscribe !== false;
  const [p, setP] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    if (!uid) {
      setP(null);
      return;
    }
    if (subscribe) {
      return subscribeUser(uid, (doc) => setP(doc));
    }
    (async () => {
      setP(await getUser(uid!));
    })();
  }, [uid, subscribe]);

  return p;
}
