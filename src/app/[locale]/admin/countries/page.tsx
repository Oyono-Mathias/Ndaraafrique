'use client';

/**
 * @fileOverview Cockpit Géographique & Paiements.
 * ✅ GESTION : Pays, devises et méthodes de paiement par pays.
 * ✅ REAL-TIME : Branché sur Firestore.
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
    Coins,
    Smartphone,
    CreditCard,
    MoreVertical,
    Settings2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { addCountryAction, updateCountryAction, deleteCountryAction, toggleCountryStatusAction, updateCountryPaymentMethods } from '@/actions/countryActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import type { Country, PaymentMethod, PaymentProvider } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function AdminCountriesPage() {
    const db = getFirestore();
    const { toast } = useToast();
    const { currentUser } = useRole();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMethodsModalOpen, setIsMethodsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        currency: 'XOF',
        prefix: '+',
        flagEmoji: '🌍'
    });

    const [newMethod, setNewMethod] = useState({
        name: '',
        logo: '',
        provider: 'mesomb' as PaymentProvider
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
        const result = await addCountryAction({ ...formData, active: true, paymentMethods: [] });
        if (result.success) {
            toast({ title: "Pays ajouté !" });
            setIsAddModalOpen(false);
            setFormData({ name: '', code: '', currency: 'XOF', prefix: '+', flagEmoji: '🌍' });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsSubmitting(false);
    };

    const handleToggleMethod = async (countryId: string, methods: PaymentMethod[], methodId: string) => {
        if (!currentUser) return;
        const updated = methods.map(m => m.id === methodId ? { ...m, active: !m.active } : m);
        await updateCountryPaymentMethods(countryId, updated, currentUser.uid);
    };

    const handleAddMethod = async () => {
        if (!selectedCountry || !newMethod.name || !currentUser) return;
        setIsSubmitting(true);
        const methods = selectedCountry.paymentMethods || [];
        const updated = [...methods, { ...newMethod, id: Math.random().toString(36).substring(7), active: true }];
        const result = await updateCountryPaymentMethods(selectedCountry.id, updated as any, currentUser.uid);
        if (result.success) {
            toast({ title: "Méthode ajoutée !" });
            setNewMethod({ name: '', logo: '', provider: 'mesomb' });
        }
        setIsSubmitting(false);
    };

    const handleRemoveMethod = async (methodId: string) => {
        if (!selectedCountry || !currentUser) return;
        const updated = (selectedCountry.paymentMethods || []).filter(m => m.id !== methodId);
        await updateCountryPaymentMethods(selectedCountry.id, updated, currentUser.uid);
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Globe className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Expansion Régionale</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Pays & Paiements</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Gérez la présence et les flux financiers par pays.</p>
                </div>

                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 rounded-2xl bg-primary text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl">
                            <Plus className="mr-2 h-4 w-4" /> Nouveau Pays
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white">
                        <DialogHeader><DialogTitle className="uppercase font-black tracking-tight">Ajouter une région</DialogTitle></DialogHeader>
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
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Devise / Préfixe</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Paiements</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Configuration</TableHead>
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
                                            <span className="text-xs font-black text-slate-300">{country.currency}</span>
                                            <span className="text-[9px] font-bold text-slate-500">{country.prefix}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {country.paymentMethods?.map(m => (
                                                <Badge key={m.id} className={cn("text-[7px] font-black uppercase border-none h-4", m.active ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-800 text-slate-600")}>
                                                    {m.name}
                                                </Badge>
                                            ))}
                                            {(!country.paymentMethods || country.paymentMethods.length === 0) && <span className="text-[9px] text-slate-600 italic">Aucun moyen</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Switch 
                                            checked={country.active} 
                                            onCheckedChange={(v) => toggleCountryStatusAction(country.id, v)}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => { setSelectedCountry(country); setIsMethodsModalOpen(true); }}
                                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                            >
                                                <Settings2 size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteCountryAction(country.id)} className="h-8 w-8 text-red-500 hover:bg-red-500/10">
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

            {/* --- MODAL GESTION PAIEMENTS PAR PAYS --- */}
            <Dialog open={isMethodsModalOpen} onOpenChange={setIsMethodsModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 rounded-[2rem] text-white sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="uppercase font-black tracking-tight flex items-center gap-3">
                            <Smartphone className="text-primary"/> Paiements : {selectedCountry?.name}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        {/* Méthodes Actives */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Méthodes configurées</label>
                            <div className="grid gap-2">
                                {selectedCountry?.paymentMethods?.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-3 bg-slate-950 border border-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden relative">
                                                {m.logo ? <img src={m.logo} alt={m.name} className="object-contain" /> : <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase">{m.name.charAt(0)}</div>}
                                            </div>
                                            <span className="font-bold text-sm">{m.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Switch 
                                                checked={m.active} 
                                                onCheckedChange={() => handleToggleMethod(selectedCountry!.id, selectedCountry!.paymentMethods, m.id)}
                                                className="data-[state=checked]:bg-primary"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMethod(m.id)} className="h-8 w-8 text-red-500"><Trash2 size={14} /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Formulaire ajout méthode */}
                        <div className="p-5 bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Ajouter une méthode</label>
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="Nom (ex: MTN MoMo)" value={newMethod.name} onChange={e => setNewMethod({...newMethod, name: e.target.value})} className="bg-slate-950 border-slate-800" />
                                <Input placeholder="URL Logo (Optionnel)" value={newMethod.logo} onChange={e => setNewMethod({...newMethod, logo: e.target.value})} className="bg-slate-950 border-slate-800" />
                            </div>
                            <Button onClick={handleAddMethod} disabled={isSubmitting} className="w-full h-12 rounded-xl bg-slate-800 hover:bg-primary hover:text-slate-950 font-black uppercase text-[10px] tracking-widest transition-all">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Plus size={14} className="mr-2"/> Ajouter à la liste</>}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
