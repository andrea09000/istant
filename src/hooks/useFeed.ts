import { useEffect, useState } from 'react';

import { subscribeAds, subscribeFeed } from '../lib/posts';
import type { PostDoc } from '../types';

const AD_EVERY_N_ORGANIC = 6;

function interleaveAds(
  items: (PostDoc & { id: string })[],
  everyNOrganic: number,
) {
  if (everyNOrganic <= 0) {
    return items;
  }

  const ads = items.filter((p) => Boolean(p.isAd));
  const organic = items.filter((p) => !p.isAd);
  if (ads.length === 0) {
    return organic;
  }

  const out: (PostDoc & { id: string })[] = [];
  let adIdx = 0;
  for (let i = 0; i < organic.length; i++) {
    out.push(organic[i]);
    const organicCount = i + 1;
    if (organicCount % everyNOrganic === 0) {
      out.push(ads[adIdx % ads.length]);
      adIdx += 1;
    }
  }

  return out;
}

export function useFeed(uid: string | undefined) {
  const [posts, setPosts] = useState<(PostDoc & { id: string })[]>([]);
  const [organic, setOrganic] = useState<(PostDoc & { id: string })[]>([]);
  const [ads, setAds] = useState<(PostDoc & { id: string })[]>([]);

  useEffect(() => {
    if (!uid) {
      setPosts([]);
      setOrganic([]);
      setAds([]);
      return;
    }
    const unsubOrganic = subscribeFeed(uid, (items) => {
      setOrganic(items.filter((p) => !p.isAd));
    }, 120);
    const unsubAds = subscribeAds((items) => {
      setAds(items);
    }, 60);
    return () => {
      try {
        unsubOrganic();
        unsubAds();
      } catch {
        // ignore
      }
    };
  }, [uid]);

  useEffect(() => {
    setPosts(interleaveAds([...organic, ...ads], AD_EVERY_N_ORGANIC));
  }, [organic, ads]);

  return { posts };
}
