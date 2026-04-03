'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, DollarSign, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ClientesPage() {
    const [busqueda, setBusqueda] = useState('');

    const { data: clientes, isLoading } = useQuery({
        queryKey: ['clientes', busqueda],
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
            const { data, error } = await q.order('razon_social');
            if (error) throw error;
            return data;
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        Clientes
                        <Badge variant="secondary" className="text-sm">{clientes?.length || 0} listados</Badge>
                    </h1>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center">
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
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Editar">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            {c.estado === 'activo' ? (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="Bloquear">
                                                    <Lock className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Desbloquear">
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
