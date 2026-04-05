'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Función auxiliar para convertir monto a letras (Simplificada)
function montoEnLetras(monto: number): string {
    const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    // En un entorno real se usaría una librería como 'numero-a-letras'
    // Aquí devolvemos un formato legible para el demo
    return `SON: ${monto.toFixed(2)} CON 00/100 SOLES`;
}

export async function registrarPago(data: {
    comprobanteId: string;
    cliente_id: string;
    monto: number;
    metodo: string;
    referencia: string;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Sesión expirada. Por favor, inicie sesión.' }
    }

    try {
        // 1. Get user and company
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('empresa_id')
            .eq('id', user.id)
            .single()

        let empresaId = usuario?.empresa_id;

        // Fallback for demo/admin if user record is missing in 'usuarios' table
        if (!empresaId) {
            const { data: firstEmp } = await supabase.from('empresas').select('id').limit(1).single();
            empresaId = firstEmp?.id;
        }

        if (!empresaId) throw new Error('No se pudo determinar la empresa vinculada al pago.');

        // 1b. Check for active caja (mandatory for professional cash control)
        const { data: cajaActiva } = await supabase
            .from('cajas')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('estado', 'abierta')
            .maybeSingle()

        if (data.metodo === 'efectivo' && !cajaActiva) {
            return { error: 'Debe abrir caja antes de registrar cobros en efectivo.' }
        }

        // 2. Insert payment (Temporalin without receipt number, will update later if needed, but we can generate number first)
        // ... (moving receipt number generation UP)

        // 3. GENERAR COMPROBANTE DE PAGO (RECIBO DE CAJA - RC)
        // Obtener serie para Recibos
        let { data: serieRC } = await supabase
            .from('series_comprobantes')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('tipo', 'RC')
            .eq('serie', 'RC01')
            .single();

        if (!serieRC) {
            const { data: newSerie } = await supabase
                .from('series_comprobantes')
                .insert({
                    empresa_id: empresaId,
                    tipo: 'RC',
                    serie: 'RC01',
                    correlativo_actual: 0,
                    activo: true
                })
                .select()
                .single();
            serieRC = newSerie;
        }

        const nextCorrRC = (serieRC?.correlativo_actual || 0) + 1;
        const numCompletoRC = `RC01-${String(nextCorrRC).padStart(8, '0')}`;

        const { data: newPago, error: pError } = await supabase
            .from('pagos')
            .insert([{
                empresa_id: empresaId,
                caja_id: cajaActiva?.id || null,
                comprobante_id: data.comprobanteId,
                cliente_id: data.cliente_id,
                monto: data.monto,
                metodo_pago: data.metodo,
                usuario_cobrador_id: user.id,
                fecha: new Date().toISOString().split('T')[0],
                observaciones: `${numCompletoRC} | ${data.referencia || 'S/Ref'}`
            }])
            .select()
            .single()

        if (pError) throw pError

        // ... (rest of it stays similar but using the pre-generated number)

        // Obtener datos del comprobante original para los detalles del recibo
        const { data: originalComp } = await supabase
            .from('comprobantes')
            .select('numero_completo, razon_social_cliente, num_doc_cliente, moneda')
            .eq('id', data.comprobanteId)
            .single();

        // Insertar el "Recibo de Caja" como un comprobante más para visibilidad en Facturación
        const { data: rcDoc } = await supabase
            .from('comprobantes')
            .insert({
                empresa_id: empresaId,
                tipo: 'RC',
                serie: 'RC01',
                correlativo: nextCorrRC,
                numero_completo: numCompletoRC,
                fecha_emision: new Date().toISOString().split('T')[0],
                pedido_id: null,
                cliente_id: data.cliente_id,
                tipo_doc_cliente: '-', // Info ya en el header
                num_doc_cliente: originalComp?.num_doc_cliente,
                razon_social_cliente: originalComp?.razon_social_cliente,
                direccion_cliente: 'COBRANZA DE DOCUMENTO: ' + (originalComp?.numero_completo || ''),
                moneda: originalComp?.moneda || 'PEN',
                total: data.monto,
                monto_pagado: data.monto,
                estado_pago: 'pagado',
                sunat_estado: 'interno',
                usuario_emisor_id: user.id
            })
            .select()
            .single();

        // Actualizar correlativo de serie RC
        await supabase
            .from('series_comprobantes')
            .update({ correlativo_actual: nextCorrRC })
            .eq('id', serieRC?.id);

        // 4. Update Comprobante - fetch current state first to be atomic
        const { data: comp, error: cFetchErr } = await supabase
            .from('comprobantes')
            .select('total, monto_pagado')
            .eq('id', data.comprobanteId)
            .single()

        if (cFetchErr) throw cFetchErr

        const nuevoMontoPagado = (Number(comp.monto_pagado) || 0) + Number(data.monto)
        const estadoFinal = nuevoMontoPagado >= Number(comp.total) ? 'pagado' : 'parcial'

        const { error: cUpdateErr } = await supabase
            .from('comprobantes')
            .update({
                monto_pagado: nuevoMontoPagado,
                estado_pago: estadoFinal
            })
            .eq('id', data.comprobanteId)

        if (cUpdateErr) throw cUpdateErr

        revalidatePath('/cobranzas/cuentas-corrientes')
        return {
            success: true,
            pagoId: newPago.id,
            recibo: {
                numero: numCompletoRC,
                monto: data.monto,
                letras: montoEnLetras(data.monto),
                original: originalComp?.numero_completo,
                razon_social: originalComp?.razon_social_cliente,
                documento: originalComp?.num_doc_cliente
            }
        }
    } catch (error: any) {
        console.error('Error in registrarPago:', error)
        return { error: error.message || 'Error desconocido al registrar el pago' }
    }
}

