'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function confirmarConsolidado({
    vehiculoId,
    choferId,
    pedidosIds
}: {
    vehiculoId: string;
    choferId: string;
    pedidosIds: string[];
}) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data: usuario } = await supabase
            .from('usuarios')
            .select('empresa_id')
            .eq('id', user.id)
            .single();

        if (!usuario) throw new Error('Usuario no encontrado');

        // 1. Generar número de consolidado
        const { count } = await supabase
            .from('consolidados_despacho')
            .select('id', { count: 'exact', head: true });

        const year = new Date().getFullYear();
        const numero = `CD-${year}-${String((count || 0) + 1).padStart(5, '0')}`;

        // 2. Crear Consolidado
        const { data: consolidado, error: errorC } = await supabase
            .from('consolidados_despacho')
            .insert({
                empresa_id: usuario.empresa_id,
                numero,
                fecha: new Date().toISOString().split('T')[0],
                vehiculo_id: vehiculoId,
                chofer_id: choferId,
                estado: 'preparando',
                total_pedidos: pedidosIds.length
            })
            .select()
            .single();

        if (errorC) throw errorC;

        // 3. Vincular pedidos y descontar stock
        for (const pedidoId of pedidosIds) {
            // Actualizar pedido
            await supabase
                .from('pedidos')
                .update({
                    consolidado_id: consolidado.id,
                    estado: 'en_despacho',
                    vehiculo_id: vehiculoId
                })
                .eq('id', pedidoId);

            // Obtener items del pedido para descontar stock
            const { data: items } = await supabase
                .from('pedido_items')
                .select('*, productos(descripcion)')
                .eq('pedido_id', pedidoId);

            if (items) {
                for (const item of items) {
                    // Obtener stock actual (simplificado: primer almacén que encuentre con stock o el principal)
                    const { data: stock } = await supabase
                        .from('stock')
                        .select('id, cantidad')
                        .eq('producto_id', item.producto_id)
                        .limit(1)
                        .single();

                    if (stock) {
                        const nuevoSaldo = stock.cantidad - item.cantidad;

                        await supabase
                            .from('stock')
                            .update({ cantidad: nuevoSaldo }) // Permitimos negativos si no hay validación estricta
                            .eq('id', stock.id);

                        // Registrar movimiento
                        await supabase.from('stock_movimientos').insert({
                            empresa_id: usuario.empresa_id,
                            producto_id: item.producto_id,
                            almacen_id: '8976f9d4-8d4e-4f1b-9d4e-4f1b9d4e4f1b', // ID hardcoded para Almacén Principal (debe ser dinámico mejor)
                            tipo: 'salida',
                            motivo: 'despacho',
                            cantidad: item.cantidad,
                            referencia_id: consolidado.id,
                            referencia_tipo: 'consolidado',
                            saldo_anterior: stock.cantidad,
                            saldo_posterior: nuevoSaldo,
                            usuario_id: user.id,
                            fecha: new Date().toISOString()
                        });
                    }
                }
            }
        }

        revalidatePath('/(backoffice)/despacho');
        revalidatePath('/(backoffice)/almacen');

        return { success: true, numero: consolidado.numero, vehiculoId };
    } catch (error: any) {
        console.error('Error in confirmarConsolidado:', error);
        return { success: false, error: error.message };
    }
}
