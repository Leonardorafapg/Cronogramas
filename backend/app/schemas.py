from pydantic import BaseModel, ConfigDict, field_validator


class ClienteCreate(BaseModel):
    nome: str

    @field_validator("nome")
    @classmethod
    def nome_nao_vazio(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O campo \"nome\" é obrigatório.")
        return value


class ClienteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nome: str


class PostInput(BaseModel):
    data: str
    cliente: str
    nome: str
    descricao: str
    referenciaImagens: list[str] = []
    materialImagens: list[str] = []
    fotoProntaImagens: list[str] = []

    @field_validator("data", "cliente", "nome", "descricao")
    @classmethod
    def campo_nao_vazio(cls, value: str) -> str:
        value = value.strip() if isinstance(value, str) else value
        if not value:
            raise ValueError("Campo obrigatório ausente.")
        return value


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    data: str
    cliente: str
    nome: str
    descricao: str
    referenciaImagens: list[str]
    materialImagens: list[str]
    fotoProntaImagens: list[str]
    criadoEm: str
    atualizadoEm: str
