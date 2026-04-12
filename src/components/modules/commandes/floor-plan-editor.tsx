"use client";

import { useCallback, useRef, useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TableShape } from "./table-shape";
import { TableEditPanel, type EditableTable } from "./table-edit-panel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FloorPlanEditorProps {
  initialTables: EditableTable[];
  onSave: (tables: EditableTable[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// DraggableTable
// ---------------------------------------------------------------------------

function DraggableTable({
  table,
  isSelected,
  onClick,
}: {
  table: EditableTable;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id,
  });

  const style: React.CSSProperties = {
    left: `${table.pos_x}%`,
    top: `${table.pos_y}%`,
    transform: transform
      ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))`
      : "translate(-50%, -50%)",
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute"
      style={style}
      {...listeners}
      {...attributes}
    >
      <TableShape
        name={table.name}
        shape={table.shape}
        width={table.width}
        height={table.height}
        capacity={table.capacity}
        status="free"
        isSelected={isSelected}
        onClick={onClick}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function FloorPlanEditor({
  initialTables,
  onSave,
}: FloorPlanEditorProps) {
  const [tables, setTables] = useState<EditableTable[]>(initialTables);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const zones = Array.from(new Set(tables.map((t) => t.zone)));
  const selectedTable = tables.find((t) => t.id === selectedId) ?? null;

  // -----------------------------------------------------------------------
  // Drag end: convert pixel delta to % delta
  // -----------------------------------------------------------------------
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const deltaXPercent = (delta.x / rect.width) * 100;
      const deltaYPercent = (delta.y / rect.height) * 100;

      setTables((prev) =>
        prev.map((t) =>
          t.id === active.id
            ? {
                ...t,
                pos_x: Math.max(2, Math.min(98, t.pos_x + deltaXPercent)),
                pos_y: Math.max(2, Math.min(98, t.pos_y + deltaYPercent)),
              }
            : t
        )
      );
    },
    []
  );

  // -----------------------------------------------------------------------
  // Add table
  // -----------------------------------------------------------------------
  const handleAddTable = useCallback(() => {
    const newId = crypto.randomUUID();
    const existingNames = tables.map((t) => t.name);
    let idx = tables.length + 1;
    while (existingNames.includes(`T${idx}`)) idx++;

    const newTable: EditableTable = {
      id: newId,
      name: `T${idx}`,
      zone: "Salle",
      capacity: 4,
      shape: "square",
      width: 1,
      height: 1,
      pos_x: 50,
      pos_y: 50,
    };

    setTables((prev) => [...prev, newTable]);
    setSelectedId(newId);
  }, [tables]);

  // -----------------------------------------------------------------------
  // Update table properties
  // -----------------------------------------------------------------------
  const handleTableChange = useCallback((updated: EditableTable) => {
    setTables((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  }, []);

  // -----------------------------------------------------------------------
  // Delete table
  // -----------------------------------------------------------------------
  const handleDeleteTable = useCallback(
    (tableId: string) => {
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      if (selectedId === tableId) setSelectedId(null);
    },
    [selectedId]
  );

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(tables);
    } finally {
      setSaving(false);
    }
  }, [tables, onSave]);

  return (
    <div className="flex gap-4">
      {/* Canvas */}
      <div className="flex-1 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="min-h-[44px] gap-2"
            onClick={handleAddTable}
          >
            <Plus className="size-4" />
            Ajouter une table
          </Button>
          <Button
            className="min-h-[44px] gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="size-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>

        {/* Canvas area */}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            ref={canvasRef}
            className="relative w-full rounded-xl border bg-muted/20"
            style={{ aspectRatio: "16 / 10" }}
            onClick={(e) => {
              // Deselect when clicking canvas background
              if (e.target === e.currentTarget) setSelectedId(null);
            }}
          >
            {tables.map((table) => (
              <DraggableTable
                key={table.id}
                table={table}
                isSelected={selectedId === table.id}
                onClick={() => setSelectedId(table.id)}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {/* Side panel */}
      <div className="w-72 shrink-0">
        {selectedTable ? (
          <TableEditPanel
            table={selectedTable}
            zones={zones}
            onChange={handleTableChange}
            onDelete={handleDeleteTable}
          />
        ) : (
          <div className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground">
            Selectionnez une table pour modifier ses proprietes
          </div>
        )}
      </div>
    </div>
  );
}
