'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function emitirComprobantesBloque(consolidadoId: string) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data: usuario } = await supabase
            .from('usuarios')
            .select('empresa_id')
            .eq('id', user.id)
            .single();

        if (!usuario) throw new Error('Usuario no vinculado a empresa');

        // 1. Obtener pedidos vinculados al consolidado
        const { data: pedidos, error: errPed } = await supabase
            .from('pedidos')
            .select('*, clientes(id, tipo_documento, numero_documento, razon_social, distrito, direccion)')
            .eq('consolidado_id', consolidadoId)
            .neq('estado', 'facturado'); // Evitar re-facturar

        if (errPed) throw errPed;
        if (!pedidos || pedidos.length === 0) throw new Error('No hay pedidos pendientes en este bloque');

        const resultados = [];

        for (const ped of pedidos) {
            // 2. Determinar tipo de comprobante (01 Factura, 03 Boleta)
            const tipoComprobante = ped.clientes?.tipo_documento === 'RUC' ? '01' : '03';
            const tipoSerie = tipoComprobante === '01' ? 'F' : 'B';
            const serieBase = tipoComprobante === '01' ? 'F001' : 'B001';

            // 3. Obtener/Crear serie y correlativo (Atómico)
            // Nota: En un entorno real esto debería ser una función RPC para evitar race conditions
            let { data: serieInfo } = await supabase
                .from('series_comprobantes')
                .select('*')
                .eq('empresa_id', usuario.empresa_id)
                .eq('tipo', tipoSerie)
                .eq('serie', serieBase)
                .single();

            if (!serieInfo) {
                // Crear serie inicial si no existe
                const { data: newSerie, error: errS } = await supabase
                    .from('series_comprobantes')
                    .insert({
                        empresa_id: usuario.empresa_id,
                        tipo: tipoSerie,
                        serie: serieBase,
                        correlativo_actual: 0,
                        activo: true
                    })
                    .select()
                    .single();
                if (errS) throw errS;
                serieInfo = newSerie;
            }

            const nuevoCorrelativo = (serieInfo.correlativo_actual || 0) + 1;

            // 4. Insertar Comprobante
            const { data: comprobante, error: insErr } = await supabase
                .from('comprobantes')
                .insert({
                    empresa_id: usuario.empresa_id,
                    tipo: tipoComprobante,
                    serie: serieBase,
                    correlativo: nuevoCorrelativo,
                    numero_completo: `${serieBase}-${String(nuevoCorrelativo).padStart(8, '0')}`,
                    fecha_emision: new Date().toISOString().split('T')[0],
                    pedido_id: ped.id,
                    consolidado_id: consolidadoId,
                    cliente_id: ped.cliente_id,
                    tipo_doc_cliente: ped.clientes?.tipo_documento,
                    num_doc_cliente: ped.clientes?.numero_documento,
                    razon_social_cliente: ped.clientes?.razon_social,
                    direccion_cliente: `${ped.clientes?.direccion || ''} ${ped.clientes?.distrito || ''}`,
                    moneda: ped.moneda || 'PEN',
                    subtotal: ped.subtotal || 0,
                    igv: ped.igv || 0,
                    total: ped.total,
                    condicion_pago: 'credito',
                    estado_pago: 'pendiente',
                    sunat_estado: 'aceptado', // Simulado
                    usuario_emisor_id: user.id
                })
                .select()
                .single();

            if (insErr) throw insErr;

            // 5. Clonar items del pedido a comprobante_items
            const { data: items } = await supabase
                .from('pedido_items')
                .select('*')
                .eq('pedido_id', ped.id);

            if (items) {
                const itemsComprobante = items.map(it => ({
                    comprobante_id: comprobante.id,
                    producto_id: it.producto_id,
                    descripcion: it.descripcion,
                    unidad_medida: it.unidad_medida,
                    cantidad: it.cantidad,
                    precio_unitario: it.precio_unitario,
                    descuento: it.descuento,
                    valor_venta: it.valor_venta,
                    igv: it.igv,
                    precio_total: it.precio_total
                }));
                await supabase.from('comprobante_items').insert(itemsComprobante);
            }

            // 6. Actualizar Serie y Pedido
            await supabase
                .from('series_comprobantes')
                .update({ correlativo_actual: nuevoCorrelativo })
                .eq('id', serieInfo.id);

            await supabase
                .from('pedidos')
                .update({ estado: 'facturado' })
                .eq('id', ped.id);

            resultados.push(comprobante.numero_completo);
        }

        // 7. Si todos los pedidos del consolidado están facturados, cerrar consolidado
        const { count: pendingCount } = await supabase
            .from('pedidos')
            .select('id', { count: 'exact', head: true })
            .eq('consolidado_id', consolidadoId)
            .neq('estado', 'facturado');

        if (pendingCount === 0) {
            await supabase
                .from('consolidados_despacho')
                .update({ estado: 'cerrado' })
                .eq('id', consolidadoId);
        }

        revalidatePath('/(backoffice)/facturacion/bloque');
        return { success: true, comprobantes: resultados };

    } catch (error: any) {
        console.error('Error in emitirComprobantesBloque:', error);
        return { success: false, error: error.message };
    }
}
