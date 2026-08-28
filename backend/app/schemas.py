from pydantic import BaseModel, ConfigDict, field_validator


class PilarInput(BaseModel):
    id: str
    name: str
    desc: str = ""
    cadence: str = ""


class ClienteCreate(BaseModel):
    nome: str
    pilares: list[PilarInput] = []

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
    pilares: list[PilarInput]


class ClienteUpdate(BaseModel):
    nome: str | None = None
    pilares: list[PilarInput] | None = None

    @field_validator("nome")
    @classmethod
    def nome_nao_vazio(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("O campo \"nome\" é obrigatório.")
        return value


class PostInput(BaseModel):
    data: str
    cliente: str
    nome: str
    descricao: str = ""
    legenda: str = ""
    tipo: str = "imagem"
    materialStatus: str = "tenho"
    roteiro: dict = {}
    referenciaImagens: list[str] = []
    materialImagens: list[str] = []
    fotoProntaImagens: list[str] = []

    @field_validator("data", "cliente", "nome")
    @classmethod
    def campo_nao_vazio(cls, value: str) -> str:
        value = value.strip() if isinstance(value, str) else value
        if not value:
            raise ValueError("Campo obrigatório ausente.")
        return value

    @field_validator("descricao", "legenda")
    @classmethod
    def texto_trim(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, value: str) -> str:
        if value not in ("imagem", "video"):
            raise ValueError('O campo "tipo" precisa ser "imagem" ou "video".')
        return value

    @field_validator("materialStatus")
    @classmethod
    def material_status_valido(cls, value: str) -> str:
        if value not in ("tenho", "preciso-captar"):
            raise ValueError('O campo "materialStatus" precisa ser "tenho" ou "preciso-captar".')
        return value


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    data: str
    cliente: str
    nome: str
    descricao: str
    legenda: str
    tipo: str
    materialStatus: str
    roteiro: dict
    referenciaImagens: list[str]
    materialImagens: list[str]
    fotoProntaImagens: list[str]
    criadoEm: str
    atualizadoEm: str
