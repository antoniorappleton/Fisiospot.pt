import { FormEvent, useState } from 'react';
import { Badge, Empty, Panel, Row, Sheet, Stat, StatusBadge } from '../../components/ui';
import { useNotify } from '../../hooks/useNotify';
import { patientName, serviceName, therapistScope } from '../../services/selectors';
import { useStore } from '../../services/store';
import type { Appointment, ClinicalEpisode } from '../../types/domain';
import { formatDate, formatDateTime, formatTime, isSameDay } from '../../utils/format';

const isOpenAppointment = (item: Appointment) => item.status === 'scheduled' || item.status === 'confirmed';

export function TherapistAgenda() {
  const { db, user } = useStore();
  const scope = therapistScope(db, user!);
  const [recording, setRecording] = useState<Appointment | null>(null);
  const today = scope.appointments.filter((item) => isSameDay(item.dateStart, new Date()));
  const upcoming = scope.appointments.filter((item) => new Date(item.dateStart) > new Date() && !isSameDay(item.dateStart, new Date()) && isOpenAppointment(item));
  const toRecord = today.filter(isOpenAppointment).length;
  const openEpisodes = scope.episodes.filter((item) => item.status === 'open').length;

  return (
    <>
      <div className="stats">
        <Stat label="Consultas hoje" value={today.length} />
        <Stat label="Por registar" value={toRecord} hint="sessões de hoje" />
        <Stat label="Episódios abertos" value={openEpisodes} />
      </div>

      <Panel title={`Hoje · ${formatDate(new Date().toISOString())}`}>
        {today.length === 0 && <Empty>Sem consultas hoje.</Empty>}
        {today.map((item) => (
          <Row key={item.id} title={`${formatTime(item.dateStart)} · ${patientName(db, item.patientId)}`} detail={serviceName(db, item.serviceId)} meta={<StatusBadge status={item.status} late={item.lateCancellation} />}>
            {isOpenAppointment(item) && <button className="button button-primary" type="button" onClick={() => setRecording(item)}>Registar sessão</button>}
          </Row>
        ))}
      </Panel>

      <Panel title="Próximos dias">
        {upcoming.length === 0 && <Empty>Sem consultas agendadas.</Empty>}
        {upcoming.map((item) => (
          <Row key={item.id} title={patientName(db, item.patientId)} detail={`${serviceName(db, item.serviceId)} · ${formatDateTime(item.dateStart)}`} meta={<StatusBadge status={item.status} />} />
        ))}
      </Panel>

      {recording && <SessionSheet patientId={recording.patientId} appointment={recording} onClose={() => setRecording(null)} />}
    </>
  );
}

export function TherapistPatients({ openEpisode }: { openEpisode: (id: string) => void }) {
  const { db, user } = useStore();
  const scope = therapistScope(db, user!);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  return (
    <>
      <Panel title="Pacientes associados" action={<Badge>{scope.patients.length}</Badge>}>
        <p className="muted small">Só vê os pacientes que lhe estão atribuídos.</p>
        {scope.patients.map((patient) => {
          const episodes = scope.episodes.filter((item) => item.patientId === patient.id);
          const open = episodes.filter((item) => item.status === 'open');
          return (
            <div className="patient-card" key={patient.id}>
              <Row title={patient.name} detail={`${patient.patientCode} · ${patient.phone || 'sem telefone'}`} meta={!patient.validated && <Badge tone="warn">Validação pendente</Badge>}>
                <button className="button button-ghost" type="button" onClick={() => setCreatingFor(patient.id)}>Novo episódio</button>
              </Row>
              {open.map((episode) => (
                <button className="episode-chip" type="button" key={episode.id} onClick={() => openEpisode(episode.id)}>
                  <span>{episode.title}</span>
                  <small>desde {formatDate(episode.openedAt)}</small>
                </button>
              ))}
            </div>
          );
        })}
      </Panel>
      {creatingFor && <NewEpisodeSheet patientId={creatingFor} onClose={() => setCreatingFor(null)} onCreated={openEpisode} />}
    </>
  );
}

