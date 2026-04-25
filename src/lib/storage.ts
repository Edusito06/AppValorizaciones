import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function uploadFotoPartida(file: File, folder: string): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`La foto no puede superar ${MAX_SIZE_MB}MB`);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Solo se permiten imágenes JPG, PNG o WebP');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, `partidas_fotos/${folder}/${fileName}`);

  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
