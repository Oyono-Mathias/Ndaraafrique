
'use client';

/**
 * @fileOverview Gestionnaire de FAQ pour Ndara Afrique.
 * Permet aux admins de maintenir la base de connaissances utilisée par l'IA Mathias.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Edit3, Search, Save, MessageCircleQuestion, Tag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FAQ } from '@/lib/types';

export default function AdminFaqPage() {
  const db = getFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const faqsQuery = useMemo(() => query(collection(db, 'faqs'), orderBy('order', 'asc')), [db]);
  const { data: faqs, isLoading } = useCollection<FAQ>(faqsQuery);

  const [formData, setFormData] = useState({ question_fr: '', answer_fr: '', tags: '', order: 0 });

  const filteredFaqs = useMemo(() => {
    return faqs?.filter(f => f.question_fr.toLowerCase().includes(searchTerm.toLowerCase())) || [];
  }, [faqs, searchTerm]);

  const handleSave = async () => {
    if (!formData.question_fr || !formData.answer_fr) return;
    setIsSaving(true);
    
    const tagsArray = formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    const payload = {
      ...formData,
      tags: tagsArray,
      isActive: true,
      updatedAt: serverTimestamp(),
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'faqs', isEditing), payload);
        toast({ title: "FAQ mise à jour !" });
      } else {
        await addDoc(collection(db, 'faqs'), { ...payload, createdAt: serverTimestamp() });
        toast({ title: "Question ajoutée !" });
      }
      setFormData({ question_fr: '', answer_fr: '', tags: '', order: 0 });
      setIsEditing(null);
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setIsEditing(faq.id);
    setFormData({
      question_fr: faq.question_fr,
      answer_fr: faq.answer_fr,
      tags: faq.tags.join(', '),
      order: faq.order || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'faqs', id));
      toast({ title: "FAQ supprimée." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur" });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Base de Connaissances (FAQ)</h1>
        <p className="text-slate-400">Ces réponses nourrissent l'IA Mathias pour aider les étudiants.</p>
      </header>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
            {isEditing ? 'Modifier la question' : 'Ajouter une question'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Question (Français)</Label>
            <Input 
              placeholder="Ex: Comment obtenir mon certificat ?" 
              value={formData.question_fr}
              onChange={e => setFormData({...formData, question_fr: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Réponse détaillée</Label>
            <Textarea 
              rows={4} 
              placeholder="Expliquez la procédure ici..." 
              value={formData.answer_fr}
              onChange={e => setFormData({...formData, answer_fr: e.target.value})}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mots-clés / Tags (Séparés par une virgule)</Label>
              <Input 
                placeholder="certificat, diplôme, réussite..." 
                value={formData.tags}
                onChange={e => setFormData({...formData, tags: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordre d'affichage</Label>
              <Input 
                type="number" 
                value={formData.order}
                onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {isEditing && <Button variant="ghost" onClick={() => setIsEditing(null)}>Annuler</Button>}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Rechercher une question..." 
            className="pl-10 bg-slate-900 border-slate-800"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full bg-slate-800" />
        ) : filteredFaqs.length > 0 ? (
          <div className="grid gap-4">
            {filteredFaqs.map((faq) => (
              <Card key={faq.id} className="bg-slate-900 border-slate-800 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-3 flex-1">
                      <h3 className="font-bold text-white text-lg">{faq.question_fr}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{faq.answer_fr}</p>
                      <div className="flex flex-wrap gap-2">
                        {faq.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="bg-slate-800 text-[10px] uppercase font-bold text-primary border-primary/20">
                            <Tag className="h-2 w-2 mr-1" /> {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(faq)} className="h-8 w-8">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)} className="h-8 w-8 text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-30">
            <MessageCircleQuestion className="h-12 w-12 mx-auto mb-4" />
            <p className="font-bold uppercase tracking-widest">Aucune question trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}
