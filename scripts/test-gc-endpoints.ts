import 'dotenv/config';

const BASE = 'http://localhost:3000/api/v1';
let cookie = '';
let gcTypeId = '';
let gcId = '';
let contactId = '';

async function authenticate() {
    const res = await fetch(`${BASE}/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@elli.com', password: 'password123' }),
    });
    const setCookie = res.headers.getSetCookie();
    cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    console.log(`Auth: ${res.status === 200 ? 'OK' : 'FAILED'} (${res.status})\n`);
}

async function req(method: string, path: string, body?: unknown) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Cookie: cookie,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json();
    return { status: res.status, json };
}

function log(label: string, status: number, pass: boolean, detail?: string) {
    const icon = pass ? 'PASS' : 'FAIL';
    console.log(`[${icon}] ${label} — ${status}${detail ? ` (${detail})` : ''}`);
}

async function run() {
    await authenticate();

    // --- GC Types ---
    console.log('=== GC Types ===');

    // GET /types
    let r = await req('GET', '/general-contractors/types');
    log('GET /types', r.status, r.status === 200, `${r.json.data?.length} types`);

    // POST /types
    r = await req('POST', '/general-contractors/types', {
        name: 'Test Type',
        code: 'TEST',
        description: 'Test GC type',
    });
    log('POST /types', r.status, r.status === 201);
    gcTypeId = r.json.data?.id;

    // PUT /types/:id
    r = await req('PUT', `/general-contractors/types/${gcTypeId}`, {
        description: 'Updated test type',
    });
    log('PUT /types/:id', r.status, r.status === 200);

    // --- GC CRUD ---
    console.log('\n=== General Contractors ===');

    // First get an existing contact to link
    const contactRes = await req('GET', '/contacts?size=1');
    contactId = contactRes.json.data?.[0]?.id;
    console.log(`Using contact: ${contactId || 'none available'}`);

    // POST / (create GC with nested contact)
    r = await req('POST', '/general-contractors', {
        name: 'Test Construction Co',
        gcTypeId,
        email: 'test@construction.com',
        phone: '+1-555-9999',
        address: '123 Test St',
        website: 'https://test-construction.com',
        paymentTerms: 'NET_30',
        retainagePercent: 10,
        ...(contactId ? { contacts: [{ contactId, isPrimary: true }] } : {}),
    });
    log('POST / (create GC)', r.status, r.status === 201);
    gcId = r.json.data?.id;
    if (r.status !== 201) {
        console.log('  Error:', JSON.stringify(r.json));
    }

    // GET / (list paginated)
    r = await req('GET', '/general-contractors?size=5&sortBy=name&sortOrder=asc');
    log('GET / (list)', r.status, r.status === 200, `${r.json.data?.length} items, total: ${r.json.pagination?.totalItems}`);

    // GET / (search)
    r = await req('GET', '/general-contractors?search=Test');
    log('GET / (search)', r.status, r.status === 200, `${r.json.data?.length} results`);

    // GET / (filter by status)
    r = await req('GET', '/general-contractors?status=ACTIVE');
    log('GET / (filter status)', r.status, r.status === 200, `${r.json.data?.length} active`);

    // GET / (filter by gcTypeId)
    r = await req('GET', `/general-contractors?gcTypeId=${gcTypeId}`);
    log('GET / (filter type)', r.status, r.status === 200, `${r.json.data?.length} of type`);

    // GET /:id
    r = await req('GET', `/general-contractors/${gcId}`);
    log('GET /:id', r.status, r.status === 200, `name: ${r.json.data?.name}`);

    // PUT /:id
    r = await req('PUT', `/general-contractors/${gcId}`, {
        name: 'Test Construction Co (Updated)',
        paymentTerms: 'NET_45',
    });
    log('PUT /:id (update)', r.status, r.status === 200, `name: ${r.json.data?.name}`);

    // GET /stats
    r = await req('GET', '/general-contractors/stats');
    log('GET /stats', r.status, r.status === 200, `totalGCs: ${r.json.data?.totalGCs}`);

    // --- Contact sub-resource ---
    console.log('\n=== GC Contacts ===');

    if (contactId) {
        // If contact was already linked via create, test with a different contact or skip
        const contactRes2 = await req('GET', '/contacts?size=5');
        const otherContact = contactRes2.json.data?.find((c: any) => c.id !== contactId);

        if (otherContact) {
            // POST /:id/contacts (add another contact)
            r = await req('POST', `/general-contractors/${gcId}/contacts`, {
                contactId: otherContact.id,
                isPrimary: false,
            });
            log('POST /:id/contacts (add)', r.status, r.status === 201);

            // PUT /:id/contacts/:contactId
            r = await req('PUT', `/general-contractors/${gcId}/contacts/${otherContact.id}`, {
                isPrimary: true,
            });
            log('PUT /:id/contacts/:contactId', r.status, r.status === 200);

            // DELETE /:id/contacts/:contactId
            r = await req('DELETE', `/general-contractors/${gcId}/contacts/${otherContact.id}`);
            log('DELETE /:id/contacts/:contactId', r.status, r.status === 200);
        } else {
            console.log('  Only 1 contact available, skipping add/update/remove tests');
        }
    } else {
        console.log('  No contacts in DB, skipping contact link tests');
    }

    // --- DELETE (deactivate) ---
    console.log('\n=== Cleanup ===');

    // DELETE /:id (sets INACTIVE)
    r = await req('DELETE', `/general-contractors/${gcId}`);
    log('DELETE /:id (deactivate)', r.status, r.status === 200, `status: ${r.json.data?.status}`);

    // DELETE /types/:id (should fail — GC still references it)
    r = await req('DELETE', `/general-contractors/types/${gcTypeId}`);
    log('DELETE /types/:id (in use)', r.status, r.status === 409, 'expected 409 conflict');

    console.log('\nDone!');
}

run().catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
});
