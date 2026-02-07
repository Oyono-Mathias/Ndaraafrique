'use client';

/**
 * @fileOverview Gestionnaire de modèles d'images de cours pour les administrateurs.
 * Permet de définir les images suggérées aux formateurs lors de la création de cours.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ImageIcon, Loader2, Save, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { CourseTemplate } from '@/lib/types';

export default function AdminTemplatesPage() {
  const db = getFirestore();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newTemplate, setNewTemplate] = useState({ imageUrl: '', description: '' });

  const templatesQuery = useMemo(() => query(collection(db, 'course_templates'), orderBy('createdAt', 'desc')), [db]);
  const { data: templates, isLoading } = useCollection<CourseTemplate>(templatesQuery);

  const handleAddTemplate = async () => {
    if (!newTemplate.imageUrl || !newTemplate.description) {
        toast({ variant: 'destructive', title: "Champs requis", description: "Veuillez remplir l'URL et la description." });
        return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'course_templates'), {
        ...newTemplate,
        createdAt: serverTimestamp(),
      });
      setNewTemplate({ imageUrl: '', description: '' });
      setIsAdding(false);
      toast({ title: "Modèle ajouté avec succès !" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'ajouter le modèle." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'course_templates', id));
      toast({ title: "Modèle supprimé." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur" });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Bibliothèque d'Images</h1>
          <p className="text-slate-400">Gérez les images suggérées aux formateurs pour leurs cours.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"} className="rounded-xl">
          {isAdding ? "Annuler" : <><Plus className="mr-2 h-4 w-4" /> Ajouter un modèle</>}
        </Button>
      </header>

      {isAdding && (
        <Card className="bg-slate-900 border-primary/20 animate-in slide-in-from-top-4 duration-500 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/> Nouveau Modèle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500">URL de l'image (Format paysage)</Label>
                <Input 
                  placeholder="https://images.unsplash.com/..." 
                  className="bg-slate-800 border-slate-700 h-12"
                  value={newTemplate.imageUrl} 
                  onChange={e => setNewTemplate({...newTemplate, imageUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500">Description (ex: Tech, Agri...)</Label>
                <Input 
                  placeholder="Thématique du modèle" 
                  className="bg-slate-800 border-slate-700 h-12"
                  value={newTemplate.description} 
                  onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={handleAddTemplate} disabled={isSaving || !newTemplate.imageUrl} className="rounded-xl px-8">
                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                Enregistrer le modèle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full bg-slate-800 rounded-3xl" />)}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="bg-slate-900 border-slate-800 overflow-hidden group rounded-3xl">
                <div className="relative aspect-video bg-slate-800">
                  <Image src={template.imageUrl} alt={template.description} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="bg-red-500/80 hover:bg-red-500 border-none rounded-xl"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                    <p className="text-xs font-black uppercase text-slate-500 tracking-widest">{template.description}</p>
                </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-30">
          <ImageIcon className="h-16 w-16 mx-auto mb-4" />
          <p className="font-black uppercase tracking-widest">Aucun modèle disponible</p>
        </div>
      )}
    </div>
  );
}
