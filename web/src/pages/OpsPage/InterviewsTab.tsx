import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';

// ── Lazy Excalidraw (large bundle, only loaded in the form) ─────────────────
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw }))
);

// ── Types ────────────────────────────────────────────────────────────────────

type OpportunityTag = 'opportunity' | 'insight';
type NodeType = 'outcome' | 'opportunity' | 'sub_opportunity' | 'solution';

interface InterviewOpportunity {
  id: string;
  body: string;
  tag: OpportunityTag;
}

interface InterviewSnapshot {
  id: string;
  participantName: string;
  memorableQuote: string;
  photoData: string | null;
  signupDate: string | null;
  planTier: string;
  usagePattern: string;
  source: string;
  experienceMapData: string | null;
  interviewDate: string;
  sessionLengthMinutes: number | null;
  createdAt: string;
  opportunities: InterviewOpportunity[];
}

interface OstNode {
  id: string;
  parentId: string | null;
  body: string;
  type: NodeType;
  depth: number;
  sortOrder: number;
}

interface OstVersion {
  id: string;
  generatedAt: string;
  snapshotCount: number;
  nodes: OstNode[];
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiList(): Promise<InterviewSnapshot[]> {
  const res = await fetch('/api/ops/discovery/snapshots', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<InterviewSnapshot[]>;
}

async function apiCreate(
  body: Omit<InterviewSnapshot, 'id' | 'createdAt'>
): Promise<InterviewSnapshot> {
  const res = await fetch('/api/ops/discovery/snapshots', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? `${res.status}`);
  }
  return res.json() as Promise<InterviewSnapshot>;
}

async function apiDelete(id: string): Promise<void> {
  const res = await fetch(
    `/api/ops/discovery/snapshots/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  if (!res.ok) throw new Error(`${res.status}`);
}

async function apiGetOst(): Promise<OstVersion | null> {
  const res = await fetch('/api/ops/discovery/ost', { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<OstVersion | null>;
}

async function apiGenerateOst(): Promise<OstVersion> {
  const res = await fetch('/api/ops/discovery/ost/generate', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? `${res.status}`);
  }
  return res.json() as Promise<OstVersion>;
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blankForm(): Omit<InterviewSnapshot, 'id' | 'createdAt'> {
  return {
    participantName: '',
    memorableQuote: '',
    photoData: null,
    signupDate: '',
    planTier: '',
    usagePattern: '',
    source: '',
    opportunities: [],
    experienceMapData: null,
    interviewDate: new Date().toISOString().slice(0, 10),
    sessionLengthMinutes: null,
  };
}

// ── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  dataUri,
  name,
  size = 40,
}: {
  dataUri: string | null;
  name: string;
  size?: number;
}) {
  if (dataUri) {
    return (
      <img
        src={dataUri}
        alt={name}
        className={styles.interviewAvatar}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={styles.interviewAvatarInitials}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      aria-label={name}
    >
      {initials(name) || '?'}
    </span>
  );
}

// ── Snapshot card ────────────────────────────────────────────────────────────

function SnapshotCard({
  snapshot,
  onDelete,
}: {
  snapshot: InterviewSnapshot;
  onDelete: (id: string) => void;
}) {
  const oppCount = snapshot.opportunities.filter(
    (o) => o.tag === 'opportunity'
  ).length;
  const insightCount = snapshot.opportunities.filter(
    (o) => o.tag === 'insight'
  ).length;

  const handleDelete = () => {
    if (window.confirm(`Delete snapshot for ${snapshot.participantName}?`)) {
      onDelete(snapshot.id);
    }
  };

  return (
    <article className={`${sharedStyles.surface} ${styles.interviewCard}`}>
      <div className={styles.interviewCardHeader}>
        <Avatar dataUri={snapshot.photoData} name={snapshot.participantName} />
        <div className={styles.interviewCardMeta}>
          <span className={styles.interviewCardName}>
            {snapshot.participantName || 'Unknown'}
          </span>
          {snapshot.planTier && (
            <span className={styles.interviewCardTier}>
              {snapshot.planTier}
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.interviewDeleteBtn}
          onClick={handleDelete}
          aria-label={`Delete snapshot for ${snapshot.participantName}`}
        >
          ×
        </button>
      </div>
      {snapshot.memorableQuote && (
        <blockquote className={styles.interviewCardQuote}>
          &ldquo;{snapshot.memorableQuote}&rdquo;
        </blockquote>
      )}
      <div className={styles.interviewCardFooter}>
        <span className={styles.interviewCardDate}>
          {snapshot.interviewDate}
        </span>
        {snapshot.opportunities.length > 0 && (
          <span className={styles.interviewCardOpCount}>
            {oppCount > 0 && `${oppCount} opp${oppCount === 1 ? '' : 's'}`}
            {oppCount > 0 && insightCount > 0 && ' · '}
            {insightCount > 0 &&
              `${insightCount} insight${insightCount === 1 ? '' : 's'}`}
          </span>
        )}
      </div>
    </article>
  );
}

// ── Snapshot form ────────────────────────────────────────────────────────────

function SnapshotForm({
  onSave,
  onCancel,
}: {
  onSave: (s: InterviewSnapshot) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(blankForm());
  const [oppInput, setOppInput] = useState('');
  const [oppTag, setOppTag] = useState<OpportunityTag>('opportunity');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [getExcalidrawPng, setGetExcalidrawPng] = useState<
    (() => Promise<string | null>) | null
  >(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addOpportunity = () => {
    if (oppInput.trim().length === 0) return;
    set('opportunities', [
      ...form.opportunities,
      { id: crypto.randomUUID(), body: oppInput.trim(), tag: oppTag },
    ]);
    setOppInput('');
  };

  const removeOpportunity = (id: string) =>
    set(
      'opportunities',
      form.opportunities.filter((o) => o.id !== id)
    );

  const handleSave = async () => {
    if (form.participantName.trim().length === 0) return;
    setSaving(true);
    setError('');
    try {
      const mapData = getExcalidrawPng
        ? ((await getExcalidrawPng()) ?? form.experienceMapData)
        : form.experienceMapData;

      const snapshot = await apiCreate({ ...form, experienceMapData: mapData });
      onSave(snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className={styles.interviewForm}>
      {error && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {error}
        </div>
      )}

      {/* Participant + photo */}
      <div className={styles.interviewFormSection}>
        <div className={styles.interviewFormRow}>
          <div className={styles.interviewPhotoZone}>
            {form.photoData ? (
              <img
                src={form.photoData}
                alt="Participant"
                className={styles.interviewPhotoPreview}
                onClick={() => photoInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              />
            ) : (
              <button
                type="button"
                className={styles.interviewPhotoPlaceholder}
                onClick={() => photoInputRef.current?.click()}
              >
                Photo
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  readFileAsDataUri(f).then((uri) => set('photoData', uri));
              }}
            />
          </div>
          <div className={styles.interviewFormParticipant}>
            <input
              className={styles.textInput}
              type="text"
              placeholder="Participant name *"
              value={form.participantName}
              onChange={(e) => set('participantName', e.target.value)}
            />
            <select
              className={styles.textInput}
              value={form.planTier}
              onChange={(e) => set('planTier', e.target.value)}
            >
              <option value="">Plan tier…</option>
              <option value="free">Free</option>
              <option value="patreon">Patreon (lifetime)</option>
              <option value="churned-free">Churned free</option>
              <option value="churned-paid">Churned paid</option>
            </select>
            <input
              className={styles.textInput}
              type="date"
              value={form.signupDate ?? ''}
              onChange={(e) => set('signupDate', e.target.value)}
              title="Account sign-up date"
            />
          </div>
        </div>
      </div>

      {/* Quote */}
      <div className={styles.interviewFormSection}>
        <label className={styles.controlsLabel} htmlFor="iv-quote">
          Memorable quote — their exact words
        </label>
        <textarea
          id="iv-quote"
          className={`${styles.textInput} ${styles.interviewQuoteInput}`}
          placeholder="The most vivid or emotional thing they said…"
          value={form.memorableQuote}
          onChange={(e) => set('memorableQuote', e.target.value)}
          rows={3}
        />
      </div>

      {/* Quick facts */}
      <div className={styles.interviewFormSection}>
        <p className={styles.controlsLabel}>Quick facts</p>
        <div className={styles.interviewQuickFacts}>
          <input
            className={styles.textInput}
            type="text"
            placeholder="Usage pattern"
            value={form.usagePattern}
            onChange={(e) => set('usagePattern', e.target.value)}
          />
          <input
            className={styles.textInput}
            type="text"
            placeholder="How they found 2anki"
            value={form.source}
            onChange={(e) => set('source', e.target.value)}
          />
          <input
            className={styles.textInput}
            type="date"
            value={form.interviewDate}
            onChange={(e) => set('interviewDate', e.target.value)}
            title="Interview date"
          />
          <input
            className={styles.textInput}
            type="number"
            placeholder="Session length (min)"
            value={form.sessionLengthMinutes ?? ''}
            onChange={(e) =>
              set(
                'sessionLengthMinutes',
                e.target.value === '' ? null : Number(e.target.value)
              )
            }
            min={0}
          />
        </div>
      </div>

      {/* Opportunities */}
      <div className={styles.interviewFormSection}>
        <label className={styles.controlsLabel} htmlFor="iv-opp-input">
          Opportunities & insights — their words, not solutions, not feelings
        </label>
        <div className={styles.interviewOppRow}>
          <input
            id="iv-opp-input"
            className={styles.textInput}
            type="text"
            placeholder="e.g. I don't want to re-type my notes every time"
            value={oppInput}
            onChange={(e) => setOppInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOpportunity();
              }
            }}
          />
          <select
            className={styles.textInput}
            value={oppTag}
            onChange={(e) => setOppTag(e.target.value as OpportunityTag)}
            style={{ width: 'auto', flexShrink: 0 }}
          >
            <option value="opportunity">Opportunity</option>
            <option value="insight">Insight</option>
          </select>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={addOpportunity}
            disabled={oppInput.trim().length === 0}
          >
            Add
          </button>
        </div>
        {form.opportunities.length > 0 && (
          <ul className={styles.interviewOppList}>
            {form.opportunities.map((opp) => (
              <li key={opp.id} className={styles.interviewOppItem}>
                <span className={styles.interviewOppTag} data-tag={opp.tag}>
                  {opp.tag}
                </span>
                <span className={styles.interviewOppBody}>{opp.body}</span>
                <button
                  type="button"
                  className={styles.interviewDeleteBtn}
                  onClick={() => removeOpportunity(opp.id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Experience map — Excalidraw canvas */}
      <div className={styles.interviewFormSection}>
        <label className={styles.controlsLabel}>
          Experience map — draw the participant&rsquo;s journey
        </label>
        <div className={styles.excalidrawWrap}>
          <Suspense
            fallback={
              <div className={styles.excalidrawLoading}>Loading canvas…</div>
            }
          >
            <Excalidraw
              excalidrawAPI={(api) => {
                setGetExcalidrawPng(() => async () => {
                  const elements = api.getSceneElements();
                  if (elements.length === 0) return null;
                  const { exportToBlob } =
                    await import('@excalidraw/excalidraw');
                  const blob = await exportToBlob({
                    elements,
                    mimeType: 'image/png',
                    appState: api.getAppState(),
                    files: api.getFiles(),
                  });
                  return blobToDataUri(blob);
                });
              }}
              initialData={{ appState: { viewBackgroundColor: 'transparent' } }}
            />
          </Suspense>
        </div>
        <p className={styles.panelSubtitle}>
          The map is exported as a PNG and saved with the snapshot.
        </p>
      </div>

      <div className={styles.interviewFormActions}>
        <button
          type="button"
          className={sharedStyles.btnPrimary}
          onClick={handleSave}
          disabled={saving || form.participantName.trim().length === 0}
        >
          {saving ? 'Saving…' : 'Save snapshot'}
        </button>
        <button
          type="button"
          className={sharedStyles.btnSmall}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function generateButtonLabel(ost: OstVersion | null | undefined): string {
  return ost ? 'Regenerate' : 'Generate tree';
}

// ── OST node (sortable) ──────────────────────────────────────────────────────

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  outcome: 'Outcome',
  opportunity: 'Opportunity',
  sub_opportunity: 'Sub-opportunity',
  solution: 'Solution',
};

function SortableOstNode({ node }: { node: OstNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: node.depth * 24,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${sharedStyles.surface} ${styles.ostNode}`}
    >
      <span
        className={styles.ostDragHandle}
        {...attributes}
        {...listeners}
        aria-label="Drag"
      >
        ⠿
      </span>
      <span className={styles.ostNodeBody}>{node.body}</span>
      {node.type !== 'outcome' && (
        <span className={styles.ostNodeBadge} data-type={node.type}>
          {NODE_TYPE_LABELS[node.type]}
        </span>
      )}
    </div>
  );
}

