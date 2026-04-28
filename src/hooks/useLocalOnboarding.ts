import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY_NOTIF_PROMPT_DONE = 'istant:onboarding:notifPromptDone';

export function useLocalOnboarding() {
  const [loading, setLoading] = useState(true);
  const [notifPromptDone, setNotifPromptDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(KEY_NOTIF_PROMPT_DONE);
        setNotifPromptDone(v === '1');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, notifPromptDone };
}

export async function setNotifPromptDoneLocal() {
  await AsyncStorage.setItem(KEY_NOTIF_PROMPT_DONE, '1');
}

