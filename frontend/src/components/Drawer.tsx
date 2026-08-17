import { useState } from "react";
import type { Post, PostInput } from "../types";
import PostForm from "./PostForm";

interface DrawerProps {
  date: string;
  cliente: string;
  posts: Post[];
  onClose: () => void;
  onCreate: (input: PostInput) => Promise<void>;
  onUpdate: (id: string, input: PostInput) => Promise<void>;
  onDelete: (id: string) => void;
}

function formatDateLong(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export default function Drawer({ date, cliente, posts, onClose, onCreate, onUpdate, onDelete }: DrawerProps) {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showForm, setShowForm] = useState(posts.length === 0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  function startNew() {
    setEditingPost(null);
    setShowForm(true);
  }

  function startEdit(post: Post) {
    setEditingPost(post);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(posts.length === 0);
    setEditingPost(null);
  }

  async function handleSubmit(input: PostInput) {
    if (editingPost) {
      await onUpdate(editingPost.id, input);
    } else {
      await onCreate(input);
    }
    setShowForm(false);
    setEditingPost(null);
  }

  function handleDeleteClick(id: string) {
    if (confirmingId === id) {
      onDelete(id);
      setConfirmingId(null);
      return;
    }
    setConfirmingId(id);
    setTimeout(() => setConfirmingId((current) => (current === id ? null : current)), 4000);
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>{formatDateLong(date)}</h2>
          <button className="btn-secondary" onClick={onClose}>fechar</button>
        </div>

        {!showForm && (
          <>
            <div className="drawer-posts">
              {posts.map((post) => (
                <div key={post.id} className="drawer-post-item">
                  <p className="post-descricao">{post.descricao}</p>
                  {post.referenciaTipo === "link" && post.referenciaValor && (
                    <a href={post.referenciaValor} target="_blank" rel="noreferrer" className="post-nota">
                      {post.referenciaValor}
                    </a>
                  )}
                  {post.referenciaTipo === "imagem" && post.referenciaValor && (
                    <img
                      src={post.referenciaValor}
                      alt="Referência"
                      className="image-preview image-preview-clickable"
                      onClick={() => setFullscreenImage(post.referenciaValor)}
                    />
                  )}
                  <div className="drawer-post-actions">
                    <button className="btn-link" onClick={() => startEdit(post)}>editar</button>
                    <button
                      className={confirmingId === post.id ? "btn-link btn-danger" : "btn-link"}
                      onClick={() => handleDeleteClick(post.id)}
                    >
                      {confirmingId === post.id ? "confirmar exclusão?" : "excluir"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary drawer-add-btn" onClick={startNew}>
              + Adicionar post neste dia
            </button>
          </>
        )}

        {showForm && (
          <PostForm
            key={editingPost?.id ?? "new"}
            data={date}
            cliente={cliente}
            post={editingPost}
            onSubmit={handleSubmit}
            onCancel={cancelForm}
          />
        )}
      </div>

      {fullscreenImage && (
        <div
          className="image-fullscreen-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setFullscreenImage(null);
          }}
        >
          <button
            className="btn-secondary image-fullscreen-close"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
            }}
          >
            fechar
          </button>
          <img src={fullscreenImage} alt="Referência em tela cheia" className="image-fullscreen-img" />
        </div>
      )}
    </div>
  );
}
