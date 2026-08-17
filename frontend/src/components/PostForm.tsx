import { useState, FormEvent, ChangeEvent } from "react";
import type { Post, PostInput, ReferenciaTipo } from "../types";

interface PostFormProps {
  data: string;
  cliente: string;
  post: Post | null;
  onSubmit: (input: PostInput) => Promise<void>;
  onCancel: () => void;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const emptyForm = (data: string, cliente: string): PostInput => ({
  data,
  cliente,
  descricao: "",
  referenciaTipo: "link",
  referenciaValor: "",
});

type FieldErrors = Partial<Record<"descricao" | "referenciaValor", string>>;

export default function PostForm({ data, cliente, post, onSubmit, onCancel }: PostFormProps) {
  const [form, setForm] = useState<PostInput>(
    post
      ? {
          data: post.data,
          cliente: post.cliente,
          descricao: post.descricao,
          referenciaTipo: post.referenciaTipo,
          referenciaValor: post.referenciaValor,
        }
      : emptyForm(data, cliente)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  function updateField<K extends keyof PostInput>(field: K, value: PostInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "descricao" || field === "referenciaValor") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleTipoChange(tipo: ReferenciaTipo) {
    setImageError(null);
    setErrors((prev) => ({ ...prev, referenciaValor: undefined }));
    setForm((prev) => ({ ...prev, referenciaTipo: tipo, referenciaValor: "" }));
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("A imagem deve ter no máximo 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField("referenciaValor", String(reader.result));
    };
    reader.onerror = () => {
      setImageError("Falha ao ler a imagem.");
    };
    reader.readAsDataURL(file);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!form.descricao.trim()) next.descricao = "Descrição é obrigatória.";
    if (form.referenciaTipo === "link" && form.referenciaValor && !/^https?:\/\//i.test(form.referenciaValor)) {
      next.referenciaValor = "Informe uma URL válida (começando com http:// ou https://).";
    }
    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch {
      // erro já é exibido pelo componente pai
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          value={form.descricao}
          onChange={(e) => updateField("descricao", e.target.value)}
          rows={4}
          placeholder="Tema/chamada do post"
        />
        {errors.descricao && <span className="field-error">{errors.descricao}</span>}
      </div>

      <div className="field">
        <label>Referência</label>
        <div className="tab-toggle">
          <button
            type="button"
            className={form.referenciaTipo === "link" ? "tab-btn tab-btn-active" : "tab-btn"}
            onClick={() => handleTipoChange("link")}
          >
            Link
          </button>
          <button
            type="button"
            className={form.referenciaTipo === "imagem" ? "tab-btn tab-btn-active" : "tab-btn"}
            onClick={() => handleTipoChange("imagem")}
          >
            Imagem
          </button>
        </div>

        {form.referenciaTipo === "link" ? (
          <input
            type="url"
            value={form.referenciaValor}
            onChange={(e) => updateField("referenciaValor", e.target.value)}
            placeholder="https://..."
          />
        ) : (
          <div className="image-upload">
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {form.referenciaValor && (
              <img src={form.referenciaValor} alt="Referência" className="image-preview" />
            )}
          </div>
        )}
        {imageError && <span className="field-error">{imageError}</span>}
        {errors.referenciaValor && <span className="field-error">{errors.referenciaValor}</span>}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Salvando..." : post ? "Salvar alterações" : "Adicionar post"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
