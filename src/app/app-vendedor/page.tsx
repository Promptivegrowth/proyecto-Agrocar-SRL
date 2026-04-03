'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, PackageOpen, DollarSign, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AppVendedorDashboard() {
    const queryClient = useQueryClient();
    const [busqueda, setBusqueda] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: clientes, isLoading } = useQuery({
        queryKey: ['clientes-vendedor', busqueda],
        queryFn: async () => {
            let q = supabase.from('clientes').select('id, razon_social, estado, limite_credito');
            if (busqueda) q = q.ilike('razon_social', `%${busqueda}%`);
            const { data, error } = await q.limit(20);
            if (error) throw error;
            return data;
        }
    });

    const mutationCreate = useMutation({
        mutationFn: async (cliente: any) => {
            const userRes = await supabase.auth.getUser();
            const { data: usuario } = await supabase.from('usuarios').select('empresa_id, id').eq('id', userRes.data.user?.id).single();
            const payload = {
                ...cliente,
                empresa_id: usuario?.empresa_id,
                vendedor_asignado_id: usuario?.id,
                tipo_documento: 'RUC', // Preset for speed in mobile
                estado: 'activo'
            };
            const { error } = await supabase.from('clientes').insert([payload]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes-vendedor'] });
            setIsDialogOpen(false);
        }
    });

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        mutationCreate.mutate({
            numero_documento: fd.get('numero_documento'),
            razon_social: fd.get('razon_social'),
            telefono: fd.get('telefono'),
            direccion: fd.get('direccion'),
        });
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] flex flex-col relative pb-24 font-sans">
            {/* Header Stats */}
            <div className="p-4 grid grid-cols-2 gap-4">
                <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                            <PackageOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-2xl font-black text-slate-800 tracking-tight">0</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Pedidos Hoy</span>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-3">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-2xl font-black text-green-700 tracking-tight">S/ 0</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Vendido</span>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Title */}
            <div className="px-4 pb-4 sticky top-0 z-10 bg-[#F8FAFC]/80 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4 mt-2">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">Ruta de Hoy</h2>
                    <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600 font-bold rounded-lg px-3 py-1">
                        {clientes?.length || 0} clientes
                    </Badge>
                </div>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="Buscar cliente..."
                        className="bg-white border-none shadow-sm rounded-2xl h-12 pl-12 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-medium"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white rounded-t-[2.5rem] shadow-2xl border-t border-slate-100 mt-2">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400 font-medium italic">Cargando portafolio...</div>
                ) : clientes?.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-10 h-10 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-medium italic">No se encontraron clientes</p>
                    </div>
                ) : (
                    clientes?.map((c) => (
                        <Link key={c.id} href={`/app-vendedor/pedido/${c.id}`} className="block group">
                            <div className="p-5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{c.razon_social}</span>
                                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                                        <MapPin className="w-3 h-3 text-slate-400" /> Límite Cr: S/ {c.limite_credito?.toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-2 py-1 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                                        {c.estado}
                                    </Badge>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Create Client Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl bg-white p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tight uppercase italic flex items-center gap-2">
                                <UserPlus className="w-6 h-6" /> Nuevo Cliente
                            </DialogTitle>
                            <p className="text-blue-100/70 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Registro rápido de campo</p>
                        </DialogHeader>
                    </div>
                    <form onSubmit={handleCreate} className="p-8 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider ml-1">RUC / DNI</Label>
                            <Input name="numero_documento" placeholder="20123456789" required className="rounded-2xl border-slate-100 bg-slate-50 font-medium h-12" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider ml-1">Razón Social</Label>
                            <Input name="razon_social" placeholder="Nombre de la empresa o cliente" required className="rounded-2xl border-slate-100 bg-slate-50 font-medium h-12" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider ml-1">Teléfono</Label>
                                <Input name="telefono" placeholder="987..." className="rounded-2xl border-slate-100 bg-slate-50 font-medium h-12" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider ml-1">Distrito</Label>
                                <Input name="distrito" placeholder="Lima" className="rounded-2xl border-slate-100 bg-slate-50 font-medium h-12" />
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" disabled={mutationCreate.isPending} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                                {mutationCreate.isPending ? 'Guardando...' : 'Registrar Cliente'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    size="lg"
                    className="h-16 w-16 rounded-[2rem] shadow-2xl shadow-blue-600/40 bg-blue-600 hover:bg-blue-500 transition-all active:scale-90 flex items-center justify-center p-0 overflow-hidden group"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <Plus className="h-8 w-8 text-white transition-transform group-hover:rotate-90" />
                </Button>
            </div>
        </div>
    );
}
