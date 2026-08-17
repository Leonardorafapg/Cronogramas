import { FormEvent, useState } from "react";
import type { Cliente } from "../types";

interface ClientManagerProps {
  clientes: Cliente[];
  onAdd: (nome: string) => Promise<void>;
  onDelete: (id: string) => void;
  onSelect: (cliente: Cliente) => void;
}

export default function ClientManager({ clientes, onAdd, onDelete, onSelect }: ClientManagerProps) {
  const [nome, setNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onAdd(nome.trim());
      setNome("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar cliente.");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete() {
    if (!clienteParaExcluir) return;
    onDelete(clienteParaExcluir.id);
    setClienteParaExcluir(null);
  }

  return (
    <div className="client-manager">
      <form className="client-add-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nome do cliente"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            if (error) setError(null);
          }}
        />
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Adicionando..." : "Adicionar cliente"}
        </button>
      </form>
      {error && <div className="field-error">{error}</div>}

      {clientes.length === 0 && (
        <div className="status-message">Nenhum cliente cadastrado ainda.</div>
      )}

      <div className="client-grid">
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            className="client-card client-card-clickable"
            onClick={() => onSelect(cliente)}
          >
            <span className="client-card-main">{cliente.nome}</span>
            <button
              className="btn-secondary btn-danger-outline"
              onClick={(e) => {
                e.stopPropagation();
                setClienteParaExcluir(cliente);
              }}
            >
              excluir
            </button>
          </div>
        ))}
      </div>

      {clienteParaExcluir && (
        <div className="drawer-overlay" onClick={() => setClienteParaExcluir(null)}>
          <div className="drawer drawer-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Excluir cliente</h2>
              <button className="btn-secondary" onClick={() => setClienteParaExcluir(null)}>fechar</button>
            </div>
            <p className="confirm-text">
              Tem certeza que deseja excluir <strong>{clienteParaExcluir.nome}</strong>? Os posts já
              cadastrados para este cliente deixarão de aparecer no cronograma.
            </p>
            <div className="form-actions">
              <button className="btn-danger-solid" onClick={confirmDelete}>
                Excluir cliente
              </button>
              <button className="btn-secondary" onClick={() => setClienteParaExcluir(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
