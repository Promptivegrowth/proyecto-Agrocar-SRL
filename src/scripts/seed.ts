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
    await supabase.from('vehiculos').upsert([
        { empresa_id, placa: 'AHM-001', marca: 'Hino', capacidad_kg: 4000, chofer_id: repartidor?.id },
        { empresa_id, placa: 'BQO-992', marca: 'Isuzu', capacidad_kg: 5000 }
    ], { onConflict: 'placa' });

    // 9. Inform output
    console.log('✅ Seeding completed!');
    console.log('\n--- LOGIN CREDENTIALS ---');
    roles.forEach(role => {
        console.log(`- ${role.toUpperCase()}: ${role}@agrocar.com.pe / ${demoPassword}`);
    });
    console.log('-------------------------\n');
}

seed().catch(console.error);
