'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

        // 2. Insert payment
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
                observaciones: data.referencia ? `Operación: ${data.referencia}` : ''
            }])
            .select()
            .single()

        if (pError) throw pError

        // 3. Update Comprobante - fetch current state first to be atomic
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
        return { success: true, pagoId: newPago.id }
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
