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

## Contas demo

Password: `Demo123!`

| Perfil | Email |
| --- | --- |
| Administrador | filipe.db@fisiospot.pt |
| Administrativo | sofia.costa@fisiospot.pt |
| Fisioterapeuta | ana.martins@fisiospot.pt |
| Cliente | joao.pereira@fisiospot.pt |

Os dados demo ficam no browser (localStorage) e são partilhados entre perfis. "Repor dados demo" volta ao estado inicial.

## Publicar (GitHub Pages)

GitHub → Settings → Pages → Deploy from a branch → `main` / `(root)`.

```bash
npm run publish   # compila e copia a app para a raiz do repositório
git add -A && git commit -m "publish" && git push
```
