import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { BeneficiarioDetail, ProfesionalSimple } from '../lib/types';
import { can, edad, edadExacta, estadoActividadMeta, estadoMeta, fmtFecha, fmtFechaHora, iniciales, nombreArea, nombreTipoDocumento } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Spinner, TextArea, TextInput } from '../components/ui';
import { IconCheckCircle, IconUserPlus } from '../components/icons';
import { SeccionDocumentos } from '../components/documentos-ui';
import { SeccionControles } from '../components/controles-ui';
import { SeccionNutricion } from '../components/nutricion-ui';
import { SeccionRedes } from '../components/redes-ui';
import { SeccionEscolaridad } from '../components/escolaridad-ui';
import { SeccionFamilia } from '../components/familia-ui';
import { SeccionInfoIngreso } from '../components/info-ingreso-ui';
import { SeccionAtenciones } from '../components/atenciones-ui';
import { SeccionCondiciones } from '../components/condiciones-ui';
import { ModalEditarBeneficiario } from '../components/editar-beneficiario-ui';

export default function DetalleBeneficiario() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const navigate = useNavigate();
  const profesionalId = usuario?.profesional?.id ?? null;

  const [item, setItem] = useState<BeneficiarioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [asignarAbierto, setAsignarAbierto] = useState(false);
  const [cerrarAbierto, setCerrarAbierto] = useState(false);
  const [profesionales, setProfesionales] = useState<ProfesionalSimple[]>([]);
  const [profSeleccionado, setProfSeleccionado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [accionando, setAccionando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [editandoAbierto, setEditandoAbierto] = useState(false);
  const [egresoAbierto, setEgresoAbierto] = useState(false);
  const [actividadAbierta, setActividadAbierta] = useState(false);
  const [atencionAbierta, setAtencionAbierta] = useState(false);
  const [nuevaAt, setNuevaAt] = useState({ areaCodigo: 'PS', tipo: 'ATENCION', fechaProgramada: new Date().toISOString().slice(0, 10), observaciones: '' });
  const [tiposAct, setTiposAct] = useState<any[]>([]);
  const [nuevaAct, setNuevaAct] = useState({ tipoActividadId: '', fechaProgramada: new Date().toISOString().slice(0, 10), prioridad: 'MEDIA', observaciones: '' });
  const [fechaEgreso, setFechaEgreso] = useState(new Date().toISOString().slice(0, 10));
  const [motivoEgreso, setMotivoEgreso] = useState('');

  async function marcarEgreso() {
    if (!item) return;
    setAccionando(true);
    setErrorEliminar(null);
    try {
      await api.patch('/beneficiarios/' + item.id, {
        estado: 'EGRESADO',
        fechaEgreso,
        motivoEgreso: motivoEgreso.trim() || null,
      });
      setEgresoAbierto(false);
      setAviso('Beneficiario marcado como egresado. Ya no aparece en los módulos operativos; se consulta en Egresados.');
      cargar();
    } catch (err: any) {
      setErrorEliminar(err.message ?? 'Error al marcar el egreso');
      setEgresoAbierto(false);
    } finally {
      setAccionando(false);
    }
  }

  async function reactivar() {
    if (!item) return;
    if (!window.confirm('\u00bfReactivar a ' + item.nombres + ' ' + item.apellidos + '? Volverá a aparecer en los módulos operativos.')) return;
    setAccionando(true);
    setErrorEliminar(null);
    try {
      await api.patch('/beneficiarios/' + item.id, { estado: 'ACTIVO' });
      setAviso('Beneficiario reactivado.');
      cargar();
    } catch (err: any) {
      setErrorEliminar(err.message ?? 'Error al reactivar');
    } finally {
      setAccionando(false);
    }
  }

  async function abrirNuevaActividad() {
    setNuevaAct({ tipoActividadId: '', fechaProgramada: new Date().toISOString().slice(0, 10), prioridad: 'MEDIA', observaciones: '' });
    setActividadAbierta(true);
    try {
      const cat = await api.get<any>('/catalogos/todos');
      setTiposAct(cat.tiposActividad ?? []);
    } catch {
      setTiposAct([]);
    }
  }

  async function guardarActividad() {
    if (!item || !nuevaAct.tipoActividadId) {
      setErrorEliminar('Elige el tipo de actividad');
      return;
    }
    const tipo = tiposAct.find((t: any) => String(t.id) === nuevaAct.tipoActividadId);
    const asigActiva = item.casos?.[0]?.asignaciones?.find((a: any) => a.estado === 'ACTIVA' && a.area?.codigo === tipo?.areaCodigo);
    if (!asigActiva) {
      setErrorEliminar('El tipo elegido pertenece al área ' + (tipo?.areaNombre ?? '—') + ': primero asigna un profesional de esa área');
      return;
    }
    setAccionando(true);
    setErrorEliminar(null);
    try {
      await api.post('/actividades', {
        asignacionCasoId: asigActiva.id,
        tipoActividadId: Number(nuevaAct.tipoActividadId),
        fechaProgramada: nuevaAct.fechaProgramada,
        prioridad: nuevaAct.prioridad,
        observaciones: nuevaAct.observaciones.trim() || null,
      });
      setActividadAbierta(false);
      setAviso('Actividad creada.');
      cargar();
    } catch (err: any) {
      setErrorEliminar(err.message ?? 'Error al crear la actividad');
    } finally {
      setAccionando(false);
    }
  }

  async function guardarAtencionManual() {
    if (!item) return;
    setAccionando(true);
    setErrorEliminar(null);
    try {
      await api.post('/atenciones', {
        beneficiarioId: item.id,
        areaCodigo: nuevaAt.areaCodigo,
        tipo: nuevaAt.tipo,
        fechaProgramada: nuevaAt.fechaProgramada,
        observaciones: nuevaAt.observaciones.trim() || null,
      });
      setAtencionAbierta(false);
      setAviso('Atención registrada.');
      cargar();
    } catch (err: any) {
      setErrorEliminar(err.message ?? 'Error al registrar la atención');
    } finally {
      setAccionando(false);
    }
  }

  async function eliminarBeneficiario() {
    if (!item) return;
    if (!window.confirm('\u00bfEliminar definitivamente a ' + item.nombres + ' ' + item.apellidos + ' (' + item.numeroHistoria + ') junto con todo su expediente? Esta acci\u00f3n no se puede deshacer.')) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await api.del('/beneficiarios/' + item.id);
      navigate('/beneficiarios');
    } catch (err: any) {
      setErrorEliminar(err.message ?? 'Error al eliminar');
    } finally {
      setEliminando(false);
    }
  }

  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<BeneficiarioDetail>(`/beneficiarios/${id}`);
      setItem(res);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar el beneficiario');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirAsignar = useCallback(async () => {
    setAsignarAbierto(true);
    setProfSeleccionado('');
    setMotivo('');
    setAviso(null);
    try {
      const res = await api.get<{ total: number; profesionales: ProfesionalSimple[] }>('/profesionales');
      setProfesionales(res.profesionales);
    } catch {
      setProfesionales([]);
    }
  }, []);

  const guardarAsignacion = async () => {
    if (!item || !profSeleccionado) return;
    setAccionando(true);
    setAviso(null);
    try {
      await api.post(`/casos/${item.casos[0].id}/profesionales`, {
        profesionalId: Number(profSeleccionado),
        motivoCambio: motivo.trim() || undefined,
      });
      setAviso('Profesional asignado. El historial se conserva.');
      setAsignarAbierto(false);
      cargar();
    } catch (e: any) {
      setAviso(e.message ?? 'Error al asignar');
    } finally {
      setAccionando(false);
    }
  };

  const cerrarCaso = async () => {
    if (!item) return;
    setAccionando(true);
    setAviso(null);
    try {
      await api.post(`/casos/${item.casos[0].id}/cerrar`, { motivoEgreso: motivo.trim() || undefined });
      setAviso('Caso cerrado y beneficiario marcado como egresado.');
      setCerrarAbierto(false);
      cargar();
    } catch (e: any) {
      setAviso(e.message ?? 'Error al cerrar el caso');
    } finally {
      setAccionando(false);
    }
  };

  const marcarRealizada = async (actividadId: number) => {
    setAviso(null);
    try {
      await api.patch(`/actividades/${actividadId}/marcar-realizada`);
      setAviso('Actividad marcada como realizada.');
      cargar();
    } catch (e: any) {
      setAviso(e.message ?? 'Error al marcar la actividad');
    }
  };

  const puedeMarcar = useMemo(
    () => (a: { id: number; asignacionCaso?: { profesional?: { id: number } } }) => {
      if (!can.marcarActividad(rol)) return false;
      if (rol === 'PROFESIONAL') return !!profesionalId && a.asignacionCaso?.profesional?.id === profesionalId;
      return true;
    },
    [rol, profesionalId],
  );

  if (loading) return <Spinner label="Cargando beneficiario…" />;
  if (error || !item)
    return (
      <Card className="p-6">
        <EmptyState title="No se pudo cargar el beneficiario" description={error ?? 'No encontrado'} />
        <div className="text-center">
          <Link to="/beneficiarios" className="text-sm font-medium text-teal-700 hover:text-teal-800">← Volver al listado</Link>
        </div>
      </Card>
    );

  const caso = item.casos?.[0];
  const activas = caso?.asignaciones?.filter((a) => a.estado === 'ACTIVA') ?? [];
  const todasActividades = caso?.asignaciones?.flatMap((a) =>
    (a.actividades ?? []).map((act) => ({ ...act, asignacionCaso: { profesional: a.profesional, area: a.area } })),
  ) ?? [];
  todasActividades.sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime());

  const estadoBen = estadoMeta(item.estado);
  const estadoCaso = estadoMeta(caso?.estado ?? '');

  return (
    <div>
      {errorEliminar && (
        <Card className="mb-4 p-3 text-sm text-red-600">{errorEliminar}</Card>
      )}
      <PageHeader
        title={`${item.nombres} ${item.apellidos}`}
        subtitle={`${item.numeroHistoria} · ${nombreTipoDocumento(item.tipoDocumento)} ${item.numeroDocumento} · ${edadExacta(item.fechaNacimiento).texto}`}
        actions={
          <>
            <Link to="/beneficiarios">
              <Button variant="secondary" size="sm">← Listado</Button>
            </Link>
            {['GESTOR', 'COORDINADOR', 'PROFESIONAL'].includes(rol) && caso && caso.estado === 'ACTIVO' && (
              <Button size="sm" variant="secondary" onClick={abrirNuevaActividad}>
                Nueva actividad
              </Button>
            )}
            {['GESTOR', 'COORDINADOR', 'PROFESIONAL'].includes(rol) && caso && caso.estado === 'ACTIVO' && (
              <Button size="sm" variant="secondary" onClick={() => { setAtencionAbierta(true); setNuevaAt((f) => ({ ...f, fechaProgramada: new Date().toISOString().slice(0, 10) })); }}>
                Nueva atención
              </Button>
            )}
            {['GESTOR', 'COORDINADOR', 'SECRETARIA'].includes(rol) && (
              <Button size="sm" variant="secondary" onClick={() => setEditandoAbierto(true)}>
                Editar datos
              </Button>
            )}
            {can.asignarProfesional(rol) && caso && caso.estado === 'ACTIVO' && (
              <Button size="sm" onClick={abrirAsignar}>
                <IconUserPlus size={15} /> Asignar profesional
              </Button>
            )}
            {can.cerrarCaso(rol) && caso && caso.estado === 'ACTIVO' && (
              <Button size="sm" variant="danger" onClick={() => { setCerrarAbierto(true); setMotivo(''); setAviso(null); }}>
                Cerrar caso
              </Button>
            )}
            {item.estado === 'EGRESADO' && ['GESTOR', 'COORDINADOR', 'SECRETARIA'].includes(rol) && (
              <Button size="sm" variant="secondary" onClick={reactivar} loading={accionando}>
                Reactivar
              </Button>
            )}
            {item.estado !== 'EGRESADO' && ['GESTOR', 'COORDINADOR', 'SECRETARIA'].includes(rol) && (
              <Button size="sm" variant="secondary" onClick={() => { setEgresoAbierto(true); setFechaEgreso(new Date().toISOString().slice(0, 10)); setMotivoEgreso(''); }}>
                Marcar egreso
              </Button>
            )}
            {['ADMIN', 'GESTOR'].includes(rol) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={eliminarBeneficiario}
                loading={eliminando}
              >
                Eliminar
              </Button>
            )}
          </>
        }
      />

      {aviso && (
        <Card className={`mb-4 p-3 text-sm ${aviso.startsWith('Error') || aviso.includes('Prohibido') ? 'text-red-600' : 'text-emerald-700'}`}>{aviso}</Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Columna datos */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
                {iniciales(`${item.nombres} ${item.apellidos}`)}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">{item.nombres} {item.apellidos}</p>
                <div className="mt-1 flex gap-2">
                  <Badge tone={estadoBen.tone}>{estadoBen.label}</Badge>
                  <Badge tone={estadoCaso.tone}>Caso {estadoCaso.label}</Badge>
                </div>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Nacimiento</dt><dd className="text-slate-800">{fmtFecha(item.fechaNacimiento)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Género</dt><dd className="text-slate-800">{item.genero ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Teléfono</dt><dd className="text-slate-800">{item.telefono ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Correo</dt><dd className="truncate text-slate-800">{item.correo ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Dirección</dt><dd className="text-slate-800">{item.direccion ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Ingreso</dt><dd className="text-slate-800">{fmtFecha(item.fechaIngreso)}</dd></div>
              {item.observaciones && <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{item.observaciones}</div>}
            </dl>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Asignación actual</h3>
            {activas.length === 0 ? (
              <p className="text-sm text-slate-500">Sin asignación activa.</p>
            ) : (
              <ul className="space-y-2">
                {activas.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{a.profesional.nombres} {a.profesional.apellidos}</p>
                      <p className="text-xs text-slate-500">{nombreArea(a.area.codigo)} · desde {fmtFecha(a.fechaInicio)}</p>
                    </div>
                    <Badge tone="green">Activa</Badge>
                  </li>
                ))}
              </ul>
            )}
            {caso && (caso.asignaciones ?? []).filter((a) => a.estado === 'FINALIZADA').length > 0 && (
              <>
                <h4 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Historial</h4>
                <ul className="space-y-1">
                  {(caso.asignaciones ?? []).filter((a) => a.estado === 'FINALIZADA').map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-xs text-slate-500">
                      <span>{a.profesional.nombres} {a.profesional.apellidos} · {nombreArea(a.area.codigo)}</span>
                      <span>{fmtFecha(a.fechaFin)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {(item.alertas?.length > 0 || item.condiciones?.length > 0 || item.controlesSalud?.length > 0 || item.controlesNutricionales?.length > 0 || item.redesApoyo?.length > 0) && (
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Otros registros</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {item.alertas?.map((x: any) => <li key={`al-${x.id}`}>• Alerta: {x.titulo ?? x.tipo ?? '—'} <Badge tone={estadoMeta(x.estado).tone}>{estadoMeta(x.estado).label}</Badge></li>)}
                {item.condiciones?.map((x: any) => <li key={`co-${x.id}`}>• Condición: {x.descripcion ?? x.tipo ?? '—'}</li>)}
                {item.controlesSalud?.map((x: any) => <li key={`cs-${x.id}`}>• Control de salud: {x.tipoControl?.nombre ?? x.tipo ?? '—'}</li>)}
                {item.controlesNutricionales?.map((x: any) => <li key={`cn-${x.id}`}>• Control nutricional: {x.peso ? `Peso ${x.peso} kg` : 'registrado'}</li>)}
                {item.redesApoyo?.map((x: any) => <li key={`re-${x.id}`}>• Red de apoyo: {x.nombre ?? x.tipo ?? '—'}</li>)}
              </ul>
            </Card>
          )}
        </div>

        {/* Actividades */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Actividades del caso {caso?.numeroCaso ?? ''}</h2>
              <Badge tone="slate">{todasActividades.length} total</Badge>
            </div>
            {todasActividades.length === 0 ? (
              <EmptyState title="Sin actividades" description="El motor de planificación no generó actividades para este caso." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {todasActividades.map((a) => {
                  const meta = estadoActividadMeta(a.estadoCalculado ?? a.estado);
                  const esMia = a.asignacionCaso?.profesional?.id === profesionalId;
                  return (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-800">{a.tipoActividad.nombre}</p>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {esMia && <Badge tone="teal">Tuya</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Programada: {fmtFecha(a.fechaProgramada)} · {nombreArea(a.asignacionCaso?.area.codigo)} ·{' '}
                          {a.asignacionCaso?.profesional.nombres} {a.asignacionCaso?.profesional.apellidos}
                          {a.fechaRealizacion && ` · Realizada: ${fmtFechaHora(a.fechaRealizacion)}`}
                        </p>
                      </div>
                      {puedeMarcar(a) && a.estadoCalculado !== 'REALIZADA' && a.estado !== 'CANCELADA' && a.estado !== 'NO_APLICA' && (
                        <Button size="sm" variant="secondary" onClick={() => marcarRealizada(a.id)}>
                          <IconCheckCircle size={14} /> Marcar realizada
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <SeccionDocumentos beneficiarioId={item.id} />
          <SeccionControles beneficiarioId={item.id} />
          <SeccionNutricion beneficiarioId={item.id} />
          <SeccionRedes beneficiarioId={item.id} />
          <SeccionEscolaridad beneficiarioId={item.id} />
          <SeccionFamilia beneficiarioId={item.id} />
          <SeccionInfoIngreso beneficiarioId={item.id} />
          <SeccionAtenciones beneficiarioId={item.id} />
          <SeccionCondiciones beneficiarioId={item.id} />
        </div>
      </div>

      {/* Modal asignar profesional */}
      {asignarAbierto && (
        <Modal title="Asignar profesional al caso" onClose={() => setAsignarAbierto(false)}>
          <div className="space-y-4">
            <Field label="Profesional" required>
              <Select value={profSeleccionado} onChange={(e) => setProfSeleccionado(e.target.value)}>
                <option value="">Selecciona…</option>
                {profesionales.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>
                ))}
              </Select>
            </Field>
            <Field label="Motivo del cambio (opcional)">
              <TextArea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: reasignación de carga" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAsignarAbierto(false)}>Cancelar</Button>
              <Button loading={accionando} disabled={!profSeleccionado} onClick={guardarAsignacion}>Asignar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal cerrar caso */}
      {cerrarAbierto && (
        <Modal title="Cerrar caso y egresar beneficiario" onClose={() => setCerrarAbierto(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              El caso pasará a <strong>CERRADO</strong>, las asignaciones activas se finalizarán y el beneficiario quedará como{' '}
              <strong>EGRESADO</strong>. Esta acción no se puede deshacer.
            </p>
            <Field label="Motivo de egreso">
              <TextArea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: egreso por cumplimiento del plan" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCerrarAbierto(false)}>Cancelar</Button>
              <Button variant="danger" loading={accionando} onClick={cerrarCaso}>Confirmar cierre</Button>
            </div>
          </div>
        </Modal>
      )}

      {editandoAbierto && item && (
        <ModalEditarBeneficiario
          beneficiario={item}
          onClose={() => setEditandoAbierto(false)}
          onActualizado={() => {
            setEditandoAbierto(false);
            setAviso('Datos del beneficiario actualizados.');
            cargar();
          }}
        />
      )}

      {atencionAbierta && (
        <Modal title={'Nueva atención · ' + item.nombres + ' ' + item.apellidos} onClose={() => setAtencionAbierta(false)} wide>
          <form onSubmit={(e) => { e.preventDefault(); guardarAtencionManual(); }} className="space-y-4">
            {errorEliminar && <Card className="p-3 text-sm text-red-600">{errorEliminar}</Card>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Área" required>
                <Select value={nuevaAt.areaCodigo} onChange={(e) => setNuevaAt((f) => ({ ...f, areaCodigo: e.target.value }))}>
                  <option value="PS">Psicología</option>
                  <option value="TS">Trabajo Social</option>
                  <option value="PD">Pedagogía</option>
                  <option value="NT">Nutrición</option>
                  <option value="FD">Formación</option>
                  <option value="GC">Gestión de casos</option>
                </Select>
              </Field>
              <Field label="Tipo" required>
                <Select value={nuevaAt.tipo} onChange={(e) => setNuevaAt((f) => ({ ...f, tipo: e.target.value }))}>
                  <option value="ATENCION">Atención</option>
                  <option value="SEGUIMIENTO">Seguimiento</option>
                </Select>
              </Field>
              <Field label="Fecha programada" required>
                <TextInput type="date" value={nuevaAt.fechaProgramada} onChange={(e) => setNuevaAt((f) => ({ ...f, fechaProgramada: e.target.value }))} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Observaciones">
                  <TextInput value={nuevaAt.observaciones} onChange={(e) => setNuevaAt((f) => ({ ...f, observaciones: e.target.value }))} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAtencionAbierta(false)}>Cancelar</Button>
              <Button type="submit" loading={accionando}>Registrar atención</Button>
            </div>
          </form>
        </Modal>
      )}

      {actividadAbierta && (
        <Modal title={'Nueva actividad · ' + item.nombres + ' ' + item.apellidos} onClose={() => setActividadAbierta(false)} wide>
          <form onSubmit={(e) => { e.preventDefault(); guardarActividad(); }} className="space-y-4">
            {errorEliminar && <Card className="p-3 text-sm text-red-600">{errorEliminar}</Card>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tipo de actividad" required hint="La actividad se crea en la asignación activa del área del tipo">
                <Select value={nuevaAct.tipoActividadId} onChange={(e) => setNuevaAct((f) => ({ ...f, tipoActividadId: e.target.value }))}>
                  <option value="">Selecciona…</option>
                  {tiposAct.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.nombre}{t.areaNombre ? ' · ' + t.areaNombre : ''}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha programada" required>
                <TextInput type="date" value={nuevaAct.fechaProgramada} onChange={(e) => setNuevaAct((f) => ({ ...f, fechaProgramada: e.target.value }))} />
              </Field>
              <Field label="Prioridad">
                <Select value={nuevaAct.prioridad} onChange={(e) => setNuevaAct((f) => ({ ...f, prioridad: e.target.value }))}>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Observaciones">
                  <TextInput value={nuevaAct.observaciones} onChange={(e) => setNuevaAct((f) => ({ ...f, observaciones: e.target.value }))} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setActividadAbierta(false)}>Cancelar</Button>
              <Button type="submit" loading={accionando}>Crear actividad</Button>
            </div>
          </form>
        </Modal>
      )}

      {egresoAbierto && (
        <Modal title={'Marcar egreso · ' + item.nombres + ' ' + item.apellidos} onClose={() => setEgresoAbierto(false)}>
          <div className="space-y-4">
            {errorEliminar && <Card className="p-3 text-sm text-red-600">{errorEliminar}</Card>}
            <p className="text-sm text-slate-600">
              El beneficiario pasará a EGRESADO: dejará de aparecer en los módulos operativos y se consultará
              solo en la sección Egresados. Si luego vuelve al programa, puedes reactivarlo desde esta ficha.
            </p>
            <Field label="Fecha de egreso" required>
              <TextInput type="date" value={fechaEgreso} onChange={(e) => setFechaEgreso(e.target.value)} />
            </Field>
            <Field label="Motivo del egreso">
              <TextInput value={motivoEgreso} onChange={(e) => setMotivoEgreso(e.target.value)} placeholder="Ej: cambio de domicilio, retiro voluntario…" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEgresoAbierto(false)}>Cancelar</Button>
              <Button onClick={marcarEgreso} loading={accionando}>Marcar egreso</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}