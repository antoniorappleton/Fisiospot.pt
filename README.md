# Fisiospot.pt

Sistema de gestão para clínica de fisioterapia.

Versão beta.

## Estrutura

- `apps/web`: aplicação React para a operação da clínica.
- `packages/types`: contratos e tipos partilhados.
- `packages/ui`: componentes visuais partilhados.
- `packages/utils`: utilitários partilhados.
- `supabase`: migrações, políticas RLS, funções e dados iniciais.
- `docs`: arquitetura, base de dados, fluxos e RGPD.

## Desenvolvimento

```bash
npm install
npm run dev
```

Configurar as variáveis de `.env.example` num ficheiro `.env` antes de ligar ao Supabase.

## Publicar (GitHub Pages)

GitHub → Settings → Pages → Deploy from a branch → `main` / `(root)`.

```bash
npm run publish   # compila e copia a app para a raiz do repositório
git add -A && git commit -m "publish" && git push
```
