// Conversão de arquivos para base64 (data URL) — os arquivos são salvos
// direto no Firestore, sem passar pelo Firebase Storage.

const MAX_IMAGE_DIM = 1000; // px no lado maior

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Falha ao ler "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(`"${file.name}" é uma imagem inválida.`)); };
    img.src = objectUrl;
  });
}

/**
 * Redimensiona a imagem para no máx. 1000px e converte para JPEG,
 * reduzindo a qualidade até o data URL caber em `maxKB`.
 * (O Firestore limita cada documento a ~1MB, então o base64 precisa ser enxuto.)
 */
export async function imageToCompressedDataUrl(file: File, maxKB: number): Promise<string> {
  const img = await loadImageElement(file);
  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem neste navegador.');
  ctx.drawImage(img, 0, 0, width, height);

  const maxChars = maxKB * 1024;
  for (const quality of [0.7, 0.55, 0.4, 0.3]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= maxChars) return dataUrl;
  }
  throw new Error(`"${file.name}" continua grande demais mesmo após compressão (máx ${maxKB}KB por imagem).`);
}
