"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus,
  LayoutGrid,
  List as ListIcon,
  CalendarDays,
  Target,
  Flag,
  CheckSquare,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useItemsStore } from "@/stores/itemsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";
import { useGoalsStore } from "@/stores/goalsStore";
import { getSocket } from "@/lib/socket";
import Avatar from "@/components/ui/Avatar";
import CreateActionItemModal from "@/components/items/CreateActionItemModal";

const COLUMNS = [
  { id: "TODO", label: "Todo" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "REVIEW", label: "Review" },
  { id: "DONE", label: "Done" },
];

const PRIORITY_TONE = {
  LOW: "text-ink/45 border-ink/20",
  MEDIUM: "text-ink/65 border-ink/30",
  HIGH: "text-ember border-ember/40",
  URGENT: "text-ember border-ember bg-ember/5",
};

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

function dueLabel(d) {
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - now) / 86400000);
  if (diff < 0) return { text: `Overdue · ${fmtDate(d)}`, tone: "text-ember" };
  if (diff === 0) return { text: "Due today", tone: "text-ember" };
  if (diff <= 7) return { text: `Due in ${diff}d`, tone: "text-ink/75" };
  return { text: `Due ${fmtDate(d)}`, tone: "text-ink/55" };
}

export default function ItemsPage() {
  const { workspaceId } = useParams();
  const me = useAuthStore((s) => s.user);
  const ws = useWorkspaceStore((s) => s.workspaceById[workspaceId]);
  const loadOne = useWorkspaceStore((s) => s.loadOne);
  const loadGoals = useGoalsStore((s) => s.load);

  const items = useItemsStore((s) => s.items);
  const load = useItemsStore((s) => s.load);
  const moveItem = useItemsStore((s) => s.moveItem);
  const deleteItem = useItemsStore((s) => s.deleteItem);
  const pushItem = useItemsStore((s) => s.pushItem);
  const applyItemUpdate = useItemsStore((s) => s.applyItemUpdate);
  const removeItemFromSocket = useItemsStore((s) => s.removeItemFromSocket);

  const [view, setView] = useState("kanban"); // kanban | list
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      loadOne(workspaceId).catch(() => {}),
      loadGoals(workspaceId).catch(() => {}),
      load(workspaceId).catch(() => toast.error("Couldn't load items.")),
    ]).finally(() => mounted && setLoading(false));

    const s = getSocket();
    s.emit("workspace:join", workspaceId);
    const onCreated = (i) => pushItem(i);
    const onUpdated = (i) => applyItemUpdate(i);
    const onDeleted = (p) => removeItemFromSocket(p);
    s.on("item:created", onCreated);
    s.on("item:updated", onUpdated);
    s.on("item:deleted", onDeleted);
    return () => {
      mounted = false;
      s.off("item:created", onCreated);
      s.off("item:updated", onUpdated);
      s.off("item:deleted", onDeleted);
    };
  }, [workspaceId, load, loadOne, loadGoals, pushItem, applyItemUpdate, removeItemFromSocket]);

  const accent = ws?.accentColor || "#D34F1F";

  const grouped = useMemo(() => {
    const out = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
    for (const i of items) (out[i.status] || (out[i.status] = [])).push(i);
    return out;
  }, [items]);

  function onDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination, source } = result;
    if (destination.droppableId === source.droppableId) return;
    moveItem(draggableId, destination.droppableId);
  }

  async function handleDelete(id) {
    try {
      await deleteItem(id);
      toast.success("Item removed");
    } catch {
      toast.error("Couldn't delete item.");
    }
  }

  return (
    <div className="relative max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {/* HEADER */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span aria-hidden="true" className="inline-block h-px w-8" style={{ background: accent }} />
          <span>Workspace · {ws?.name || "—"}</span>
          <span className="hidden sm:inline text-ink/25">/</span>
          <span className="hidden sm:inline">Action items</span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-ink">
              <span className="italic font-normal">Action items</span>
              <span className="text-ember">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/65">
              Concrete tasks the team is moving across the board. Drag a card to advance it, or switch to the list to scan everything at once.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewToggle value={view} onChange={setView} />
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2">New item</span>
            </button>
          </div>
        </div>
      </header>

      {/* META BAR */}
      <div className="mt-8 pb-3 border-b border-ink/15 flex items-end justify-between animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/55">
          <span className="text-ember">§</span>&nbsp;Board · 01
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink/40 tabular-nums">
          {loading ? "loading…" : `${items.length} on file`}
        </p>
      </div>

      {/* CONTENT */}
      <section className="mt-6">
        {loading ? (
          <Skeleton view={view} />
        ) : items.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : view === "kanban" ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {COLUMNS.map((col) => (
                <Droppable key={col.id} droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-paper-50 border border-ink/10 p-3 min-h-[300px] transition-colors ${
                        snapshot.isDraggingOver ? "border-ember/50 bg-ember/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b border-ink/10">
                        <h3 className="font-mono text-[10px] uppercase tracking-widest2 text-ink/65">
                          {col.label}
                        </h3>
                        <span className="font-mono text-[10px] tabular-nums text-ink/40">
                          {grouped[col.id]?.length || 0}
                        </span>
                      </div>
                      {(grouped[col.id] || []).map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                          isDragDisabled={!!item._pending}
                        >
                          {(p, snap) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                              className={`group bg-paper border border-ink/10 p-3 mb-2 shadow-sm hover:border-ink/30 transition-colors ${
                                item._pending ? "opacity-60" : ""
                              } ${snap.isDragging ? "shadow-lg border-ember/40" : ""}`}
                            >
                              <ItemCard
                                item={item}
                                workspaceId={workspaceId}
                                onDelete={handleDelete}
                                me={me}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        ) : (
          <ListView items={items} workspaceId={workspaceId} me={me} onDelete={handleDelete} />
        )}
      </section>

      <CreateActionItemModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────  SUB-COMPONENTS  ───────────────────────────────────────────── */

function ViewToggle({ value, onChange }) {
  const tabs = [
    { id: "kanban", label: "Board", Icon: LayoutGrid },
    { id: "list", label: "List", Icon: ListIcon },
  ];
  return (
    <div className="inline-flex border border-ink/15">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember ${
              active ? "bg-ink text-paper" : "text-ink/65 hover:text-ink hover:bg-paper-50"
            }`}
          >
            <t.Icon size={12} strokeWidth={1.75} aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ItemCard({ item, workspaceId, onDelete, me }) {
  const due = dueLabel(item.dueDate);
  const isMine = item.assigneeId === me?.id;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug text-ink line-clamp-3">{item.title}</p>
        {!item._pending && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label="Delete item"
            className="opacity-0 group-hover:opacity-100 -mt-0.5 -mr-1 p-1 text-ink/35 hover:text-ember focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ember transition-opacity"
          >
            <Trash2 size={12} strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PriorityChip priority={item.priority} />
        {due && (
          <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest2 ${due.tone}`}>
            <CalendarDays size={10} strokeWidth={1.75} />
            {due.text}
          </span>
        )}
      </div>

      {item.goal && (
        <Link
          href={`/w/${workspaceId}/goals/${item.goal.id}`}
          className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest2 text-ink/55 hover:text-ember transition-colors"
        >
          <Target size={10} strokeWidth={1.75} aria-hidden="true" />
          <span className="normal-case tracking-normal text-[11px] font-sans truncate max-w-[14rem]">
            {item.goal.title}
          </span>
        </Link>
      )}

      <div className="flex items-center justify-between pt-1">
        {item.assignee ? (
          <span className="inline-flex items-center gap-1.5">
            <Avatar user={item.assignee} size="xs" />
            <span className="text-[11px] text-ink/65">
              {item.assignee.name}
              {isMine && <span className="text-ember"> · you</span>}
            </span>
          </span>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-widest2 text-ink/35">Unassigned</span>
        )}
      </div>
    </div>
  );
}

function PriorityChip({ priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border font-mono text-[9px] uppercase tracking-widest2 ${PRIORITY_TONE[priority] || PRIORITY_TONE.MEDIUM}`}
    >
      <Flag size={9} strokeWidth={1.75} aria-hidden="true" />
      {priority}
    </span>
  );
}

function ListView({ items, workspaceId, me, onDelete }) {
  return (
    <div className="border border-ink/10 overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse table-fixed">
        <colgroup>
          <col />
          <col className="w-[110px]" />
          <col className="w-[110px]" />
          <col className="w-[130px]" />
          <col className="w-[170px]" />
          <col className="w-[44px]" />
        </colgroup>
        <thead className="bg-paper-50 border-b border-ink/10">
          <tr className="font-mono text-[9px] uppercase tracking-widest2 text-ink/45">
            <th scope="col" className="text-left font-normal px-4 py-2">
              Title
            </th>
            <th scope="col" className="text-left font-normal px-4 py-2">
              Status
            </th>
            <th scope="col" className="text-left font-normal px-4 py-2">
              Priority
            </th>
            <th scope="col" className="text-left font-normal px-4 py-2">
              Due
            </th>
            <th scope="col" className="text-left font-normal px-4 py-2">
              Assignee
            </th>
            <th scope="col" className="px-4 py-2" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const due = dueLabel(item.dueDate);
            return (
              <tr
                key={item.id}
                className={`group border-b border-ink/10 last:border-b-0 hover:bg-paper-50 transition-colors ${
                  item._pending ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-3 align-middle">
                  <div className="min-w-0">
                    <p className="text-[14px] text-ink truncate">{item.title}</p>
                    {item.goal && (
                      <Link
                        href={`/w/${workspaceId}/goals/${item.goal.id}`}
                        className="inline-flex items-center gap-1.5 mt-0.5 font-mono text-[9px] uppercase tracking-widest2 text-ink/45 hover:text-ember transition-colors"
                      >
                        <Target size={10} strokeWidth={1.75} aria-hidden="true" />
                        <span className="normal-case tracking-normal text-[11px] font-sans truncate max-w-[18rem]">
                          {item.goal.title}
                        </span>
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink/65 tabular-nums">
                    {item.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle">
                  <PriorityChip priority={item.priority} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`font-mono text-[10px] uppercase tracking-widest2 tabular-nums ${due?.tone || "text-ink/35"}`}>
                    {due?.text || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle">
                  {item.assignee ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar user={item.assignee} size="xs" />
                      <span className="text-[12px] text-ink/75 hidden sm:inline">
                        {item.assignee.name}
                        {item.assignee.id === me?.id && <span className="text-ember"> · you</span>}
                      </span>
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] uppercase tracking-widest2 text-ink/35">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    disabled={item._pending}
                    aria-label="Delete item"
                    className="opacity-0 group-hover:opacity-100 p-1 text-ink/35 hover:text-ember focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ember transition-opacity"
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="px-6 py-14 border border-dashed border-ink/15 bg-paper-50 text-center">
      <CheckSquare size={22} strokeWidth={1.5} className="mx-auto text-ink/35" />
      <p className="mt-4 font-mono text-[11px] uppercase tracking-widest2 text-ink/55">
        No action items on file
      </p>
      <p className="mt-2 max-w-md mx-auto text-sm text-ink/55 leading-relaxed">
        Break the work into concrete steps. The first item you file shows up on the board for everyone.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2.5 bg-ink text-paper px-4 py-2.5 hover:bg-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-widest2">New item</span>
      </button>
    </div>
  );
}

function Skeleton({ view }) {
  if (view === "list") {
    return (
      <div className="border border-ink/10 divide-y divide-ink/10" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 px-4 flex items-center gap-4">
            <div className="h-3 w-1/3 bg-ink/10 animate-pulse" />
            <div className="h-3 w-16 bg-ink/5 animate-pulse ml-auto" />
            <div className="h-3 w-12 bg-ink/5 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-paper-50 border border-ink/10 p-3 min-h-[200px] space-y-2">
          <div className="h-3 w-1/2 bg-ink/10 animate-pulse" />
          {Array.from({ length: 2 }).map((__, j) => (
            <div key={j} className="h-16 bg-paper border border-ink/10" />
          ))}
        </div>
      ))}
    </div>
  );
}
