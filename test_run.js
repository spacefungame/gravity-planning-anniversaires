const fs = require('fs');
const configCode = fs.readFileSync('config.js', 'utf8');
const scriptContext = {};
eval('const window = {}; ' + configCode + '; Object.assign(scriptContext, { CONFIG });');

async function run() {
    const url = scriptContext.CONFIG.SUPABASE_URL + '/rest/v1/booking_activities?select=*&start_at=gte.2026-08-28T00:00:00Z&start_at=lt.2026-08-30T00:00:00Z';
    const response = await fetch(url, { headers: { 'apikey': scriptContext.CONFIG.SUPABASE_KEY, 'Authorization': 'Bearer ' + scriptContext.CONFIG.SUPABASE_KEY, 'Accept': 'application/json' }});
    const data = await response.json();
    const aida = data.filter(d => JSON.stringify(d).toUpperCase().includes("MULAH"));
    console.log("Found rows for Aida:", aida.length);
    if(aida.length > 0) {
        console.log("Order ID:", aida[0].order_id);
        console.log("Qweekle ID:", aida[0].qweekle_booking_id);
        console.log("raw_payload has order?", !!aida[0].raw_payload.order);
        if (aida[0].raw_payload.order) {
            console.log("Order items length:", aida[0].raw_payload.order.items?.length);
            console.log("Order item 0 label:", aida[0].raw_payload.order.items?.[0]?.label);
        }
    }
}
run();
