import { useRef, useState } from 'react';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { fileToDataUrl, imageToCompressedDataUrl } from '@/lib/media';
import { X, Loader2, FilePlus, Upload, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import type { SaleDocument } from '@/types';

const MAX_DOCS = 10;
// Limites do Firestore: os anexos ficam em base64 dentro do documento da venda (~1MB máx.).
const MAX_IMAGE_KB = 400; // por imagem, após compressão
const MAX_FILE_KB = 500;  // por arquivo não-imagem (tamanho original)
const MAX_TOTAL_KB = 900; // soma de todos os anexos em base64

interface DocumentUploaderProps {
  value: SaleDocument[];
  onChange: (docs: SaleDocument[]) => void;
  folder: string;
}

function iconFor(fileName: string) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
    return <ImageIcon className="h-5 w-5 text-primary-600" />;
  }
  if (ext === 'pdf') return <FileText className="h-5 w-5 text-error-600" />;
  return <FileIcon className="h-5 w-5 text-gray-500" />;
}

function fileSizeLabel(name: string) {
  return name.length > 28 ? `${name.slice(0, 25)}...` : name;
}

export function DocumentUploader({ value, onChange, folder }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_DOCS - value.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const files = Array.from(fileList).slice(0, remaining);
    if (files.length === 0) {
      setError(`Limite de ${MAX_DOCS} documentos atingido.`);
      return;
    }

    setUploading(true);
    setProgress(0);
    const uploaded: SaleDocument[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Imagens são comprimidas; outros arquivos precisam ser pequenos.
        let url: string;
        if (file.type.startsWith('image/')) {
          url = await imageToCompressedDataUrl(file, MAX_IMAGE_KB);
        } else {
          if (file.size > MAX_FILE_KB * 1024) {
            throw new Error(`"${file.name}" excede ${MAX_FILE_KB}KB. Envie um arquivo menor — os anexos são salvos no Firestore (~1MB por venda).`);
          }
          url = await fileToDataUrl(file);
        }

        // O Firestore limita o documento a ~1MB — controla a soma dos anexos.
        const totalChars = [...value.map((d) => d.url), ...uploaded.map((d) => d.url), url]
          .reduce((sum, u) => sum + (u.startsWith('data:') ? u.length : 0), 0);
        if (totalChars > MAX_TOTAL_KB * 1024) {
          throw new Error(`Documentos excedem o limite de ~${MAX_TOTAL_KB}KB por venda (limite do Firestore). Remova algum antes de adicionar outro.`);
        }

        uploaded.push({ name: file.name, url });

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      onChange([...value, ...uploaded]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Falha ao enviar documento.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove(index: number) {
    const doc = value[index];
    try {
      if (doc.url.includes('/o/')) {
        const decoded = decodeURIComponent(doc.url.split('/o/')[1].split('?')[0]);
        await deleteObject(storageRef(storage, decoded));
      }
    } catch {
      /* ignora */
    }
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label !mb-0">
          Documentos e Arquivos ({value.length}/{MAX_DOCS})
        </label>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          Contratos, notas, fotos, PDFs...
        </span>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((doc, i) => (
            <li
              key={doc.url}
              className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {iconFor(doc.name)}
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm font-medium text-gray-700 hover:text-primary-600"
                title={doc.name}
              >
                {fileSizeLabel(doc.name)}
              </a>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                title="Remover"
                className="rounded-full p-1 text-gray-400 transition hover:bg-error-50 hover:text-error-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
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
              <FilePlus className="h-7 w-7 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Clique para adicionar documentos</p>
              <p className="text-xs text-gray-500">
                Até {remaining} {remaining === 1 ? 'arquivo restante' : 'arquivos restantes'} · imagens comprimidas automaticamente · máx {MAX_FILE_KB}KB por arquivo
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <p className="rounded-lg bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-500">
          Limite de {MAX_DOCS} documentos atingido. Remova um para adicionar outro.
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{error}</div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-gray-400">
        <Upload className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        Os arquivos são salvos direto no banco (Firestore, em base64) e ficam vinculados a esta venda.
      </p>
    </div>
  );
}
