export type ReferenciaTipo = "link" | "imagem";

export interface Post {
  id: string;
  data: string; // YYYY-MM-DD
  cliente: string;
  descricao: string;
  referenciaTipo: ReferenciaTipo;
  referenciaValor: string; // URL (link) ou data URI base64 (imagem)
  criadoEm: string;
  atualizadoEm: string;
}

export type PostInput = Pick<
  Post,
  "data" | "cliente" | "descricao" | "referenciaTipo" | "referenciaValor"
>;

export interface Cliente {
  id: string;
  nome: string;
}
