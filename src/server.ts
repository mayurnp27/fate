import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { simulateOffer } from './engine/engine.ts';
import { createDemoLeads } from './engine/data.ts';
import { OFFER_LIBRARY } from './engine/offers.ts';
import { leadSchema, populationFilterSchema } from './engine/schemas.ts';
import { parseLeadsCsv, CSV_TEMPLATE } from './engine/csv.ts';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '../site');
const publicFiles = new Set(['index.html', 'os.css', 'os.js', 'fate.css', 'fate.js', 'favicon.svg', 'workbench.css', 'workbench.js']);
const mime: Record<string, string> = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml' };
const MAX_BYTES = 2_000_000;
const MAX_LEADS = 2_000;
const bodySchema = z.object({
  leads: z.array(leadSchema).min(1).max(MAX_LEADS).optional(),
  demo: z.boolean().default(false),
  offer: z.enum(['financing', 'discount', 'trial', 'bundle']),
  filter: populationFilterSchema,
  scenario: z.string().trim().min(1).max(500),
  now: z.string().datetime().optional(),
  save: z.boolean().default(false),
}).strict().superRefine((body, ctx) => {
  if (body.demo === Boolean(body.leads)) ctx.addIssue({ code: 'custom', message: 'Supply either demo:true or leads, exclusively.' });
  if (body.leads && new Set(body.leads.map(x => x.id)).size !== body.leads.length) ctx.addIssue({ code: 'custom', message: 'Lead IDs must be unique.' });
});
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
async function jsonBody(req: IncomingMessage) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Use application/json.');
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new HttpError(413, 'Request exceeds 2 MB.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Malformed JSON.'); }
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

export async function createFateServer(dataDirectory = resolve('.data')) {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(dataDirectory, 'fate.sqlite'));
  db.exec('CREATE TABLE IF NOT EXISTS simulations (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, result TEXT NOT NULL)');
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // Local-only app: no cross-origin API or cross-site form access.
    const origin = req.headers.origin;
    if (origin && origin !== `http://${req.headers.host}`) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });
    const host = req.headers.host?.split(':')[0];
    if (host !== 'localhost' && host !== '127.0.0.1') return json(res, 403, { error: 'Invalid host.' });
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { status: 'ok', version: '0.1.0' });
      if (req.method === 'GET' && url.pathname === '/api/offers') return json(res, 200, Object.values(OFFER_LIBRARY));
      if (req.method === 'GET' && url.pathname === '/api/template') return json(res, 200, { csv: CSV_TEMPLATE });
      if (req.method === 'GET' && url.pathname === '/api/simulations') {
        const rows = db.prepare('SELECT result FROM simulations ORDER BY created_at DESC, rowid DESC LIMIT 20').all();
        return json(res, 200, rows.map(row => JSON.parse(String(row.result))));
      }
      if (req.method === 'POST' && url.pathname === '/api/import') {
        const { csv } = z.object({ csv: z.string().min(1).max(MAX_BYTES) }).strict().parse(await jsonBody(req));
        let leads;
        try { leads = await parseLeadsCsv(csv); } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid CSV.'); }
        if (leads.length > MAX_LEADS) throw new HttpError(400, `At most ${MAX_LEADS} rows are supported.`);
        return json(res, 200, { leads, count: leads.length });
      }
      if (req.method === 'POST' && url.pathname === '/api/simulate') {
        const body = bodySchema.parse(await jsonBody(req));
        const now = body.now ? new Date(body.now) : new Date();
        const leads = body.demo ? createDemoLeads(now) : body.leads!;
        if (leads.some(lead => new Date(lead.createdAt) > now)) throw new HttpError(400, 'Lead dates must not be in the future relative to now.');
        const result = simulateOffer(leads, body.filter, OFFER_LIBRARY[body.offer], body.scenario, now);
        if (body.demo) {
          result.decisionReadiness = { status: 'exploratory', label: 'Synthetic demo only', reason: 'Generated demo records test the engine; they do not establish real-company evidence.' };
          result.evidence.unshift('All input records in this run are generated synthetic demo data.');
        }
        if (body.save) db.prepare('INSERT INTO simulations VALUES (?, ?, ?)').run(result.id, result.createdAt, JSON.stringify(result));
        return json(res, 200, result);
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        if (publicFiles.has(file)) {
          const bytes = await readFile(resolve(site, file));
          res.writeHead(200, { 'Content-Type': `${mime[file.split('.').pop()!] || 'text/plain'}; charset=utf-8` });
          return res.end(req.method === 'HEAD' ? undefined : bytes);
        }
      }
      json(res, 404, { error: 'Not found.' });
    } catch (error) {
      if (error instanceof z.ZodError) return json(res, 400, { error: 'Invalid input.', issues: error.issues });
      if (error instanceof HttpError) return json(res, error.status, { error: error.message });
      console.error('Request failed:', error instanceof Error ? error.message : 'unknown');
      json(res, 500, { error: 'Internal server error.' });
    }
  });
  server.requestTimeout = 15_000;
  server.on('close', () => db.close());
  return server;
}
