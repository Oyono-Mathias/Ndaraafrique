
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileVideo, Search, ExternalLink, HardDrive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

interface GoogleDrivePickerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  onFileSelect: (file: GoogleFile) => void;
}

export function GoogleDrivePicker({ isOpen, onOpenChange, accessToken, onFileSelect }: GoogleDrivePickerProps) {
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchFiles();
    }
  }, [isOpen, accessToken]);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      // On filtre pour ne prendre que les vidéos non supprimées
      const q = encodeURIComponent("mimeType contains 'video/' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id, name, mimeType, size)&pageSize=100`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!res.ok) throw new Error("Erreur lors de la récupération des fichiers Google Drive.");
      
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erreur Google Drive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden z-[10001]">
        <DialogHeader className="p-8 pb-0 bg-slate-900 border-b border-white/5">
          <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <HardDrive className="h-6 w-6 text-primary" />
            Mes Vidéos Google Drive
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">Sélectionnez le cours à importer directement sur Ndara Afrique.</DialogDescription>
          
          <div className="relative my-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Rechercher une vidéo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 bg-slate-950 border-slate-800 rounded-xl"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-950/50">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Connexion à Google...</p>
            </div>
          ) : filteredFiles.length > 0 ? (
            <ScrollArea className="h-full px-4 py-2">
              <div className="grid gap-2">
                {filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => onFileSelect(file)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
                  >
                    <div className="p-3 bg-slate-800 rounded-xl group-hover:bg-primary/10 transition-colors">
                      <FileVideo className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-200 truncate group-hover:text-white transition-colors">{file.name}</p>
                      <p className="text-[10px] font-black uppercase text-slate-600 tracking-tighter mt-0.5">
                        {file.mimeType.split('/')[1].toUpperCase()} • {file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(1) + ' MB' : 'Taille inconnue'}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-30">
              <FileVideo className="h-16 w-16 text-slate-500" />
              <p className="text-sm font-black uppercase tracking-widest">Aucune vidéo trouvée</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-900 border-t border-white/5 text-center">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Le fichier sera transféré directement sans passer par votre appareil.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
