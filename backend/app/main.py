import os
import time
import uuid
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, inspect, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, SessionLocal, engine, get_db


def migrar_colunas_ausentes() -> None:
    inspector = inspect(engine)
    tipo_json = "JSONB" if engine.dialect.name == "postgresql" else "JSON"

    if "posts" in inspector.get_table_names():
        colunas_posts = {col["name"] for col in inspector.get_columns("posts")}
        for coluna in ("referenciaImagens", "materialImagens", "fotoProntaImagens"):
            if coluna not in colunas_posts:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE posts ADD COLUMN "{coluna}" {tipo_json}'))
                    conn.execute(text(f'UPDATE posts SET "{coluna}" = \'[]\' WHERE "{coluna}" IS NULL'))
        if "nome" not in colunas_posts:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE posts ADD COLUMN "nome" VARCHAR'))
                conn.execute(text("UPDATE posts SET \"nome\" = '' WHERE \"nome\" IS NULL"))
        if "legenda" not in colunas_posts:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE posts ADD COLUMN "legenda" TEXT'))
                conn.execute(text("UPDATE posts SET \"legenda\" = '' WHERE \"legenda\" IS NULL"))
        # Colunas legadas de versões anteriores do schema (ex: referenciaTipo/
        # referenciaValor, substituídas pelas listas de imagens) continuam no
        # banco mesmo sem uso no código atual. Se alguma ficou NOT NULL, todo
        # INSERT novo quebra porque nada aqui as preenche mais — então
        # liberamos qualquer coluna órfã (existe no banco, não existe no
        # model) que ainda seja obrigatória.
        if engine.dialect.name == "postgresql":
            colunas_modelo = {c.name for c in models.Post.__table__.columns}
            colunas_orfas_obrigatorias = {
                col["name"]
                for col in inspector.get_columns("posts")
                if col["name"] not in colunas_modelo and not col["nullable"]
            }
            for coluna_legada in colunas_orfas_obrigatorias:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE posts ALTER COLUMN "{coluna_legada}" DROP NOT NULL'))

    if "clientes" in inspector.get_table_names():
        colunas_clientes = {col["name"] for col in inspector.get_columns("clientes")}
        if "pilares" not in colunas_clientes:
            with engine.begin() as conn:
                conn.execute(text(f'ALTER TABLE clientes ADD COLUMN "pilares" {tipo_json}'))
                conn.execute(text("UPDATE clientes SET \"pilares\" = '[]' WHERE \"pilares\" IS NULL"))


def criar_tabelas_com_retry(tentativas: int = 10, espera_segundos: float = 2.0) -> None:
    for tentativa in range(1, tentativas + 1):
        try:
            Base.metadata.create_all(bind=engine)
            migrar_colunas_ausentes()
            return
        except OperationalError:
            if tentativa == tentativas:
                raise
            time.sleep(espera_segundos)


criar_tabelas_com_retry()

app = FastAPI(title="Cronograma de Conteúdo API")

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in allowed_origins.split(",")] if allowed_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return uuid.uuid4().hex


# Pilares padrão pra cliente criado sem lista própria — só um ponto de
# partida editável depois pela aba de planejamento do cliente.
DEFAULT_PILARES = [
    {"id": "institucional", "name": "Institucional", "cadence": "Fixo", "desc": "Marca, valores, apresentação."},
    {"id": "produto", "name": "Produto/Serviço", "cadence": "Fixo", "desc": "O que é vendido/oferecido."},
    {"id": "bastidores", "name": "Bastidores", "cadence": "Rotativo", "desc": "Rotina, equipe, processo."},
    {"id": "prova-social", "name": "Prova social", "cadence": "Rotativo", "desc": "Depoimentos, resultados, avaliações."},
]


@app.get("/api/clientes", response_model=list[schemas.ClienteOut])
def listar_clientes(db: Session = Depends(get_db)):
    return db.query(models.Cliente).order_by(models.Cliente.nome).all()


@app.post("/api/clientes", response_model=schemas.ClienteOut, status_code=201)
def criar_cliente(payload: schemas.ClienteCreate, db: Session = Depends(get_db)):
    existente = (
        db.query(models.Cliente)
        .filter(func.lower(models.Cliente.nome) == payload.nome.lower())
        .first()
    )
    if existente:
        raise HTTPException(status_code=400, detail="Já existe um cliente com esse nome.")

    pilares = [p.model_dump() for p in payload.pilares] or DEFAULT_PILARES
    cliente = models.Cliente(id=new_id(), nome=payload.nome, pilares=pilares)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@app.put("/api/clientes/{cliente_id}", response_model=schemas.ClienteOut)
def atualizar_cliente(cliente_id: str, payload: schemas.ClienteUpdate, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    if payload.nome is not None:
        existente = (
            db.query(models.Cliente)
            .filter(func.lower(models.Cliente.nome) == payload.nome.lower())
            .filter(models.Cliente.id != cliente_id)
            .first()
        )
        if existente:
            raise HTTPException(status_code=400, detail="Já existe um cliente com esse nome.")
        cliente.nome = payload.nome

    if payload.pilares is not None:
        cliente.pilares = [p.model_dump() for p in payload.pilares]

    db.commit()
    db.refresh(cliente)
    return cliente


@app.delete("/api/clientes/{cliente_id}")
def excluir_cliente(cliente_id: str, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    db.delete(cliente)
    db.commit()
    return {"ok": True}


@app.get("/api/posts", response_model=list[schemas.PostOut])
def listar_posts(db: Session = Depends(get_db)):
    return db.query(models.Post).all()


@app.post("/api/posts", response_model=schemas.PostOut, status_code=201)
def criar_post(payload: schemas.PostInput, db: Session = Depends(get_db)):
    agora = now_iso()
    post = models.Post(
        id=new_id(),
        data=payload.data,
        cliente=payload.cliente,
        nome=payload.nome,
        descricao=payload.descricao,
        legenda=payload.legenda,
        referenciaImagens=payload.referenciaImagens,
        materialImagens=payload.materialImagens,
        fotoProntaImagens=payload.fotoProntaImagens,
        criadoEm=agora,
        atualizadoEm=agora,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@app.put("/api/posts/{post_id}", response_model=schemas.PostOut)
def atualizar_post(post_id: str, payload: schemas.PostInput, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")

    post.data = payload.data
    post.cliente = payload.cliente
    post.nome = payload.nome
    post.descricao = payload.descricao
    post.legenda = payload.legenda
    post.referenciaImagens = payload.referenciaImagens
    post.materialImagens = payload.materialImagens
    post.fotoProntaImagens = payload.fotoProntaImagens
    post.atualizadoEm = now_iso()

    db.commit()
    db.refresh(post)
    return post


@app.delete("/api/posts/{post_id}")
def excluir_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    db.delete(post)
    db.commit()
    return {"ok": True}


@app.exception_handler(RequestValidationError)
def validation_error_handler(_request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0]
    message = first_error.get("msg", "Dados inválidos.")
    return JSONResponse(status_code=400, content={"error": message})


@app.exception_handler(HTTPException)
def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.get("/api/health")
def health():
    return {"ok": True}
