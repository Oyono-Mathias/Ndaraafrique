'use client';

/**
 * @fileOverview Gestionnaire de modèles d'images pour les administrateurs.
 * ✅ PROJET : Affiche les images internes (built-in) du projet générées par l'IA.
 * ✅ CUSTOM : Permet d'ajouter des modèles personnalisés dans Firestore.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ImageIcon, Loader2, Save, Sparkles, Copy, CheckCircle2, HardDrive } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { CourseTemplate } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminTemplatesPage() {
  const db = getFirestore();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  const [newTemplate, setNewTemplate] = useState({ imageUrl: '', description: '' });

  const templatesQuery = useMemo(() => query(collection(db, 'course_templates'), orderBy('createdAt', 'desc')), [db]);
  const { data: customTemplates, isLoading } = useCollection<CourseTemplate>(templatesQuery);

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
      toast({ variant: 'destructive', title: "Erreur" });
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

  const copyToClipboard = (url: string) => {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast({ title: "URL copiée !", description: "Vous pouvez l'utiliser pour éditer un cours." });
      setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Bibliothèque de Visuels</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Gérez les images officielles pour le savoir Ndara Afrique.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"} className="rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl">
          {isAdding ? "Annuler" : <><Plus className="mr-2 h-4 w-4" /> Ajouter un modèle</>}
        </Button>
      </header>

      {isAdding && (
        <Card className="bg-slate-900 border-primary/20 animate-in slide-in-from-top-4 duration-500 rounded-[2rem] overflow-hidden shadow-2xl">
          <CardHeader className="bg-primary/5 p-8 border-b border-white/5">
            <CardTitle className="text-xl font-black text-white uppercase flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary"/> 
                Nouveau Modèle Personnalisé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 ml-1">URL de l'image</Label>
                <Input 
                  placeholder="https://images.unsplash.com/..." 
                  className="bg-slate-950 border-slate-800 h-14 rounded-2xl text-white font-medium"
                  value={newTemplate.imageUrl} 
                  onChange={e => setNewTemplate({...newTemplate, imageUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 ml-1">Thématique / Description</Label>
                <Input 
                  placeholder="Ex: Agriculture, Tech, Business..." 
                  className="bg-slate-950 border-slate-800 h-14 rounded-2xl text-white font-medium"
                  value={newTemplate.description} 
                  onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleAddTemplate} disabled={isSaving || !newTemplate.imageUrl} className="rounded-2xl h-14 px-10 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5"/> : <Save className="mr-2 h-5 w-5"/>}
                Enregistrer dans la base
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="project" className="w-full">
        <TabsList className="bg-slate-900 border-slate-800 p-1 h-14 rounded-2xl mb-8">
            <TabsTrigger value="project" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-8 h-full gap-2">
                <HardDrive className="h-4 w-4" /> Bibliothèque Projet (IA)
            </TabsTrigger>
            <TabsTrigger value="custom" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-8 h-full gap-2">
                <ImageIcon className="h-4 w-4" /> Modèles Externes
            </TabsTrigger>
        </TabsList>

        {/* --- SECTION 1 : IMAGES DU PROJET (IA) --- */}
        <TabsContent value="project" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {PlaceHolderImages.map((img) => (
                    <Card key={img.id} className="bg-slate-900 border-slate-800 overflow-hidden group rounded-[2.5rem] shadow-xl hover:border-primary/30 transition-all duration-500">
                        <div className="relative aspect-video bg-slate-800">
                            <Image src={img.imageUrl} alt={img.description} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button 
                                    size="sm" 
                                    className="bg-white text-black hover:bg-slate-100 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                                    onClick={() => copyToClipboard(img.imageUrl)}
                                >
                                    {copiedUrl === img.imageUrl ? <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600"/> : <Copy className="h-4 w-4 mr-2" />}
                                    Copier l'URL
                                </Button>
                            </div>
                        </div>
                        <CardContent className="p-6">
                            <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-1">ID: {img.id}</p>
                            <p className="text-sm font-bold text-white line-clamp-1">{img.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>

        {/* --- SECTION 2 : MODÈLES CUSTOM (Firestore) --- */}
        <TabsContent value="custom" className="mt-0">
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full bg-slate-800 rounded-[2.5rem]" />)}
                </div>
            ) : customTemplates && customTemplates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customTemplates.map((template) => (
                        <Card key={template.id} className="bg-slate-900 border-slate-800 overflow-hidden group rounded-[2.5rem] shadow-xl hover:border-red-500/30 transition-all">
                            <div className="relative aspect-video bg-slate-800">
                                <Image src={template.imageUrl} alt={template.description} fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        className="bg-red-500 hover:bg-red-600 border-none rounded-xl font-bold uppercase text-[10px] tracking-widest px-6"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Modèle Externe</p>
                                <p className="text-sm font-bold text-white truncate">{template.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-30">
                    <ImageIcon className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                    <p className="font-black uppercase tracking-widest text-slate-500">Aucun modèle personnalisé</p>
                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