export function TherapistEpisodes({ selected, select }: { selected: string | null; select: (id: string | null) => void }) {
  const { db, user, actions } = useStore();
  const scope = therapistScope(db, user!);
  const episode = scope.episodes.find((item) => item.id === selected);

  if (episode) return <EpisodeDetail episode={episode} onBack={() => select(null)} />;

  const open = (id: string) => {
    actions.viewEpisode(id);
    select(id);
  };

  return (
    <Panel title="Episódios clínicos">
      {scope.episodes.length === 0 && <Empty>Sem episódios clínicos.</Empty>}
      {[...scope.episodes].sort((a, b) => Number(a.status === 'closed') - Number(b.status === 'closed')).map((item) => {
        const sessions = db.sessions.filter((session) => session.episodeId === item.id).length;
        return (
          <button className="row row-button" type="button" key={item.id} onClick={() => open(item.id)}>
            <div className="row-main">
              <strong>{item.title}</strong>
              <span>{patientName(db, item.patientId)} · {sessions} {sessions === 1 ? 'sessão' : 'sessões'}</span>
            </div>
            <div className="row-meta"><Badge tone={item.status === 'open' ? 'mint' : 'neutral'}>{item.status === 'open' ? 'Aberto' : 'Encerrado'}</Badge></div>
          </button>
        );
      })}
    </Panel>
  );
}

