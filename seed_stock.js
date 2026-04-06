const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
    const match = envContent.match(new RegExp(`${name}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedStock() {
    console.log('--- Iniciando Seeding de Stock Crítico ---');

    const almacenId = '2dfcaa76-7e36-45a6-83e0-6a9da12209d3'; // Cámara Principal -18°C

    const productosCriticos = [
        {
            codigo: 'EMB-001',
            descripcion: 'Salchicha Huacho Premium 1kg',
            categoria: 'Embutidos',
            stock_minimo: 10,
            precio_lista_a: 15.50,
            precio_lista_b: 14.50,
            unidad_medida: 'KG',
            activo: true
        },
        {
            codigo: 'EMB-002',
            descripcion: 'Jamón Inglés Especial 500g',
            categoria: 'Embutidos',
            stock_minimo: 15,
            precio_lista_a: 12.90,
            precio_lista_b: 11.90,
            unidad_medida: 'UND',
            activo: true
        },
        {
            codigo: 'CAR-101',
            descripcion: 'Tocino Ahumado Rebanado 250g',
            categoria: 'Carnes',
            stock_minimo: 8,
            precio_lista_a: 18.00,
            precio_lista_b: 17.00,
            unidad_medida: 'UND',
            activo: true
        }
    ];

    for (const prod of productosCriticos) {
        // Upsert por codigo
        const { data: pData, error: pError } = await supabase
            .from('productos')
            .upsert(prod, { onConflict: 'codigo' })
            .select();

        if (pError) {
            console.error(`Error upserting product ${prod.descripcion}:`, pError.message);
            continue;
        }

        const product = pData[0];

        // Upsert stock
        const { error: sError } = await supabase
            .from('stock')
            .upsert({
                producto_id: product.id,
                almacen_id: almacenId,
                cantidad: Math.floor(product.stock_minimo / 2),
                costo_promedio: prod.precio_lista_b * 0.7
            }, { onConflict: 'producto_id,almacen_id' });

        if (sError) {
            console.log(`⚠️ Nota: No se pudo actualizar stock directamente para ${prod.descripcion} (quizás falte constraint). Intentando insert simple.`);
            await supabase.from('stock').insert({
                producto_id: product.id,
                almacen_id: almacenId,
                cantidad: Math.floor(product.stock_minimo / 2),
                costo_promedio: prod.precio_lista_b * 0.7
            });
        }
        console.log(`✅ Producto procesado: ${prod.descripcion}`);
    }

    // Generar visitas
    console.log('\n--- Generando Visitas de Prueba para Hoy ---');
    const { data: vendedores } = await supabase.from('usuarios').select('id').eq('activo', true).limit(3);
    const { data: clientes } = await supabase.from('clientes').select('id').limit(5);

    if (vendedores && clientes && vendedores.length > 0 && clientes.length > 0) {
        const hoy = new Date().toISOString().split('T')[0];
        const visitas = [];

        for (let i = 0; i < 5; i++) {
            const vendedor = vendedores[i % vendedores.length];
            const cliente = clientes[i % clientes.length];
            const horaCheckin = new Date();
            horaCheckin.setHours(8 + i, 30, 0);

            visitas.push({
                vendedor_id: vendedor.id,
                cliente_id: cliente.id,
                fecha: hoy,
                hora_checkin: horaCheckin.toISOString(),
                hora_checkout: i < 3 ? new Date(horaCheckin.getTime() + 30 * 60000).toISOString() : null,
                resultado: i < 2 ? 'venta' : i === 2 ? 'cobranza' : null,
                observaciones: i < 2 ? 'Venta cerrada exitosa' : i === 2 ? 'Cobro realizado' : 'En visita'
            });
        }

        const { error: vError } = await supabase.from('visitas_gps').insert(visitas);
        if (vError) console.error('Error insertando visitas:', vError.message);
        else console.log(`✅ Se insertaron 5 visitas para hoy (${hoy})`);
    }

    console.log('\n--- Seeding Completado ---');
}

seedStock();
