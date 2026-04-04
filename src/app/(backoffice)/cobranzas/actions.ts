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

        if (userError || !usuario) throw new Error('Usuario no vinculado a empresa')

        // 2. Insert payment
        const { error: pError } = await supabase
            .from('pagos')
            .insert([{
                empresa_id: usuario.empresa_id,
                comprobante_id: data.comprobanteId,
                cliente_id: data.cliente_id,
                monto: data.monto,
                metodo_pago: data.metodo,
                usuario_cobrador_id: user.id,
                fecha: new Date().toISOString().split('T')[0],
                observaciones: data.referencia ? `Ref: ${data.referencia}` : ''
            }])

        if (pError) throw pError

        // 3. Update Comprobante
        const { data: comp, error: cFetchErr } = await supabase
            .from('comprobantes')
            .select('total, monto_pagado')
            .eq('id', data.comprobanteId)
            .single()

        if (cFetchErr) throw cFetchErr

        const nuevoMontoPagado = (Number(comp.monto_pagado) || 0) + data.monto
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
        return { success: true }
    } catch (error: any) {
        console.error('Error in registrarPago:', error)
        return { error: error.message || 'Error desconocido al registrar el pago' }
    }
}
