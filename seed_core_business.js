const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
    const match = envContent.match(new RegExp(`${name}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedCoreBusiness() {
    console.log('--- Iniciando Seeding Refinado ---');

    const { data: vendedores } = await supabase.from('usuarios').select('id').eq('activo', true).limit(3);
    const { data: clientes } = await supabase.from('clientes').select('id').limit(10);
    const { data: vehiculos } = await supabase.from('vehiculos').select('id').limit(3);

    if (!vendedores || !clientes || vendedores.length === 0 || clientes.length === 0) {
        console.error('No hay datos suficientes.');
        return;
    }

    const hoy = new Date().toISOString().split('T')[0];

    // 1. Crear Pedidos para hoy con vehiculo_id para el conteo de vehiculos activos
    for (let i = 0; i < 3; i++) {
        const vId = vehiculos[i % vehiculos.length].id;
        const cId = clientes[i % clientes.length].id;
        const vendId = vendedores[i % vendedores.length].id;

        await supabase.from('pedidos').insert({
            cliente_id: cId,
            vendedor_id: vendId,
            vehiculo_id: vId,
            fecha_programada: hoy,
            total: 500,
            estado: 'en_ruta',
            moneda: 'PEN'
        });
    }
    console.log('✅ Pedidos de hoy creados con vehículos.');

    // 2. Crear Visitas
    for (let i = 0; i < 5; i++) {
        const vendId = vendedores[i % vendedores.length].id;
        const cId = clientes[(i + 5) % clientes.length].id;
        const horaIn = new Date();
        horaIn.setHours(9 + i, 0, 0);

        const { error } = await supabase.from('visitas_gps').insert({
            vendedor_id: vendId,
            cliente_id: cId,
            fecha: hoy,
            hora_checkin: horaIn.toISOString(),
            hora_checkout: i < 3 ? new Date(horaIn.getTime() + 15 * 60000).toISOString() : null,
            resultado: i < 2 ? 'venta' : 'prospecto',
            observaciones: 'Visita de prueba'
        });

        if (error) console.error(`Error visita ${i}:`, error.message);
        else console.log(`✅ Visita ${i} creada.`);
    }

    console.log('--- Seeding Completado ---');
}

seedCoreBusiness();
