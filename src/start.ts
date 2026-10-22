import { z } from 'zod';
import { createFateServer } from './server.ts';
const port = z.coerce.number().int().min(1).max(65535).parse(process.env.PORT || 3000);
const server = await createFateServer();
server.listen(port, '127.0.0.1', () => console.log(`Fate is running at http://localhost:${port}`));