// ── OST tree section ─────────────────────────────────────────────────────────

function OstSection({ snapshotCount }: { snapshotCount: number }) {
  const [ost, setOst] = useState<OstVersion | null | undefined>(undefined);
  const [nodes, setNodes] = useState<OstNode[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const MIN_SNAPSHOTS = 5;

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    apiGetOst()
      .then((v) => {
        setOst(v);
        if (v) setNodes(v.nodes);
      })
      .catch(() => setOst(null));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const v = await apiGenerateOst();
      setOst(v);
      setNodes(v.nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setNodes((prev) => {
        const oldIdx = prev.findIndex((n) => n.id === active.id);
        const newIdx = prev.findIndex((n) => n.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }, []);

  const canGenerate = snapshotCount >= MIN_SNAPSHOTS;

  return (
    <section className={styles.ostSection}>
      <div className={styles.interviewArchiveHeader}>
        <div>
          <p className={styles.panelTitle}>Opportunity solution tree</p>
          <p className={styles.panelSubtitle}>
            {ost
              ? `Generated from ${ost.snapshotCount} snapshot${ost.snapshotCount === 1 ? '' : 's'} · ${new Date(ost.generatedAt).toLocaleDateString()}`
              : 'Claude organizes your interview snapshots into a prioritized tree.'}
          </p>
        </div>
        <button
          type="button"
          className={sharedStyles.btnSmall}
          onClick={handleGenerate}
          disabled={generating || !canGenerate}
          title={
            canGenerate
              ? undefined
              : `Need ${MIN_SNAPSHOTS} snapshots (have ${snapshotCount})`
          }
        >
          {generating ? 'Generating…' : generateButtonLabel(ost)}
        </button>
      </div>

      {error && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {error}
        </div>
      )}

      {!canGenerate && (
        <div className={`${sharedStyles.surface} ${styles.interviewEmpty}`}>
          <p>
            Add at least {MIN_SNAPSHOTS} interview snapshots to generate the
            tree. Currently have {snapshotCount}.
          </p>
        </div>
      )}

      {canGenerate && ost === undefined && (
        <div className={styles.skeletonBar} style={{ height: 80 }} />
      )}

      {canGenerate && ost === null && !generating && (
        <div className={`${sharedStyles.surface} ${styles.interviewEmpty}`}>
          <p>
            No tree generated yet. Click &ldquo;Generate tree&rdquo; to build it
            from your snapshots.
          </p>
        </div>
      )}

      {nodes.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={nodes.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.ostTree}>
              {nodes.map((node) => (
                <SortableOstNode key={node.id} node={node} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

// ── Root tab component ───────────────────────────────────────────────────────

export default function InterviewsTab() {
  const [snapshots, setSnapshots] = useState<InterviewSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'archive' | 'form'>('archive');

  useEffect(() => {
    apiList()
      .then(setSnapshots)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Load failed')
      )
      .finally(() => setLoading(false));
  }, []);

  const handleSave = (snapshot: InterviewSnapshot) => {
    setSnapshots((prev) => [snapshot, ...prev]);
    setView('archive');
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(id);
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (view === 'form') {
    return (
      <>
        <div className={styles.tabHeader}>
          <p className={styles.panelTitle}>New interview snapshot</p>
        </div>
        <SnapshotForm onSave={handleSave} onCancel={() => setView('archive')} />
      </>
    );
  }

  return (
    <>
      <div className={styles.interviewArchiveHeader}>
        <div>
          <p className={styles.panelTitle}>Interview snapshots</p>
          <p className={styles.panelSubtitle}>
            One snapshot per customer conversation. Fill in right after the
            interview, never batched.
          </p>
        </div>
        <button
          type="button"
          className={sharedStyles.btnPrimary}
          onClick={() => setView('form')}
        >
          New snapshot
        </button>
      </div>

      {error && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {error}
        </div>
      )}

      {loading && (
        <div className={styles.skeletonBar} style={{ height: 120 }} />
      )}
      {!loading && snapshots.length === 0 && (
        <div className={`${sharedStyles.surface} ${styles.interviewEmpty}`}>
          <p>
            No snapshots yet. Run your first customer interview and capture it
            here.
          </p>
        </div>
      )}
      {!loading && snapshots.length > 0 && (
        <div className={styles.interviewGrid}>
          {snapshots.map((s) => (
            <SnapshotCard key={s.id} snapshot={s} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <hr className={styles.ostDivider} />
      <OstSection snapshotCount={snapshots.length} />
    </>
  );
}
