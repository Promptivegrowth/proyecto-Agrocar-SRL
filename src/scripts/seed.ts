import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const roles = ['superadmin', 'gerente', 'facturador', 'almacenero', 'vendedor', 'repartidor'];
const demoPassword = 'Password123!';

async function seed() {
    console.log('🌱 Starting Database Seeding...');

    // 1. Create Empresa
    console.log('🏢 Creating test company...');
    const { data: empresa, error: empError } = await supabase
        .from('empresas')
        .upsert({
            ruc: '20123456789',
            razon_social: 'AGROCAR S.R.L. DEMO',
            nombre_comercial: 'Línea de Frío Agrocar',
            direccion: 'Av. Industrial 123, Ate',
            distrito: 'Ate',
            provincia: 'Lima',
            departamento: 'Lima'
        }, { onConflict: 'ruc' })
        .select()
        .single();

    if (empError) {
        console.error('Error creating empresa:', empError);
        return;
    }
    const empresa_id = empresa.id;

    // 2. Create Users in Auth & Public.usuarios
    console.log('👥 Creating default users for all roles...');
    for (const role of roles) {
        const email = `${role}@agrocar.com.pe`;

        // Check if user exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let userId = existingUsers?.users.find(u => u.email === email)?.id;

        if (!userId) {
            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: demoPassword,
                email_confirm: true
            });
            if (authError) {
                console.error(`Error creating auth user ${role}:`, authError);
            } else {
                userId = newUser.user.id;
            }
        }

        if (userId) {
            await supabase
                .from('usuarios')
                .upsert({
                    id: userId,
                    empresa_id,
                    nombres: `Usuario ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                    apellidos: 'Demo',
                    email,
                    rol: role,
                    activo: true,
                    ...(role === 'vendedor' ? { codigo_vendedor: `VEND-01` } : {})
                }, { onConflict: 'id' });
        }
    }

    // Fetch created users to use their IDs
    const { data: users } = await supabase.from('usuarios').select('id, rol');
    const vendedor = users?.find(u => u.rol === 'vendedor');
    const repartidor = users?.find(u => u.rol === 'repartidor');

    // 3. Create Zonas
    console.log('🗺️ Creating delivery zones...');
    const zonasToSeed = [
        { nombre: 'Lima Norte', color_mapa: '#4ADE80', vendedor_id: vendedor?.id },
        { nombre: 'Lima Sur', color_mapa: '#F87171', vendedor_id: vendedor?.id },
        { nombre: 'Lima Moderna', color_mapa: '#60A5FA', vendedor_id: null },
    ];

    const { data: zonas } = await supabase
        .from('zonas')
        .upsert(zonasToSeed.map(z => ({ ...z, empresa_id })))
        .select();

    // 4. Create Clientes
    console.log('🏪 Creating 30 mock clients...');
    const tiposDocs = ['DNI', 'RUC'];
    const tiposCliente = ['mayorista', 'minorista', 'restaurante', 'bodega'];
    const clientesToSeed = Array.from({ length: 30 }).map((_, i) => ({
        empresa_id,
        tipo_documento: tiposDocs[i % 2],
        numero_documento: i % 2 === 0 ? `4000${1000 + i}` : `2050${1000000 + i}`,
        razon_social: i % 2 === 0 ? `Persona Demo ${i}` : `Bodega o Restaurante Demo ${i} SAC`,
        direccion: `Av. Los Pinos ${100 + i}`,
        distrito: i % 3 === 0 ? 'Surco' : i % 2 === 0 ? 'Miraflores' : 'Comas',
        tipo_cliente: tiposCliente[i % 4],
        limite_credito: i % 3 === 0 ? 5000 : 0,
        dias_credito: i % 3 === 0 ? 15 : 0,
        vendedor_asignado_id: vendedor?.id,
        zona_id: zonas?.[i % 3]?.id,
        latitud: -12.1 + (Math.random() * 0.1 - 0.05),
        longitud: -77.0 + (Math.random() * 0.1 - 0.05),
    }));

    await supabase.from('clientes').upsert(clientesToSeed, { onConflict: 'numero_documento' });

    // 5. Create Almacenes
    console.log('🧊 Creating warehouses...');
    const almacenes = [
        { empresa_id, nombre: 'Cámara Principal -18°C', tipo: 'refrigerado' },
        { empresa_id, nombre: 'Cámara Media 4°C', tipo: 'refrigerado' },
        { empresa_id, nombre: 'Almacén de Empaques', tipo: 'seco' }
    ];
    const { data: insertedAlmacenes } = await supabase.from('almacenes').upsert(almacenes).select();

    // 6. Create Productos
    console.log('🍖 Creating 50 mock products...');
    const categorias = ['Carnes', 'Lácteos', 'Aves', 'Pescados', 'Verduras Congeladas'];
    const uom = ['KG', 'UND', 'CJA', 'PAQ'];
    const productosToSeed = Array.from({ length: 50 }).map((_, i) => ({
        empresa_id,
        codigo: `PRD-${1000 + i}`,
        descripcion: `Producto Premium ${categorias[i % categorias.length]} - Variante ${i + 1}`,
        unidad_medida: uom[i % uom.length],
        precio_lista_a: 10 + Math.random() * 50,
        precio_lista_b: 15 + Math.random() * 50,
        precio_compra: 5 + Math.random() * 30,
        categoria: categorias[i % categorias.length],
        stock_minimo: 10 + Math.random() * 40
    }));
    const { data: insertedProductos } = await supabase.from('productos').upsert(productosToSeed, { onConflict: 'codigo' }).select();

    // 7. Seed Stock
    console.log('📦 Seeding inventory (Stock)...');
    if (insertedProductos && insertedAlmacenes) {
        const stockToSeed = insertedProductos.map(p => ({
            producto_id: p.id,
            almacen_id: insertedAlmacenes[0].id, // Principal
            cantidad: Math.floor(Math.random() * 1000) + 100,
            costo_promedio: p.precio_compra
        }));
        // Cannot upsert composite without constraint name nicely, so insert with ignore
        for (const st of stockToSeed) {
            await supabase.from('stock').insert(st).select(); // Might throw if exists, ignoring errors in loop
        }
    }

    // 8. Create Vehiculos
    console.log('🚚 Creating vehicles...');
    const { data: vehiculos } = await supabase.from('vehiculos').upsert([
        { empresa_id, placa: 'AHM-001', marca: 'Hino', capacidad_kg: 4000, chofer_id: repartidor?.id },
        { empresa_id, placa: 'BQO-992', marca: 'Isuzu', capacidad_kg: 5000 }
    ], { onConflict: 'placa' }).select();

    // 9. Seed Pedidos (Pre-venta)
    console.log('📝 Seeding 40 orders (pedidos)...');
    const { data: clientes } = await supabase.from('clientes').select('id').limit(20);
    const estados = ['confirmado', 'pendiente', 'entregado', 'facturado', 'en_despacho'];

    if (clientes && insertedProductos) {
        for (let i = 0; i < 40; i++) {
            const cliente_id = clientes[i % clientes.length].id;
            const pedidoNumero = `PV-2026-${String(i + 1).padStart(5, '0')}`;
            const { data: pedido, error: pedError } = await supabase.from('pedidos').insert({
                empresa_id,
                numero: pedidoNumero,
                cliente_id,
                vendedor_id: vendedor?.id,
                fecha_pedido: new Date(Date.now() - (i % 5) * 86400000).toISOString().split('T')[0],
                estado: estados[i % estados.length],
                total: 500 + Math.random() * 2000,
                vehiculo_id: vehiculos?.[0]?.id
            }).select().single();

            if (pedido) {
                // Add items to pedido
                await supabase.from('pedido_items').insert([
                    {
                        pedido_id: pedido.id,
                        producto_id: insertedProductos[i % 10].id,
                        cantidad: 10,
                        precio_unitario: 20
                    }
                ]);

                // 10. Seed Comprobantes (Invoices) - 30 invoices
                if (i < 30) {
                    console.log(`🧾 Seeding invoice for ${pedidoNumero}...`);
                    const serie = i % 2 === 0 ? 'F001' : 'B001';
                    const { data: comp } = await supabase.from('comprobantes').insert({
                        empresa_id,
                        tipo: serie.startsWith('F') ? '01' : '03',
                        serie,
                        correlativo: 1000 + i,
                        numero_completo: `${serie}-${1000 + i}`,
                        fecha_emision: new Date(Date.now() - (i % 3) * 86400000).toISOString().split('T')[0],
                        pedido_id: pedido.id,
                        cliente_id,
                        total: pedido.total,
                        estado_pago: i % 3 === 0 ? 'pagado' : (i % 3 === 1 ? 'parcial' : 'pendiente'),
                        sunat_estado: 'aceptado',
                        condicion_pago: (i % 3 === 0) ? 'contado' : 'credito',
                        monto_pagado: i % 3 === 0 ? pedido.total : (i % 3 === 1 ? pedido.total / 2 : 0)
                    }).select().single();

                    // 11. Seed Pagos - 20 payments
                    if (comp && (comp.estado_pago === 'pagado' || comp.estado_pago === 'parcial')) {
                        await supabase.from('pagos').insert({
                            empresa_id,
                            comprobante_id: comp.id,
                            cliente_id,
                            fecha: new Date().toISOString().split('T')[0],
                            monto: comp.monto_pagado,
                            metodo_pago: i % 2 === 0 ? 'yape' : 'efectivo',
                            usuario_cobrador_id: vendedor?.id,
                            observaciones: 'Pago de prueba inyectado'
                        });
                    }
                }
            }
        }

        // 12. Seed Caja
        console.log('💰 Opening a cash register (caja)...');
        await supabase.from('cajas').insert({
            empresa_id,
            nombre: 'Caja Central Lima',
            usuario_id: users?.find(u => u.rol === 'facturador')?.id || users?.[0].id,
            fecha: new Date().toISOString().split('T')[0],
            monto_apertura: 1000,
            estado: 'abierta',
            hora_apertura: new Date().toISOString()
        });

        // 13. Seed Consolidados Despacho
        console.log('🚛 Seeding 5 delivery blocks (consolidados)...');
        for (let j = 0; j < 5; j++) {
            const { data: cons } = await supabase.from('consolidados_despacho').insert({
                empresa_id,
                numero: `C-2026-${String(j + 1).padStart(4, '0')}`,
                fecha: new Date().toISOString().split('T')[0],
                vehiculo_id: vehiculos?.[j % (vehiculos?.length || 1)].id,
                chofer_id: repartidor?.id,
                estado: j < 2 ? 'en_ruta' : 'preparando',
                total_pedidos: 4
            }).select().single();

            if (cons) {
                // Link some facturado/en_despacho orders
                const { data: pedsSub } = await supabase.from('pedidos').select('id').eq('estado', 'en_despacho').limit(4);
                if (pedsSub) {
                    for (const p of pedsSub) {
                        await supabase.from('pedidos').update({
                            consolidado_id: cons.id
                        }).eq('id', p.id);
                    }
                }
            }
        }
    }

    // 13. Inform output
    console.log('✅ Seeding completed!');
    console.log('\n--- LOGIN CREDENTIALS ---');
    roles.forEach(role => {
        console.log(`- ${role.toUpperCase()}: ${role}@agrocar.com.pe / ${demoPassword}`);
    });
    console.log('-------------------------\n');
}

seed().catch(console.error);
