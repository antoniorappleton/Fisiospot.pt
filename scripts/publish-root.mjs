// Copia a build de apps/web/dist para a raiz do repositório,
// para o GitHub Pages servir a app com "Deploy from a branch → main / (root)".
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'apps/web/dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('apps/web/dist não existe. Corra "npm run build" primeiro.');
  process.exit(1);
}

const entries = readdirSync(dist);

for (const entry of entries) {
  rmSync(join(root, entry), { recursive: true, force: true });
  cpSync(join(dist, entry), join(root, entry), { recursive: true });
}

// Sem Jekyll: o GitHub Pages serve os ficheiros tal como estão.
writeFileSync(join(root, '.nojekyll'), '');

console.log(`Publicado na raiz: ${entries.join(', ')}, .nojekyll`);
