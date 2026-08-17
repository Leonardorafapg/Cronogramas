import { useState } from "react";
import type { Post } from "../types";
import { exportPostsToPdf } from "../pdf";

interface ReportProps {
  cliente: string;
  rotuloMes: string;
  posts: Post[];
  onClose: () => void;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export default function Report({ cliente, rotuloMes, posts, onClose }: ReportProps) {
  const ordenados = [...posts].sort((a, b) => a.data.localeCompare(b.data));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExportPdf() {
    setExportError(null);
    setExporting(true);
    try {
      await exportPostsToPdf(cliente, rotuloMes, ordenados);
    } catch {
      setExportError("Falha ao gerar o PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="report">
      <div className="report-toolbar">
        <button className="btn-link" onClick={onClose}>‹ voltar</button>
        <div className="report-toolbar-actions">
          <button className="btn-secondary" onClick={() => window.print()}>Imprimir</button>
          <button className="btn-primary" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? "Gerando PDF..." : "Exportar PDF"}
          </button>
        </div>
      </div>
      {exportError && <div className="field-error report-hint">{exportError}</div>}

      <h2 className="report-title">Cronograma de Conteúdo, {cliente}, {rotuloMes}</h2>

      {ordenados.length === 0 ? (
        <div className="status-message">Nenhum post cadastrado para este cliente neste mês.</div>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Referência</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((post) => (
              <tr key={post.id}>
                <td className="report-cell-data">{formatDate(post.data)}</td>
                <td className="report-cell-descricao">{post.descricao}</td>
                <td className="report-cell-referencia">
                  {post.referenciaTipo === "link" && post.referenciaValor && (
                    <a href={post.referenciaValor} target="_blank" rel="noreferrer">
                      {post.referenciaValor}
                    </a>
                  )}
                  {post.referenciaTipo === "imagem" && post.referenciaValor && (
                    <img src={post.referenciaValor} alt="Referência" className="report-image" />
                  )}
                  {!post.referenciaValor && "Sem referência."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
