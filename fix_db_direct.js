const https = require('https');

const token = 'sbp_5a3e87f186d73dc73870e402d5f3c3c2b8383cff';
const projectRef = 'ktvpoafwopcybuvbtmme';

const sql = "ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_tipo_cliente_check; ALTER TABLE clientes ADD CONSTRAINT clientes_tipo_cliente_check CHECK (tipo_cliente IN ('principal', 'secundario', 'prospecto', 'otro'));";

const data = JSON.stringify({ query: sql });

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${projectRef}/database/query`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, res => {
    let responseBody = '';
    res.on('data', d => { responseBody += d; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseBody);
    });
});

req.on('error', error => {
    console.error('Error:', error);
});

req.write(data);
req.end();
