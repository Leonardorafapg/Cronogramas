# Cronograma de Conteúdo — Gbrand

Ferramenta interna para gerenciar o cronograma de postagens de múltiplos clientes em um único lugar. Sem login, sem usuários — é um link direto de uso interno.

## Stack

- **Frontend**: React + Vite + TypeScript, CSS puro. Deploy no **Vercel**.
- **Backend**: FastAPI (Python), com SQLAlchemy. Deploy no **Railway**.
- **Banco**: PostgreSQL (addon do Railway).

## Estrutura

```
frontend/     app React (Vite)
backend/      API FastAPI
```

São dois serviços separados — o frontend fala com o backend por HTTP (`VITE_API_URL`).

---

## 1. Rodando localmente

### Backend

```bash
cd backend
python -m venv .venv
```

Windows:
```bash
.venv\Scripts\activate
```
Mac/Linux:
```bash
source .venv/bin/activate
```

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Sem configurar nada, o backend usa um arquivo SQLite local (`local.db`) automaticamente — não precisa de Postgres para desenvolver. A API sobe em `http://localhost:8000`, com docs interativas em `http://localhost:8000/docs`.

### Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

O `.env.local` já aponta para `http://localhost:8000` por padrão. Abra `http://localhost:5173`.

---

## 2. Publicando o backend no Railway

1. Crie um projeto no [Railway](https://railway.app) e conecte o repositório (ou use `railway up` pela CLI a partir da pasta `backend/`).
2. Aponte o **root directory** do serviço para `backend/` (nas configurações do serviço, em "Settings → Root Directory").
3. Adicione o addon **PostgreSQL** ao projeto (botão "New" → "Database" → "PostgreSQL"). O Railway injeta a variável `DATABASE_URL` automaticamente no serviço do backend — não precisa copiar nada manualmente.
4. Nas variáveis de ambiente do serviço backend, adicione:
   ```
   ALLOWED_ORIGINS=https://seu-projeto.vercel.app
   ```
   (troque pelo domínio real depois que publicar o frontend — pode deixar como `*` enquanto testa).
5. O Railway detecta o `Procfile` (`backend/Procfile`) e sobe com:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
6. Ao subir, o backend cria as tabelas automaticamente no Postgres (não precisa rodar migração manual).
7. Copie a URL pública gerada pelo Railway (algo como `https://seu-backend.up.railway.app`) — vai precisar dela no passo do Vercel.

## 3. Publicando o frontend no Vercel

1. Crie um projeto no [Vercel](https://vercel.com) apontando para o mesmo repositório.
2. Em "Root Directory", selecione `frontend/`.
3. O Vercel detecta automaticamente que é um projeto Vite (`npm run build`, saída em `dist/`).
4. Em "Environment Variables", adicione:
   ```
   VITE_API_URL=https://seu-backend.up.railway.app
   ```
   (a URL copiada do Railway no passo anterior).
5. Deploy. Pronto — o frontend publicado no Vercel vai chamar o backend no Railway.

Depois disso, volte no Railway e atualize `ALLOWED_ORIGINS` com o domínio final do Vercel, para o CORS não ficar aberto para qualquer origem.

---

## Endpoints da API

- `GET /api/clientes` — lista clientes.
- `POST /api/clientes` — cria cliente. Campo obrigatório: `nome` (único).
- `DELETE /api/clientes/{id}` — remove cliente.
- `GET /api/posts` — lista todos os posts.
- `POST /api/posts` — cria um post. Campos obrigatórios: `data`, `cliente`, `descricao`. Opcionais: `referenciaTipo` (`link` ou `imagem`), `referenciaValor`.
- `PUT /api/posts/{id}` — atualiza um post existente.
- `DELETE /api/posts/{id}` — remove um post.

Docs interativas automáticas em `/docs` (Swagger) e `/redoc`.

## Variáveis de ambiente

**backend/.env** (ou nas variáveis do Railway):
- `DATABASE_URL` — preenchida automaticamente pelo Railway ao adicionar o Postgres. Localmente, deixe em branco para usar SQLite.
- `ALLOWED_ORIGINS` — domínio(s) do frontend, separados por vírgula. `*` libera geral (use só em dev).

**frontend/.env.local** (ou nas variáveis do Vercel):
- `VITE_API_URL` — URL base do backend.