function EpisodeDetail({ episode, onBack }: { episode: ClinicalEpisode; onBack: () => void }) {
  const { db, actions } = useStore();
  const notify = useNotify();
  const assessment = db.assessments.find((item) => item.episodeId === episode.id);
  const sessions = db.sessions.filter((item) => item.episodeId === episode.id).sort((a, b) => b.sessionNumber - a.sessionNumber);
  const [editing, setEditing] = useState(!assessment);
  const [recording, setRecording] = useState(false);
  const [fields, setFields] = useState({
    subjective: assessment?.subjective ?? '',
    objective: assessment?.objective ?? '',
    diagnosis: assessment?.diagnosis ?? '',
    goals: assessment?.goals ?? '',
    treatmentPlan: assessment?.treatmentPlan ?? '',
  });
  const isOpen = episode.status === 'open';

  function saveAssessment(event: FormEvent) {
    event.preventDefault();
    actions.saveAssessment(episode.id, fields);
    setEditing(false);
    notify('Avaliação guardada.');
  }

  const assessmentFields: Array<[keyof typeof fields, string]> = [
    ['subjective', 'Subjetivo'],
    ['objective', 'Objetivo'],
    ['diagnosis', 'Diagnóstico'],
    ['goals', 'Objetivos'],
    ['treatmentPlan', 'Plano de tratamento'],
  ];

  return (
    <>
      <button className="link-button back" type="button" onClick={onBack}>← Episódios</button>
      <Panel className="panel-hero">
        <span className="eyebrow">{patientName(db, episode.patientId)}</span>
        <h2 className="hero-title">{episode.title}</h2>
        <p className="muted">{episode.clinicalReason}</p>
        <div className="hero-actions">
          <Badge tone={isOpen ? 'mint' : 'neutral'}>{isOpen ? `Aberto desde ${formatDate(episode.openedAt)}` : `Encerrado a ${formatDate(episode.closedAt!)}`}</Badge>
          {isOpen && <button className="button button-ghost" type="button" onClick={() => { actions.closeEpisode(episode.id); notify('Episódio encerrado.'); }}>Encerrar episódio</button>}
        </div>
      </Panel>

      <Panel title="Avaliação inicial" action={assessment && !editing && isOpen && <button className="button button-ghost" type="button" onClick={() => setEditing(true)}>Editar</button>}>
        {editing && isOpen ? (
          <form className="form" onSubmit={saveAssessment}>
            {assessmentFields.map(([key, label]) => (
              <label key={key}>{label}<textarea required rows={2} value={fields[key]} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} /></label>
            ))}
            <button className="button button-primary" type="submit">Guardar avaliação</button>
          </form>
        ) : assessment ? (
          <dl className="details details-stacked">
            {assessmentFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{assessment[key]}</dd></div>)}
          </dl>
        ) : <Empty>Sem avaliação registada.</Empty>}
      </Panel>

      <Panel title="Sessões e evolução" action={isOpen && assessment && <button className="button button-primary" type="button" onClick={() => setRecording(true)}>Registar sessão</button>}>
        {!assessment && isOpen && <p className="muted small">Registe primeiro a avaliação inicial.</p>}
        {sessions.length === 0 && <Empty>Sem sessões registadas.</Empty>}
        <ol className="timeline">
          {sessions.map((session) => {
            const note = db.sessionNotes.find((item) => item.sessionId === session.id);
            return (
              <li key={session.id}>
                <header>
                  <strong>Sessão {session.sessionNumber}</strong>
                  <span>{formatDateTime(session.performedAt)}</span>
                  {note && <Badge tone={note.painScale >= 6 ? 'danger' : note.painScale >= 4 ? 'warn' : 'mint'}>Dor {note.painScale}/10</Badge>}
                </header>
                {note && (
                  <>
                    <p>{note.notes}</p>
                    <p><em>Evolução:</em> {note.evolution}</p>
                    <p className="muted small">Próxima sessão: {note.nextSession}</p>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>

      {recording && <SessionSheet patientId={episode.patientId} episodeId={episode.id} onClose={() => setRecording(false)} />}
    </>
  );
}

function NewEpisodeSheet({ patientId, onClose, onCreated }: { patientId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const { db, actions } = useStore();
  const notify = useNotify();
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');

  return (
    <Sheet title={`Novo episódio · ${patientName(db, patientId)}`} onClose={onClose}>
      <form className="form" onSubmit={(event) => { event.preventDefault(); const id = actions.openEpisode(patientId, title, reason); notify('Episódio clínico criado.'); onClose(); onCreated(id); }}>
        <label>Problema clínico<input required placeholder="Ex.: Lombalgia, entorse do tornozelo" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Motivo clínico<textarea required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <button className="button button-primary button-block" type="submit">Abrir episódio</button>
      </form>
    </Sheet>
  );
}

/** Registo de sessão + nota de evolução; se vier da agenda, conclui a consulta. */
function SessionSheet({ patientId, appointment, episodeId, onClose }: { patientId: string; appointment?: Appointment; episodeId?: string; onClose: () => void }) {
  const { db, user, actions } = useStore();
  const notify = useNotify();
  const episodes = therapistScope(db, user!).episodes.filter((item) => item.patientId === patientId && item.status === 'open');
  const [selectedEpisode, setSelectedEpisode] = useState(episodeId ?? episodes[0]?.id ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [note, setNote] = useState({ notes: '', painScale: 4, evolution: '', nextSession: '' });

  function submit(event: FormEvent) {
    event.preventDefault();
    const target = selectedEpisode || actions.openEpisode(patientId, newTitle, 'Aberto no registo da sessão.');
    const billing = actions.registerSession(target, appointment?.id, note);
    notify(`Sessão registada. ${billing}`.trim());
    onClose();
  }

  return (
    <Sheet title={`Sessão · ${patientName(db, patientId)}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {!episodeId && (
          episodes.length > 0 ? (
            <label>Episódio clínico
              <select value={selectedEpisode} onChange={(event) => setSelectedEpisode(event.target.value)}>
                {episodes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          ) : (
            <label>Novo episódio clínico<input required placeholder="Sem episódio aberto: indique o problema" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /></label>
          )
        )}
        <label>Notas da sessão<textarea required rows={3} value={note.notes} onChange={(event) => setNote({ ...note, notes: event.target.value })} /></label>
        <label>Escala de dor · {note.painScale}/10
          <input type="range" min={0} max={10} value={note.painScale} onChange={(event) => setNote({ ...note, painScale: Number(event.target.value) })} />
        </label>
        <label>Evolução<textarea required rows={2} value={note.evolution} onChange={(event) => setNote({ ...note, evolution: event.target.value })} /></label>
        <label>Plano para a próxima sessão<input required value={note.nextSession} onChange={(event) => setNote({ ...note, nextSession: event.target.value })} /></label>
        <button className="button button-primary button-block" type="submit">Guardar sessão</button>
      </form>
    </Sheet>
  );
}