export async function getCajaActiva() {
    const supabase = await createClient()
    const userRes = await supabase.auth.getUser()
    if (!userRes.data.user) return null

    const { data } = await supabase
        .from('cajas')
        .select('*')
        .eq('usuario_id', userRes.data.user.id)
        .eq('estado', 'abierta')
        .maybeSingle()

    return data
}

export async function abrirCaja(montoApertura: number) {
    const supabase = await createClient()
    const userRes = await supabase.auth.getUser()
    const userId = userRes.data.user?.id
    if (!userId) throw new Error('No autenticado')

    const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', userId).single()
    const empresaId = usuario?.empresa_id || (await supabase.from('empresas').select('id').limit(1).single()).data?.id

    const { data, error } = await supabase
        .from('cajas')
        .insert([{
            empresa_id: empresaId,
            usuario_id: userId,
            fecha: new Date().toISOString().split('T')[0],
            monto_apertura: montoApertura,
            estado: 'abierta',
            hora_apertura: new Date().toISOString()
        }])
        .select()
        .single()

    if (error) throw error
    revalidatePath('/cobranzas/caja')
    return data
}

export async function cerrarCaja(cajaId: string, montoCierre: number) {
    const supabase = await createClient()

    // 1. Calcular monto sistema (pagos en efectivo del día para esta caja/usuario)
    const { data: pagos } = await supabase
        .from('pagos')
        .select('monto')
        .eq('caja_id', cajaId)
        .eq('metodo_pago', 'efectivo')

    const { data: caja } = await supabase.from('cajas').select('monto_apertura').eq('id', cajaId).single()
    const totalEfectivo = (pagos?.reduce((acc, p) => acc + Number(p.monto), 0) || 0) + Number(caja?.monto_apertura || 0)

    const { error } = await supabase
        .from('cajas')
        .update({
            monto_cierre: montoCierre,
            monto_sistema: totalEfectivo,
            diferencia: montoCierre - totalEfectivo,
            estado: 'cerrada',
            hora_cierre: new Date().toISOString()
        })
        .eq('id', cajaId)

    if (error) throw error
    revalidatePath('/cobranzas/caja')
    return { success: true }
}
