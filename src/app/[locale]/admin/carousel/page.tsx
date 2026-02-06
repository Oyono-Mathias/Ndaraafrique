
'use client';

/**
 * @fileOverview Gestionnaire de carrousel pour les administrateurs.
 * Permet de modifier les visuels de la page d'accueil.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Link as LinkIcon, ImageIcon, Loader2, GripVertical, Save } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { CarouselSlide } from '@/lib/types';

export default function AdminCarouselPage() {
  const db = getFirestore();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newSlide, setNewSlide] = useState({ imageUrl: '', link: '', order: 0 });

  const slidesQuery = useMemo(() => query(collection(db, 'carousel_slides'), orderBy('order', 'asc')), [db]);
  const { data: slides, isLoading } = useCollection<CarouselSlide>(slidesQuery);

  const handleAddSlide = async () => {
    if (!newSlide.imageUrl) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'carousel_slides'), {
        ...newSlide,
        createdAt: serverTimestamp(),
      });
      setNewSlide({ imageUrl: '', link: '', order: 0 });
      setIsAdding(false);
      toast({ title: "Slide ajouté avec succès !" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'ajouter le slide." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSlide = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'carousel_slides', id));
      toast({ title: "Slide supprimé." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur" });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Carrousel Accueil</h1>
          <p className="text-slate-400">Gérez les bannières publicitaires et informatives du site.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"}>
          {isAdding ? "Annuler" : <><Plus className="mr-2 h-4 w-4" /> Ajouter un slide</>}
        </Button>
      </header>

      {isAdding && (
        <Card className="bg-slate-900 border-primary/20 animate-in slide-in-from-top-4 duration-500">
          <CardHeader>
            <CardTitle className="text-lg">Nouveau Visuel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL de l'image (1200x400 conseillé)</Label>
                <Input 
                  placeholder="https://..." 
                  value={newSlide.imageUrl} 
                  onChange={e => setNewSlide({...newSlide, imageUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Lien de redirection (Optionnel)</Label>
                <Input 
                  placeholder="/search ou https://..." 
                  value={newSlide.link} 
                  onChange={e => setNewSlide({...newSlide, link: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={handleAddSlide} disabled={isSaving || !newSlide.imageUrl}>
                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                Enregistrer le slide
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {isLoading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full bg-slate-800 rounded-2xl" />)
        ) : slides && slides.length > 0 ? (
          slides.map((slide) => (
            <Card key={slide.id} className="bg-slate-900 border-slate-800 overflow-hidden group">
              <div className="flex flex-col md:flex-row">
                <div className="relative w-full md:w-72 aspect-video bg-slate-800">
                  <Image src={slide.imageUrl} alt="Slide" fill className="object-cover" />
                </div>
                <CardContent className="flex-1 p-6 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                      <ImageIcon className="h-3 w-3" /> Ordre: {slide.order}
                    </div>
                    {slide.link && (
                      <div className="flex items-center gap-2 text-primary text-xs font-bold">
                        <LinkIcon className="h-3 w-3" /> {slide.link}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-none"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-[2rem] opacity-30">
            <ImageIcon className="h-16 w-16 mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest">Aucun slide actif</p>
          </div>
        )}
      </div>
    </div>
  );
}
