import { useEffect, useState, useCallback } from "react";
import type { Cliente, Post, PostInput } from "./types";
import { apiUrl } from "./api";
import Calendar, { MESES } from "./components/Calendar";
import ClientManager from "./components/ClientManager";
import Drawer from "./components/Drawer";
import Report from "./components/Report";

export default function App() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const now = new Date();
  const [displayYear, setDisplayYear] = useState(now.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(now.getMonth());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientesRes, postsRes] = await Promise.all([
        fetch(apiUrl("/api/clientes")),
        fetch(apiUrl("/api/posts")),
      ]);
      if (!clientesRes.ok || !postsRes.ok) throw new Error("Falha ao carregar os dados.");
      const clientesData = (await clientesRes.json()) as Cliente[];
      const postsData = (await postsRes.json()) as Post[];
      setClientes(clientesData);
      setPosts(postsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddCliente(nome: string) {
    setError(null);
    const res = await fetch(apiUrl("/api/clientes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Falha ao criar cliente.");
    }
    const created = (await res.json()) as Cliente;
    setClientes((prev) => [...prev, created]);
  }

  async function handleDeleteCliente(id: string) {
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/clientes/${id}`), { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao excluir cliente.");
      }
      setClientes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao excluir cliente.");
    }
  }

  async function handleCreatePost(input: PostInput) {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/posts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao criar o post.");
      }
      const created = (await res.json()) as Post;
      setPosts((prev) => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao criar post.");
      throw err;
    }
  }

  async function handleUpdatePost(id: string, input: PostInput) {
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/posts/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao atualizar o post.");
      }
      const updated = (await res.json()) as Post;
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao atualizar post.");
      throw err;
    }
  }

  async function handleDeletePost(id: string) {
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/posts/${id}`), { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao excluir o post.");
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao excluir post.");
    }
  }

  const postsDoCliente = selectedCliente
    ? posts.filter((p) => p.cliente === selectedCliente.nome)
    : [];

  const postsDoDia = selectedDate
    ? postsDoCliente.filter((p) => p.data === selectedDate)
    : [];

  const mesReferencia = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}`;
  const postsDoMes = postsDoCliente.filter((p) => p.data.startsWith(mesReferencia));
  const rotuloMes = `${MESES[displayMonth]} de ${displayYear}`;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Cronograma de Conteúdo</h1>
      </header>

      {error && <div className="banner-error">{error}</div>}
      {loading && <div className="status-message">Carregando...</div>}

      {!loading && !selectedCliente && (
        <ClientManager
          clientes={clientes}
          onAdd={handleAddCliente}
          onDelete={handleDeleteCliente}
          onSelect={(cliente) => {
            setSelectedCliente(cliente);
            setShowReport(false);
          }}
        />
      )}

      {!loading && selectedCliente && !showReport && (
        <Calendar
          cliente={selectedCliente.nome}
          posts={postsDoCliente}
          onSelectDate={setSelectedDate}
          onBack={() => {
            setSelectedCliente(null);
            setShowReport(false);
          }}
          onOpenReport={() => setShowReport(true)}
          onMonthChange={(year, month) => {
            setDisplayYear(year);
            setDisplayMonth(month);
          }}
        />
      )}

      {!loading && selectedCliente && showReport && (
        <Report
          cliente={selectedCliente.nome}
          rotuloMes={rotuloMes}
          posts={postsDoMes}
          onClose={() => setShowReport(false)}
        />
      )}

      {selectedCliente && selectedDate && !showReport && (
        <Drawer
          date={selectedDate}
          cliente={selectedCliente.nome}
          posts={postsDoDia}
          onClose={() => setSelectedDate(null)}
          onCreate={handleCreatePost}
          onUpdate={handleUpdatePost}
          onDelete={handleDeletePost}
        />
      )}
    </div>
  );
}
