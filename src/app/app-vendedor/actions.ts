'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function registrarCheckin(clienteId: string, lat: number, lng: number) {
    const userRes = await supabase.auth.getUser();
    const userId = userRes.data.user?.id;
    if (!userId) throw new Error('No autenticado');

    // 1. Verificar si ya hay una visita activa
    const { data: activa } = await supabase
        .from('visitas_gps')
        .select('id')
        .eq('vendedor_id', userId)
        .is('hora_checkout', null)
        .single();

    if (activa) throw new Error('Ya tienes una visita activa. Finalízala antes de iniciar otra.');

    // 2. Crear nueva visita
    const { data: visita, error } = await supabase
        .from('visitas_gps')
        .insert([{
            vendedor_id: userId,
            cliente_id: clienteId,
            fecha: new Date().toISOString().split('T')[0],
            hora_checkin: new Date().toISOString(),
            latitud_checkin: lat,
            longitud_checkin: lng
        }])
        .select()
        .single();

    if (error) throw error;

    // 3. Registrar en tracking general
    await registrarTracking(lat, lng, 0);

    return visita;
}

export async function registrarCheckout(visitaId: string, lat: number, lng: number, resultado: string, observaciones: string) {
    const { error } = await supabase
        .from('visitas_gps')
        .update({
            hora_checkout: new Date().toISOString(),
            latitud_checkout: lat,
            longitud_checkout: lng,
            resultado,
            observaciones
        })
        .eq('id', visitaId);

    if (error) throw error;

    await registrarTracking(lat, lng, 0);
    return { success: true };
}

export async function registrarTracking(lat: number, lng: number, velocidad: number = 0) {
    const userRes = await supabase.auth.getUser();
    const userId = userRes.data.user?.id;
    if (!userId) return;

    await supabase.from('tracking_gps').insert([{
        usuario_id: userId,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toISOString(),
        latitud: lat,
        longitud: lng,
        velocidad
    }]);
}

export async function registrarAsistencia(tipo: 'ingreso' | 'salida') {
    const userRes = await supabase.auth.getUser();
    const userId = userRes.data.user?.id;
    if (!userId) throw new Error('No autenticado');

    // Simple attendance record in a custom meta or existing tracking
    // For now, we'll just log it in tracking with a special flag/velocidad if needed,
    // or better, a dedicated table if we had one. 
    // Since we don't have an 'asistencia' table in schema.sql, we'll use tracking_gps with speed -1 for ingress, -2 for egress as a hack for demo
    await supabase.from('tracking_gps').insert([{
        usuario_id: userId,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toISOString(),
        latitud: 0,
        longitud: 0,
        velocidad: tipo === 'ingreso' ? -1 : -2
    }]);

    return { success: true };
}

export async function registrarProspecto(data: any) {
    const userRes = await supabase.auth.getUser();
    const userId = userRes.data.user?.id;
    if (!userId) throw new Error('No autenticado');

    const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', userId).single();
    if (!usuario) throw new Error('Usuario sin empresa');

    const { error } = await supabase.from('clientes').insert([{
        ...data,
        empresa_id: usuario.empresa_id,
        vendedor_asignado_id: userId,
        estado: 'activo',
        lista_precio: 'B'
    }]);

    if (error) throw error;
    return { success: true };
}
