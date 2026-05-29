import { memo, useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ChangeEvent } from 'react';
import { ArrowUp, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadApi } from '@/lib/api';
import { friendlyApiError } from '@/lib/auth-errors';
import { toast } from '@/stores/toastStore';

interface ChatInputProps {
  onSend: (text: string, imageUrl?: string) => void;
  disabled?: boolean;
  showChips?: boolean;
}

const EXAMPLE_CHIPS = [
  '강남에서 오늘 뭐 할 수 있어?',
  '서울 전통 문화 체험 추천해줘',
  '홍대 쇼핑 코스 짜줘',
  '한강 근처 맛집 알려줘',
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

export default memo(function ChatInput({ onSend, disabled, showChips }: ChatInputProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 미리보기 blob URL 정리 — 컴포넌트 언마운트 또는 이미지 교체 시 메모리 회수.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 가능하도록 리셋
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('jpg, png, webp 파일만 첨부 가능합니다');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('10MB 이하 사진만 첨부 가능합니다');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setAttachedImage(file);
  };

  const clearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAttachedImage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (disabled || uploading) return;
    const trimmed = text.trim();
    if (!trimmed && !attachedImage) return;

    let uploadedUrl: string | undefined;
    if (attachedImage) {
      setUploading(true);
      try {
        const res = await uploadApi.image(attachedImage);
        uploadedUrl = res.image_url;
      } catch (err) {
        toast.error(friendlyApiError(err, '사진 업로드 실패'));
        setUploading(false);
        return;
      }
      setUploading(false);
      clearImage();
    }

    // text + imageUrl 분리해서 전달 — store 가 BE query 와 UI 표시용을 다르게 처리.
    onSend(trimmed, uploadedUrl);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = (text.trim().length > 0 || attachedImage !== null) && !disabled && !uploading;

  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      {showChips && (
        <div className="flex flex-wrap gap-2 mb-3 stagger-children">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSend(chip)}
              className="group px-3.5 py-2 text-[13px] text-text-secondary bg-bg-surface rounded-full border border-border transition-all duration-200 cursor-pointer whitespace-nowrap hover:border-brand/30 hover:text-brand hover:bg-brand-subtle hover:shadow-xs"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {previewUrl && (
        <div className="mb-2 inline-flex items-center gap-2 bg-bg-surface border border-border rounded-xl p-1.5">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-bg-subtle">
            <img src={previewUrl} alt="첨부 사진" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-start gap-1 pr-1">
            <span className="text-[11px] text-text-muted">사진 1장</span>
            <button
              type="button"
              onClick={clearImage}
              disabled={uploading}
              className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-[#DC2626] cursor-pointer disabled:opacity-50"
            >
              <X size={12} /> 제거
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'flex items-center gap-1 bg-bg-surface rounded-[14px] pl-2 pr-1.5 py-1.5 transition-all duration-200',
            focused
              ? 'border-2 border-brand/40 shadow-focus'
              : 'border border-border shadow-sm hover:border-border-strong',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-label="사진 첨부"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-brand hover:bg-brand-subtle cursor-pointer disabled:opacity-40 transition-colors"
            aria-label="사진 첨부"
          >
            <ImageIcon size={16} strokeWidth={1.8} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={attachedImage ? '사진과 함께 보낼 메시지 (선택)' : '서울에서 무엇을 하고 싶으세요?'}
            disabled={disabled}
            className={cn(
              'flex-1 bg-transparent border-none outline-none text-[14px] text-text-primary px-1',
              'placeholder:text-text-muted leading-[1.5] min-w-0',
              disabled && 'opacity-40',
            )}
            aria-label="메시지 입력"
          />
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              'w-8 h-8 rounded-[10px] flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0',
              canSend
                ? 'bg-brand text-white shadow-xs hover:bg-brand-hover active:scale-95'
                : 'bg-bg-subtle text-text-muted',
            )}
            aria-label={uploading ? '업로드 중' : '전송'}
          >
            {uploading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp size={15} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
});
