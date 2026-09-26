import React, { useState, useEffect, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, RotateCcw, Sparkles, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { getCroppedImg } from '../utils/cropImage';

export interface PhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  initialPosition?: {
    photoOffsetX?: number | null;
    photoOffsetY?: number | null;
    photoZoom?: number | null;
  } | null;
  onClose: () => void;
  onSavePosition?: (position: { photoOffsetX: number; photoOffsetY: number; photoZoom: number }) => Promise<void> | void;
  onCropSave?: (croppedBlob: Blob) => Promise<void> | void;
  isSaving?: boolean;
}

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  isOpen,
  imageSrc,
  initialPosition,
  onClose,
  onSavePosition,
  onCropSave,
  isSaving = false,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens with a new or re-opened image
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(initialPosition?.photoZoom && initialPosition.photoZoom >= 1 ? initialPosition.photoZoom : 1);
      setCroppedAreaPercent(null);
      setCroppedAreaPixels(null);
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen, imageSrc, initialPosition]);

  // Support closing modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving && !isProcessing) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isProcessing, onClose]);

  const handleCropComplete = useCallback((croppedArea: Area, areaPixels: Area) => {
    setCroppedAreaPercent(croppedArea);
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleZoomIn = () => {
    setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(2))));
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSave = async () => {
    if (!imageSrc) return;

    setError(null);
    setIsProcessing(true);

    try {
      if (onSavePosition && croppedAreaPercent) {
        const photoOffsetX = Number((croppedAreaPercent.x + croppedAreaPercent.width / 2).toFixed(1));
        const photoOffsetY = Number((croppedAreaPercent.y + croppedAreaPercent.height / 2).toFixed(1));
        const photoZoom = Number(zoom.toFixed(2));
        await onSavePosition({ photoOffsetX, photoOffsetY, photoZoom });
      } else if (onCropSave && croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 'image/jpeg', 0.92);
        await onCropSave(croppedBlob);
      }
    } catch (err: any) {
      console.error('Failed to crop and save photo:', err);
      setError(err?.message || 'Failed to update photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) {
    return null;
  }

  const isBusy = isSaving || isProcessing;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-crop-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-[#DC2626]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="photo-crop-title" className="text-base font-bold text-[#0B192C]">
                Crop & Reposition Photo
              </h3>
              <p className="text-xs text-neutral-500">
                Drag to center your face and adjust zoom for your profile card
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Crop Area (1:1 aspect ratio) */}
        <div className="relative w-full h-72 sm:h-80 bg-neutral-950 rounded-2xl overflow-hidden shadow-inner border border-neutral-800 select-none">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            zoomWithScroll={true}
            minZoom={1}
            maxZoom={3}
            mediaProps={{
              crossOrigin: 'anonymous',
            }}
          />
        </div>

        {/* Zoom Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-600 font-medium">
            <span>Zoom & Position</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-neutral-400 text-[11px]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleReset}
                disabled={isBusy}
                className="text-[11px] text-neutral-500 hover:text-[#DC2626] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={isBusy || zoom <= 1}
              className="p-1 text-neutral-500 hover:text-neutral-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              disabled={isBusy}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom level"
              className="flex-1 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#DC2626]"
            />
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={isBusy || zoom >= 3}
              className="p-1 text-neutral-500 hover:text-neutral-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-500">
          <Sparkles className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
          <span>Drag the image to center your face. Pinch or use the slider to adjust zoom.</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy || !croppedAreaPixels}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isSaving ? 'Uploading...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
