import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, getToken } from '../lib/api';
import { can, estadoDocumentoMeta, fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, TextInput } from './ui';
import { IconFile, IconUpload } from './icons';

export interface DocResumen {
  id: number;
  estado: string;
  fechaDocumento: string | null;
  fechaRecepcion: string | null;
  fechaVencimiento: string | null;
  observaciones: string | null;
  tipoDocumento: { id: number; codigo: string; nombre: string; categoria: string | null };
  beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string; numeroDocumento: string };
  caso: { id: number; numeroCaso: string; estado: string } | null;
  evidencias: { id: number; nombreArchivo: string; rutaReferencia: string; tipoMime: string | null; fechaCarga: string; observaciones: string | null }[];
}

export const ESTADOS_DOC = ['PENDIENTE', 'RECIBIDO', 'VIGENTE', 'VENCIDO', 'FALTANTE', 'NO_APLICA'];

// ── Modal: subir evidencia ────────────────────────────────────────────
export function ModalSubirEvidencia({ documento, onClose, onSubido }: { documento: DocResumen; onClose: () => void; onSubido: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!archivo) {
      setError('Selecciona un archivo (pdf, jpg, jpeg o png).');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      if (observaciones.trim()) fd.append('observaciones', observaciones.trim());
      const token = getToken();
      const res = await fetch(`/api/documentos/${documento.id}/evidencia`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al subir la evidencia');
      onSubido();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al subir la evidencia');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Subir evidencia · ${documento.tipoDocumento.nombre}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <p className="text-sm text-slate-600">
          Beneficiario: <strong>{documento.beneficiario.nombres} {documento.beneficiario.apellidos}</strong>
          {documento.caso && <> · Caso {documento.caso.numeroCaso}</>}
        </p>
        <Field label="Archivo" required hint="PDF, JPG o PNG · máximo 10 MB. Al subirlo, el documento pasa a RECIBIDO.">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-800"
          />
        </Field>
        <Field label="Observaciones">
          <TextInput value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Ej: copia escaneada" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Subir</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal: actualizar estado / fechas ─────────────────────────────────
export function ModalEditarDocumento({ documento, onClose, onActualizado }: { documento: DocResumen; onClose: () => void; onActualizado: () => void }) {
  const [estado, setEstado] = useState(documento.estado);
  const [fechaRecepcion, setFechaRecepcion] = useState(documento.fechaRecepcion?.slice(0, 10) ?? '');
  const [fechaVencimiento, setFechaVencimiento] = useState(documento.fechaVencimiento?.slice(0, 10) ?? '');
  const [observaciones, setObservaciones] = useState(documento.observaciones ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { estado };
      body.fechaRecepcion = fechaRecepcion || null;
      body.fechaVencimiento = fechaVencimiento || null;
      body.observaciones = observaciones;
      await api.patch(`/documentos/${documento.id}`, body);
      onActualizado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al actualizar el documento');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Estado · ${documento.tipoDocumento.nombre}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <Field label="Estado" required>
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS_DOC.map((s) => (
              <option key={s} value={s}>{estadoDocumentoMeta(s).label}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de recepción">
            <TextInput type="date" value={fechaRecepcion} onChange={(e) => setFechaRecepcion(e.target.value)} />
          </Field>
          <Field label="Fecha de vencimiento">
            <TextInput type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
          </Field>
        </div>
        <Field label="Observaciones">
          <TextInput value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Sección reutilizable: documentos de un beneficiario (ficha) ───────
export function SeccionDocumentos({ beneficiarioId, titulo = 'Documentos del expediente' }: { beneficiarioId: number; titulo?: string }) {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeEditar = can.escribirBeneficiarios(rol);

  const [items, setItems] = useState<DocResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [subir, setSubir] = useState<DocResumen | null>(null);
  const [editar, setEditar] = useState<DocResumen | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; documentos: DocResumen[] }>(`/documentos?beneficiarioId=${beneficiarioId}`);
      setItems(res.documentos);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
        <Badge tone="slate">{items.length} doc.</Badge>
      </div>

      {aviso && <div className={`px-4 py-2 text-sm ${aviso.includes('Error') || aviso.includes('Prohibido') ? 'text-red-600' : 'text-emerald-700'}`}>{aviso}</div>}

      {loading ? (
        <Spinner label="Cargando documentos…" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin documentos registrados" description="Los documentos iniciales se generan automáticamente al registrar al beneficiario." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((d) => {
            const meta = estadoDocumentoMeta(d.estado);
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{d.tipoDocumento.nombre}</p>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {d.tipoDocumento.categoria && <span className="text-xs text-slate-400">{d.tipoDocumento.categoria}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {d.fechaDocumento ? `Emitido: ${fmtFecha(d.fechaDocumento)} · ` : ''}
                    {d.fechaRecepcion ? `Recibido: ${fmtFecha(d.fechaRecepcion)} · ` : ''}
                    {d.fechaVencimiento ? `Vence: ${fmtFecha(d.fechaVencimiento)}` : ''}
                    {d.evidencias.length > 0 && ` · ${d.evidencias.length} evidencia(s)`}
                  </p>
                  {d.observaciones && <p className="mt-0.5 text-xs text-slate-400">{d.observaciones}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {d.evidencias[0] && (
                    <a href={d.evidencias[0].rutaReferencia} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Ver evidencia">
                      <IconFile size={16} />
                    </a>
                  )}
                  {puedeEditar && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => { setSubir(d); setAviso(null); }}>
                        <IconUpload size={13} /> Subir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditar(d); setAviso(null); }}>
                        Estado
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {subir && <ModalSubirEvidencia documento={subir} onClose={() => setSubir(null)} onSubido={() => { setAviso('Evidencia cargada. El documento pasa a RECIBIDO.'); cargar(); }} />}
      {editar && <ModalEditarDocumento documento={editar} onClose={() => setEditar(null)} onActualizado={() => { setAviso('Documento actualizado.'); cargar(); }} />}
    </Card>
  );
}