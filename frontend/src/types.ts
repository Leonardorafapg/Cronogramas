export type ReferenciaTipo = "link" | "imagem";

export interface Post {
  id: string;
  data: string; // YYYY-MM-DD
  cliente: string;
  descricao: string;
  referenciaTipo: ReferenciaTipo;
  referenciaValor: string; // URL, usado quando referenciaTipo === "link"
  referenciaImagens: string[]; // data URIs base64, usado quando referenciaTipo === "imagem"
  criadoEm: string;
  atualizadoEm: string;
}

export type PostInput = Pick<
  Post,
  "data" | "cliente" | "descricao" | "referenciaTipo" | "referenciaValor" | "referenciaImagens"
>;

export interface Cliente {
  id: string;
  nome: string;
}
