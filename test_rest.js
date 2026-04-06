const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnBvYWZ3b3BjeWJ1dmJ0bW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzg1MDMsImV4cCI6MjA5MDgxNDUwM30.RMyPjP2jsvzu8j_Hg6CUWh5MNsZI19cjH1yZ64tZfDE';
const url = 'https://ktvpoafwopcybuvbtmme.supabase.co/rest/v1/archivos?activo=eq.true&select=*';

const options = {
    method: 'GET',
    headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
    }
};

const req = https.request(url, options, (res) => {
    let response = '';
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => { response += d; });
    res.on('end', () => { console.log(response); });
});

req.on('error', (e) => { console.error(e); });
req.end();
