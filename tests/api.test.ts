import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { createFateServer } from '../src/server.ts';

let server: Server, base: string, dir: string;
const request = { demo:true, offer:'financing', scenario:'Test offer', now:'2026-08-28T12:00:00.000Z', filter:{objection:'cost',region:'all',segment:'all',months:12} };
const post = (path: string, body: unknown) => fetch(base+path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeAll(async()=>{dir=await mkdtemp(join(tmpdir(),'fate-test-'));server=await createFateServer(dir);await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const address=server.address();if(!address||typeof address==='string')throw Error('No address');base=`http://127.0.0.1:${address.port}`;});
afterAll(async()=>{await new Promise<void>((done,reject)=>server.close(error=>error?reject(error):done()));await rm(dir,{recursive:true,force:true});});
describe('standalone API',()=>{
 it('serves the website and limits static access',async()=>{expect((await fetch(base+'/')).status).toBe(200);expect((await fetch(base+'/.data/fate.sqlite')).status).toBe(404);expect((await fetch(base+'/src/server.ts')).status).toBe(404);});
 it('returns reproducible demo estimates and labels synthetic evidence',async()=>{const first=await (await post('/api/simulate',request)).json();const second=await (await post('/api/simulate',request)).json();expect(first.distribution).toEqual(second.distribution);expect(first.distribution.worlds).toBe(1000);expect(first.decisionReadiness.status).toBe('exploratory');expect(first.evidence[0]).toContain('synthetic');});
 it('persists only explicitly saved runs and recovers them after reopening the server',async()=>{expect(await(await fetch(base+'/api/simulations')).json()).toEqual([]);const response=await post('/api/simulate',{...request,save:true});expect(response.status).toBe(200);const result=await response.json();expect((await(await fetch(base+'/api/simulations')).json())[0].id).toBe(result.id);await new Promise<void>(done=>server.close(()=>done()));server=await createFateServer(dir);await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const address=server.address();if(!address||typeof address==='string')throw Error('No address');base=`http://127.0.0.1:${address.port}`;expect((await(await fetch(base+'/api/simulations')).json())[0].id).toBe(result.id);});
 it('rejects malformed data, duplicate IDs, and missing data sources',async()=>{expect((await post('/api/simulate',{...request,offer:'unknown'})).status).toBe(400);expect((await post('/api/simulate',{...request,demo:false})).status).toBe(400);expect((await post('/api/import',{csv:'id\nx'})).status).toBe(400);const csv='id,created_at,deal_value,gross_margin,converted\nx,2026-08-01,100,0.4,yes';const imported=await(await post('/api/import',{csv})).json();expect((await post('/api/simulate',{...request,demo:false,leads:[...imported.leads,...imported.leads]})).status).toBe(400);});
 it('rejects ambiguous CSV outcomes and invalid dates',async()=>{
  for(const line of ['x,2026-08-01,100,0.4,maybe','x,not-a-date,100,0.4,yes','x,2026-08-01,,0.4,yes']){
    expect((await post('/api/import',{csv:'id,created_at,deal_value,gross_margin,converted\n'+line})).status).toBe(400);
  }
 });
 it('preserves abstention for sparse imported evidence',async()=>{const csv='id,created_at,deal_value,gross_margin,converted\nx,2026-08-01,100,0.4,yes';const {leads}=await(await post('/api/import',{csv})).json();const result=await(await post('/api/simulate',{...request,demo:false,leads,filter:{...request.filter,objection:'all'}})).json();expect(result.decisionReadiness.status).toBe('abstain');});
 it('blocks cross-origin calls, malformed JSON, and excessive bodies',async()=>{expect((await fetch(base+'/api/health',{headers:{Origin:'https://example.com'}})).status).toBe(403);expect((await fetch(base+'/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status).toBe(400);expect((await post('/api/import',{csv:'a'.repeat(2000001)})).status).toBe(413);});
});
