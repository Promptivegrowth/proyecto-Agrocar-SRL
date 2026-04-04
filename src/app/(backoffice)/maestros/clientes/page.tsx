'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, DollarSign, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { guardarCliente, toggleEstadoCliente } from '../actions';

export default function ClientesPage() {
    const queryClient = useQueryClient();
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('todos');

    // Form State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<any>(null);

    const { data: clientes, isLoading } = useQuery({
        queryKey: ['clientes', busqueda, filtro],
        queryFn: async () => {
            let q = supabase
                .from('clientes')
                .select(`
          id, tipo_documento, numero_documento, razon_social, telefono, 
          tipo_cliente, lista_precio, limite_credito, estado,
          zonas(nombre),
          usuarios!vendedor_asignado_id(nombres)
        `);

            if (busqueda) {
                q = q.or(`razon_social.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%`);
            }

            if (filtro === 'prospecto') {
                q = q.eq('tipo_cliente', 'prospecto');
            } else if (filtro !== 'todos') {
                q = q.eq('estado', filtro);
            }

            const { data, error } = await q.order('razon_social');
            if (error) throw error;
            return data;
        }
    });

    const mutationSave = useMutation({
        mutationFn: async (cliente: any) => {
            const res = await guardarCliente(cliente, currentClient?.id);
            if (res.error) throw new Error(res.error);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            toast.success(currentClient ? 'Cliente actualizado' : 'Cliente registrado');
            setIsDialogOpen(false);
            setCurrentClient(null);
        },
        onError: (error: any) => {
            toast.error('Error: ' + error.message);
        }
    });

    const mutationToggleStatus = useMutation({
        mutationFn: async ({ id, estado }: { id: string, estado: string }) => {
            const res = await toggleEstadoCliente(id, estado);
            if (res.error) throw new Error(res.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            toast.success('Estado actualizado');
        }
    });

    const openEdit = (c: any) => {
        setCurrentClient(c);
        setIsDialogOpen(true);
    };

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = {
            tipo_documento: fd.get('tipo_documento'),
            numero_documento: fd.get('numero_documento'),
            razon_social: fd.get('razon_social'),
            telefono: fd.get('telefono'),
            tipo_cliente: fd.get('tipo_cliente'),
            limite_credito: parseFloat(fd.get('limite_credito') as string) || 0,
        };
        mutationSave.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        Clientes
                        <Badge variant="secondary" className="text-sm">{clientes?.length || 0} listados</Badge>
                    </h1>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger
                        render={
                            <Button className="bg-primary hover:bg-primary/90 text-white font-medium" onClick={() => setCurrentClient(null)}>
                                <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
                            </Button>
                        }
                    />
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{currentClient ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo de Documento</Label>
                                    <Input name="tipo_documento" defaultValue={currentClient?.tipo_documento || 'RUC'} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Número de Documento</Label>
                                    <Input name="numero_documento" defaultValue={currentClient?.numero_documento} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Razón Social / Nombres</Label>
                                <Input name="razon_social" defaultValue={currentClient?.razon_social} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input name="telefono" defaultValue={currentClient?.telefono} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo Cliente</Label>
                                    <Input name="tipo_cliente" defaultValue={currentClient?.tipo_cliente || 'bodega'} placeholder="bodega, mayorista..." required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Límite de Crédito (S/)</Label>
                                <Input name="limite_credito" type="number" step="0.01" defaultValue={currentClient?.limite_credito || '0'} required />
                            </div>
                            <DialogFooter className="mt-4">
                                <Button type="submit" disabled={mutationSave.isPending} className="w-full bg-[#1A2C45] text-white">
                                    {mutationSave.isPending ? 'Guardando...' : 'Guardar Cliente'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="todos" className="w-full" onValueChange={(v) => {
                // We'll use the filter logic by status or type
                setFiltro(v);
            }}>
                <TabsList className="bg-gray-100 p-1 mb-4">
                    <TabsTrigger value="todos" className="data-[state=active]:bg-white px-8">Todos</TabsTrigger>
                    <TabsTrigger value="activos" className="data-[state=active]:bg-white px-8">Activos</TabsTrigger>
                    <TabsTrigger value="prospecto" className="data-[state=active]:bg-white px-8 font-bold text-orange-600 uppercase">Prosp. de Campo</TabsTrigger>
                    <TabsTrigger value="bloqueado" className="data-[state=active]:bg-white px-8">Bloqueados</TabsTrigger>
                </TabsList>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center mb-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por DNI/RUC o Razón Social..."
                            className="pl-9"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>
            </Tabs>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/80">
                        <TableRow>
                            <TableHead>Documento</TableHead>
                            <TableHead>Razón Social</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Zona</TableHead>
                            <TableHead>Vendedor</TableHead>
                            <TableHead className="text-center">Tipo Precio</TableHead>
                            <TableHead className="text-right">Lím. Crédito</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-[140px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">Cargando clientes...</TableCell></TableRow>
                        ) : clientes?.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">No se encontraron clientes.</TableCell></TableRow>
                        ) : (
                            clientes?.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium text-gray-900">
                                        {c.tipo_documento}: {c.numero_documento}
                                    </TableCell>
                                    <TableCell>
                                        {c.razon_social}
                                        <div className="text-xs text-gray-400 mt-0.5 capitalize">{c.tipo_cliente}</div>
                                    </TableCell>
                                    <TableCell>{c.telefono || '-'}</TableCell>
                                    <TableCell>
                                        {/* @ts-ignore */}
                                        {c.zonas?.nombre || c.zonas?.[0]?.nombre || 'Sin Zona'}
                                    </TableCell>
                                    <TableCell>
                                        {/* @ts-ignore */}
                                        {c.usuarios?.nombres || c.usuarios?.[0]?.nombres || 'No asignado'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline">{c.lista_precio}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {c.limite_credito > 0 ? `S/ ${c.limite_credito.toFixed(2)}` : 'Contado'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={c.estado === 'activo' ? 'default' : 'destructive'} className={c.estado === 'activo' ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                                            {c.estado}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link href={`/cobranzas/cuentas-corrientes?cliente_id=${c.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Ver Cuenta Corriente">
                                                    <DollarSign className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Editar" onClick={() => openEdit(c)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            {c.estado === 'activo' ? (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="Bloquear" onClick={() => mutationToggleStatus.mutate({ id: c.id, estado: 'bloqueado' })} disabled={mutationToggleStatus.isPending}>
                                                    <Lock className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Desbloquear" onClick={() => mutationToggleStatus.mutate({ id: c.id, estado: 'activo' })} disabled={mutationToggleStatus.isPending}>
                                                    <Unlock className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

