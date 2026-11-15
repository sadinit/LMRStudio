export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 1200,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossibile leggere il file immagine.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato immagine non valido.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetW = Math.round(img.width * scale);
        const targetH = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function inlineLocalImagesForDownload(
  urls: string[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const url of urls) {
    if (
      !url ||
      url.startsWith('data:') ||
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read error'));
        reader.readAsDataURL(blob);
      });
      map[url] = dataUrl;
    } catch {
      // Keep original path if fetch fails
    }
  }
  return map;
}
