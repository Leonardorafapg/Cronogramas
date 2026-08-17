from sqlalchemy import Column, String, Text

from .database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(String, primary_key=True, index=True)
    nome = Column(String, nullable=False, unique=True)


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, index=True)
    data = Column(String, nullable=False)
    cliente = Column(String, nullable=False, index=True)
    descricao = Column(Text, nullable=False)
    referenciaTipo = Column(String, nullable=False, default="link")
    referenciaValor = Column(Text, nullable=False, default="")
    criadoEm = Column(String, nullable=False)
    atualizadoEm = Column(String, nullable=False)
