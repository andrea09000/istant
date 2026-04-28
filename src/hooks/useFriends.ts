import { useEffect, useState } from 'react';

import { subscribeAcceptedFriends, subscribeCloseFriends, subscribePendingIncoming } from '../lib/friends';

export function usePendingIncoming(myUid: string | undefined) {
  const [items, setItems] = useState<{ id: string; fromUid: string }[]>([]);
  useEffect(() => {
    if (!myUid) {
      setItems([]);
      return;
    }
    return subscribePendingIncoming(myUid, setItems);
  }, [myUid]);
  return items;
}

export function useFriendUids(myUid: string | undefined) {
  const [uids, setUids] = useState<string[]>([]);
  useEffect(() => {
    if (!myUid) {
      setUids([]);
      return;
    }
    return subscribeAcceptedFriends(myUid, setUids);
  }, [myUid]);
  return uids;
}

export function useCloseFriendUids(myUid: string | undefined) {
  const [uids, setUids] = useState<string[]>([]);
  useEffect(() => {
    if (!myUid) {
      setUids([]);
      return;
    }
    return subscribeCloseFriends(myUid, setUids);
  }, [myUid]);
  return uids;
}
