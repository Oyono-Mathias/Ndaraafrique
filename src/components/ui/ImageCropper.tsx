'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import getCroppedImg from '@/lib/crop-image';
import { Loader2 } from 'lucide-react';

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

  const onCropChange = useCallback((crop: any) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: any) => {
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
      console.error(e);
    } finally {
      setIsCropping(false);
    }
  };

  if (!image) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader className="p-4 border-b dark:border-slate-700">
          <DialogTitle className="dark:text-white">Recadrer l'image</DialogTitle>
        </DialogHeader>
        <div className="relative flex-1">
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
        <DialogFooter className="p-4 border-t dark:border-slate-700">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleCrop} disabled={isCropping}>
            {isCropping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
