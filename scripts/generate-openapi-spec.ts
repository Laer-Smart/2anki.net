import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { swaggerSpec } from '../src/config/swagger';

const outPath = join(__dirname, '..', 'openapi.json');
writeFileSync(outPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`Wrote ${outPath}`);
