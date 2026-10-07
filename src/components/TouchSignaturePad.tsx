import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, Check, Download, PenTool, X, Trash2, Undo2 } from 'lucide-react';

interface TouchSignaturePadProps {
  title?: string;
  subtitle?: string;
  signerName?: string;
  signerRole?: string;
  initialSignature?: string;
  onSave?: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

export const TouchSignaturePad: React.FC<TouchSignaturePadProps> = ({
  title = 'لوحة التوقيع الإلكتروني الذكية',
  subtitle = 'التوقيع الرقمي المعتمد باللمس أو القلم الإلكتروني',
  signerName = '',
  signerRole = '',
  initialSignature = '',
  onSave,
  onCancel,
  isOpen = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [inkColor, setInkColor] = useState<'blue' | 'black'>('blue');
  const [penSize, setPenSize] = useState<number>(2.5);

  const inkHex = inkColor === 'blue' ? '#1d4ed8' : '#0f172a';

  // Initialize and scale canvas for high DPI (Retina / AMOLED)
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkHex;
    ctx.lineWidth = penSize;

    // Background fill transparent/white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [inkHex, penSize, initialSignature]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => {
      // Re-init on orientation change / resize
      initCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  // Save current stroke to history
  const saveStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setStrokeHistory(prev => [...prev.slice(-10), imageData]);
    } catch {
      // Ignore security errors if any
    }
  };

  // Get coordinates relative to canvas
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Pointer events (unifies touch, pen/stylus, and mouse with zero latency)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture pointer for smooth dragging even outside canvas boundary
    canvas.setPointerCapture(e.pointerId);

    saveStroke();
    setIsDrawing(true);
    setHasSignature(true);

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.strokeStyle = inkHex;
    ctx.lineWidth = e.pointerType === 'pen' ? (e.pressure ? e.pressure * 4 + 1 : penSize) : penSize;
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = inkHex;
    if (e.pointerType === 'pen' && e.pressure) {
      ctx.lineWidth = e.pressure * 4 + 1;
    } else {
      ctx.lineWidth = penSize;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokeHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = strokeHistory[strokeHistory.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setStrokeHistory(prev => prev.slice(0, -1));
    if (strokeHistory.length <= 1) {
      setHasSignature(false);
    }
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    setStrokeHistory([]);
  };

  // Confirm & export signature
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    // Trigger subtle touch haptic vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (onSave) {
      onSave(dataUrl);
    }
  };

  // Download signature image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const link = document.createElement('a');
    link.download = `توقيع_${signerName || 'معتمد'}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-3 sm:p-4 select-none touch-none">
      <Card className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <PenTool size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 leading-tight">{title}</h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700"
              aria-label="إغلاق"
            >
              <X size={18} />
            </Button>
          )}
        </div>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Signer Info Badge */}
          {(signerName || signerRole) && (
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">الموقع:</span>
                <span className="text-slate-900 font-black">{signerName || 'غير محدد'}</span>
              </div>
              {signerRole && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                  {signerRole}
                </span>
              )}
            </div>
          )}

          {/* Canvas Wrapper */}
          <div className="relative border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-white shadow-inner">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-56 sm:h-64 cursor-crosshair touch-none bg-white block"
              style={{ touchAction: 'none' }}
            />

            {/* Baseline Guide */}
            <div className="absolute bottom-8 left-8 right-8 pointer-events-none flex items-center justify-between border-b border-slate-200 pb-1">
              <span className="text-[10px] font-bold text-slate-300">خط التوقيع الرسمي</span>
              <span className="text-[10px] font-bold text-slate-300">X .................................</span>
            </div>

            {/* Watermark / Instruction */}
            {!hasSignature && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 gap-1">
                <PenTool size={28} className="opacity-40" />
                <span className="text-xs font-bold opacity-60">وقّع هنا بالإصبع أو القلم الإلكتروني</span>
                <span className="text-[10px] opacity-40">يدعم اللمس فائق الدقة والاستجابة اللحظية</span>
              </div>
            )}
          </div>

          {/* Tool Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Ink color and thickness */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setInkColor('blue')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  inkColor === 'blue' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                }`}
                title="حبر أزرق رسمي"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-white" />
              </button>
              <button
                type="button"
                onClick={() => setInkColor('black')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  inkColor === 'black' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                }`}
                title="حبر أسود"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-white" />
              </button>
              <div className="w-px h-4 bg-slate-300 mx-0.5" />
              <button
                type="button"
                onClick={() => setPenSize(1.5)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                  penSize === 1.5 ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                رفيع
              </button>
              <button
                type="button"
                onClick={() => setPenSize(2.5)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                  penSize === 2.5 ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                متوسط
              </button>
              <button
                type="button"
                onClick={() => setPenSize(4)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                  penSize === 4 ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                عريض
              </button>
            </div>

            {/* Actions: Undo / Clear / Download */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={strokeHistory.length === 0}
                className="h-9 px-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30"
                title="تراجع عن آخر خطوة"
              >
                <Undo2 size={15} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={!hasSignature}
                className="h-9 px-2.5 rounded-xl font-bold text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"
                title="مسح الكل"
              >
                <Trash2 size={15} />
                <span className="hidden sm:inline mr-1">مسح</span>
              </Button>
              {hasSignature && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-9 px-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100"
                  title="تحميل كصورة PNG"
                >
                  <Download size={15} />
                </Button>
              )}
            </div>
          </div>

          {/* Confirmation Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-11 px-5 rounded-xl font-bold text-xs border-slate-200"
              >
                إلغاء
              </Button>
            )}
            <Button
              type="button"
              disabled={!hasSignature}
              onClick={handleConfirm}
              className="h-11 px-6 rounded-xl font-black text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-40"
            >
              <Check size={16} />
              <span>اعتماد التوقيع وحفظه</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
