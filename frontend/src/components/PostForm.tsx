import { useState, useRef, FormEvent, ChangeEvent, DragEvent } from "react";
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
  referenciaImagens: [],
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
          referenciaImagens: post.referenciaImagens,
        }
      : emptyForm(data, cliente)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof PostInput>(field: K, value: PostInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "descricao" || field === "referenciaValor") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleTipoChange(tipo: ReferenciaTipo) {
    setImageError(null);
    setErrors((prev) => ({ ...prev, referenciaValor: undefined }));
    setForm((prev) => ({ ...prev, referenciaTipo: tipo, referenciaValor: "", referenciaImagens: [] }));
  }

  function readImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
      reader.readAsDataURL(file);
    });
  }

  async function addImageFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setImageError(null);

    const validos: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setImageError("Selecione apenas arquivos de imagem.");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError("Cada imagem deve ter no máximo 4MB.");
        continue;
      }
      validos.push(file);
    }

    if (validos.length === 0) return;

    try {
      const novasImagens = await Promise.all(validos.map(readImageFile));
      setForm((prev) => ({ ...prev, referenciaImagens: [...prev.referenciaImagens, ...novasImagens] }));
    } catch {
      setImageError("Falha ao ler uma ou mais imagens.");
    }
  }

  function handleImageInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addImageFiles(e.target.files);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setForm((prev) => ({
      ...prev,
      referenciaImagens: prev.referenciaImagens.filter((_, i) => i !== index),
    }));
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) addImageFiles(e.dataTransfer.files);
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
            <div
              className={dragActive ? "dropzone dropzone-active" : "dropzone"}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span>Arraste as imagens aqui ou clique para escolher</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageInputChange}
                className="dropzone-input"
              />
            </div>

            {form.referenciaImagens.length > 0 && (
              <div className="image-grid">
                {form.referenciaImagens.map((img, index) => (
                  <div key={index} className="image-grid-item">
                    <img src={img} alt={`Referência ${index + 1}`} className="image-grid-thumb" />
                    <button
                      type="button"
                      className="image-grid-remove"
                      onClick={() => removeImage(index)}
                      aria-label="Remover imagem"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
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
