import { useRef, useState } from 'react';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { imageToCompressedDataUrl } from '@/lib/media';
import { X, Star, Loader2, ImagePlus, Upload } from 'lucide-react';

const MAX_IMAGES = 5;
// O Firestore limita o documento do veículo a ~1MB — as fotos ficam em base64.
const MAX_IMAGE_KB = 160; // por foto, após compressão
const MAX_TOTAL_KB = 850; // soma de todas as fotos em base64

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  mainIndex?: number;
  onMainChange?: (index: number) => void;
}

export function ImageUploader({
  value,
  onChange,
  folder,
  mainIndex = 0,
  onMainChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_IMAGES - value.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const files = Array.from(fileList).slice(0, remaining);
    if (files.length === 0) {
      setError(`Limite de ${MAX_IMAGES} imagens atingido.`);
      return;
    }

    setUploading(true);
    setProgress(0);
    const uploaded: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('image/')) {
          throw new Error(`"${file.name}" não é uma imagem.`);
        }

        // Comprime e converte para base64 — a foto é salva no documento do veículo.
        const url = await imageToCompressedDataUrl(file, MAX_IMAGE_KB);

        // O Firestore limita o documento a ~1MB — controla a soma das fotos.
        const totalChars = [...value, url].reduce((sum, u) => sum + (u.startsWith('data:') ? u.length : 0), 0);
        if (totalChars > MAX_TOTAL_KB * 1024) {
          throw new Error(`Fotos excedem o limite de ~${MAX_TOTAL_KB}KB (limite do Firestore). Remova alguma antes de adicionar outra.`);
        }

        uploaded.push(url);

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      onChange([...value, ...uploaded]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Falha ao enviar imagem.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove(index: number) {
    const url = value[index];
    try {
      if (url.includes('/o/')) {
        const decoded = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
        await deleteObject(storageRef(storage, decoded));
      }
    } catch {
      /* ignora */
    }
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    if (onMainChange) {
      if (index === mainIndex) onMainChange(0);
      else if (index < mainIndex) onMainChange(mainIndex - 1);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label !mb-0">
          Fotos do Veículo ({value.length}/{MAX_IMAGES})
        </label>
        {onMainChange && value.length > 1 && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Star className="h-3.5 w-3.5 text-accent-500" /> clique na estrela para definir a capa
          </span>
        )}
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {value.map((url, i) => (
            <div
              key={url + i}
              className={`group relative aspect-[4/3] overflow-hidden rounded-lg border-2 bg-gray-100 transition-all ${
                i === mainIndex ? 'border-accent-500 ring-2 ring-accent-300' : 'border-gray-200'
              }`}
            >
              <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />

              {i === mainIndex && (
                <span className="absolute top-1 left-1 flex items-center gap-1 rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                  <Star className="h-3 w-3" /> Capa
                </span>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {onMainChange && i !== mainIndex && (
                  <button
                    type="button"
                    onClick={() => onMainChange(i)}
                    title="Definir como capa"
                    className="rounded-full bg-white/90 p-1.5 text-gray-700 transition hover:bg-accent-500 hover:text-white"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  title="Remover"
                  className="rounded-full bg-white/90 p-1.5 text-gray-700 transition hover:bg-error-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 ? (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors ${
            uploading ? 'cursor-not-allowed opacity-70' : 'hover:border-primary-400 hover:bg-primary-50'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
              <p className="text-sm font-medium text-gray-700">Enviando... {progress}%</p>
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <ImagePlus className="h-7 w-7 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Clique para adicionar imagens</p>
              <p className="text-xs text-gray-500">
                Até {remaining} {remaining === 1 ? 'imagem restante' : 'imagens restantes'} · JPG/PNG/WebP · comprimidas automaticamente (máx {MAX_IMAGE_KB}KB)
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <p className="rounded-lg bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-500">
          Limite de {MAX_IMAGES} imagens atingido. Remova uma para adicionar outra.
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{error}</div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-gray-400">
        <Upload className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        As fotos são salvas direto no banco (Firestore, em base64) e comprimidas automaticamente.
      </p>
    </div>
  );
}

