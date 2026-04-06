const https = require('https');

const query = `
SELECT relname, relkind 
FROM pg_class 
WHERE relname = 'archivo_proyectos' 
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
`;

const data = JSON.stringify({ query });

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: '/v1/projects/ktvpoafwopcybuvbtmme/database/query',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer sbp_7c8050356071fc00b58dc2f4d25cec41b120c073',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = https.request(options, (res) => {
    let response = '';
    res.on('data', (d) => { response += d; });
    res.on('end', () => { console.log(response); });
});

req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
