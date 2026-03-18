
'use client';

/**
 * @fileOverview Cockpit Géographique - Gestion des pays et devises.
 * ✅ REAL-TIME : Branché sur Firestore avec onSnapshot.
 * ✅ ADMIN : Contrôle total des régions actives.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { 
    Globe, 
    Plus, 
    Search, 
    Trash2, 
    Edit3, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    ShieldCheck,
    Coins
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { addCountryAction, updateCountryAction, deleteCountryAction, toggleCountryStatusAction } from '@/actions/countryActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import type { Country } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function AdminCountriesPage() {
    const db = getFirestore();
    const { toast } = useToast();
    const { currentUser } = useRole();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        currency: 'XOF',
        prefix: '+',
        flagEmoji: '🌍'
    });

    const countriesQuery = useMemo(() => query(collection(db, 'countries'), orderBy('name')), [db]);
    const { data: countries, isLoading } = useCollection<Country>(countriesQuery);

    const filtered = useMemo(() => {
        if (!countries) return [];
        return countries.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [countries, searchTerm]);

    const handleAdd = async () => {
        if (!formData.name || !formData.code) return;
        setIsSubmitting(true);
        const result = await addCountryAction({ ...formData, active: true });
        if (result.success) {
            toast({ title: "Pays ajouté !" });
            setIsModalOpen(false);
            setFormData({ name: '', code: '', currency: 'XOF', prefix: '+', flagEmoji: '🌍' });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsSubmitting(false);
    };

    const handleToggle = async (id: string, active: boolean) => {
        await toggleCountryStatusAction(id, active);
        toast({ title: active ? "Pays activé" : "Pays suspendu" });
    };

    const handleDelete = async (id: string) => {
        if (confirm("Supprimer ce pays ?")) {
            await deleteCountryAction(id);
            toast({ title: "Pays supprimé" });
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Globe className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Expansion Régionale</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Pays & Régions</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Gérez la présence géographique de Ndara Afrique.</p>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 rounded-2xl bg-primary text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl">
                            <Plus className="mr-2 h-4 w-4" /> Nouveau Pays
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                        <DialogHeader>
                            <DialogTitle className="uppercase font-black tracking-tight">Ajouter une région</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nom du Pays</label>
                                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Sénégal" className="bg-slate-950 border-slate-800" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Code ISO (2)</label>
                                    <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="Ex: SN" maxLength={2} className="bg-slate-950 border-slate-800" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Devise</label>
                                    <Input value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value.toUpperCase()})} placeholder="XOF" className="bg-slate-950 border-slate-800" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Préfixe</label>
                                    <Input value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} placeholder="+221" className="bg-slate-950 border-slate-800" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Drapeau</label>
                                    <Input value={formData.flagEmoji} onChange={e => setFormData({...formData, flagEmoji: e.target.value})} placeholder="🇸🇳" className="bg-slate-950 border-slate-800 text-center text-xl" />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAdd} disabled={isSubmitting} className="w-full h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Enregistrer le pays"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Chercher un pays..." 
                    className="h-12 pl-12 bg-slate-900 border-white/5 rounded-xl text-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Pays</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Code / Préfixe</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Devise</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell colSpan={5} className="h-12 bg-slate-800/20" /></TableRow>
                            ))
                        ) : filtered.length > 0 ? (
                            filtered.map(country => (
                                <TableRow key={country.id} className="group border-slate-800 hover:bg-slate-800/20">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{country.flagEmoji}</span>
                                            <span className="font-bold text-sm text-white uppercase">{country.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-300">{country.code}</span>
                                            <span className="text-[9px] font-bold text-slate-500">{country.prefix}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="bg-slate-800 text-primary border-none font-black text-[9px] px-2 py-0.5">
                                            {country.currency}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch 
                                            checked={country.active} 
                                            onCheckedChange={(v) => handleToggle(country.id, v)}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(country.id)} className="h-8 w-8 text-red-500 hover:bg-red-500/10">
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-48 text-center opacity-20"><Globe size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucun pays configuré</p></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 flex items-start gap-4 shadow-xl">
                <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-1" />
                <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest italic">
                    "Les pays actifs ici sont les seuls autorisés pour les recharges de wallet et les affiliations. La devise définie s'applique automatiquement aux transactions de la région."
                </p>
            </div>
        </div>
    );
}
