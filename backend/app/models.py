from sqlalchemy import JSON, Column, String, Text

from .database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(String, primary_key=True, index=True)
    nome = Column(String, nullable=False, unique=True)
    pilares = Column(JSON, nullable=False, default=list)


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, index=True)
    data = Column(String, nullable=False)
    cliente = Column(String, nullable=False, index=True)
    nome = Column(String, nullable=False, default="")
    descricao = Column(Text, nullable=False)
    legenda = Column(Text, nullable=False, default="")
    tipo = Column(String, nullable=False, default="imagem")
    materialStatus = Column(String, nullable=False, default="tenho")
    roteiro = Column(JSON, nullable=False, default=dict)
    referenciaImagens = Column(JSON, nullable=False, default=list)
    materialImagens = Column(JSON, nullable=False, default=list)
    fotoProntaImagens = Column(JSON, nullable=False, default=list)
    criadoEm = Column(String, nullable=False)
    atualizadoEm = Column(String, nullable=False)
