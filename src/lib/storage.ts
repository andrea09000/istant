import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';

import { storage } from './firebase';

function assertStore() {
  if (!storage) {
    throw new Error('Storage not available');
  }
  return storage;
}

export async function uploadImage(path: string, localUri: string) {
  const s = assertStore();
  // Always convert to WebP before uploading (smaller + consistent)
  const converted = await ImageManipulator.manipulateAsync(
    localUri,
    [],
    { compress: 0.9, format: ImageManipulator.SaveFormat.WEBP },
  );

  const response = await fetch(converted.uri);
  const blob = await response.blob();
  const r = ref(s, path);
  await uploadBytes(r, blob, { contentType: 'image/webp' });
  return getDownloadURL(r);
}

export async function deleteImageByUrl(url: string) {
  const s = assertStore();
  await deleteObject(ref(s, url));
}

