import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, UserRound } from 'lucide-react';
import { imageToAvatarDataUrl, AVATAR_MAX_KB } from '@/lib/media';

interface AvatarUploaderProps {
  /** Data URL (base64) do avatar atual, ou vazio quando não há foto. */
  value: string;
  /** Nome do usuário — usado na inicial do placeholder. */
  name?: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}

/**
 * Seletor de foto de perfil (avatar) do usuário.
 * A imagem é cortada em quadrado, redimensionada para 256px e gravada em
 * base64 no próprio documento do perfil — mesma estratégia das fotos de veículo.
 */
export function AvatarUploader({ value, name = '', onChange, disabled }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inicial = (name || '').trim().charAt(0).toUpperCase() || 'U';

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    // Limite de segurança no arquivo bruto antes de processar.
    if (file.size > 10 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 10MB.');
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await imageToAvatarDataUrl(file);
      onChange(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar a imagem.');
    } finally {
      setBusy(false);
      // Permite reselecionar o mesmo arquivo depois de um erro.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleRemove() {
    setError(null);
    onChange('');
  }

  return (
    <div>
      <label className="label">Foto do perfil</label>

      <div className="flex items-center gap-4">
        {/* Preview circular */}
        <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
          {value ? (
            <img src={value} alt={`Avatar de ${name || 'usuário'}`} className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-9 w-9 text-gray-400" aria-hidden />
          )}

          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy || disabled}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {value ? 'Trocar foto' : 'Escolher foto'}
            </button>

            {value && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy || disabled}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            JPG, PNG ou WebP · cortada em quadrado · máx {AVATAR_MAX_KB}KB
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={busy || disabled}
        onChange={(e) => handleFile(e.target.files)}
      />

      {error && (
        <div className="mt-2 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{error}</div>
      )}
    </div>
  );
}

/** Inicial usada no placeholder quando não há avatar. */
export function avatarInicial(name?: string): string {
  return (name || '').trim().charAt(0).toUpperCase() || 'U';
}
