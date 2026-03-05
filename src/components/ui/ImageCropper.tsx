
'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import getCroppedImg from '@/lib/crop-image';
import { Loader2, Check } from 'lucide-react';

interface ImageCropperProps {
  image: string | null;
  onCropComplete: (croppedImage: File) => void;
  onClose: () => void;
}

export function ImageCropper({ image, onCropComplete, onClose }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropChange = useCallback((crop: { x: number, y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropFull = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels || !image) return;
    setIsCropping(true);
    try {
      const croppedImageFile = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImageFile);
    } catch (e) {
      console.error("Cropping Error:", e);
    } finally {
      setIsCropping(false);
    }
  };

  if (!image) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl h-[80vh] flex flex-col p-0 gap-0 bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden z-[10001]">
        <DialogHeader className="p-6 border-b border-white/5 bg-slate-900">
          <DialogTitle className="text-white uppercase font-black tracking-tight text-xl">Ajuster la photo</DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1 / 1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropFull}
          />
        </div>
        <DialogFooter className="p-6 bg-slate-900 border-t border-white/5 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Annuler</Button>
          <Button 
            onClick={handleCrop} 
            disabled={isCropping}
            className="rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90"
          >
            {isCropping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Valider le recadrage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
