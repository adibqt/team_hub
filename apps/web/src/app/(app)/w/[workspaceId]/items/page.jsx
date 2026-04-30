"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useItemsStore } from "@/stores/itemsStore";

const COLUMNS = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

export default function ItemsPage() {
  const { workspaceId } = useParams();
  const { items, load, moveItem } = useItemsStore();

  useEffect(() => { load(workspaceId); }, [workspaceId]);

  function onDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    moveItem(draggableId, destination.droppableId);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Action Items</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <Droppable key={col} droppableId={col}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className="bg-gray-100 rounded-lg p-3 min-h-[200px]">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">{col.replace("_", " ")}</h3>
                  {items.filter((i) => i.status === col).map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(p) => (
                        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                          className={`bg-white rounded-lg shadow p-3 mb-2 text-sm ${item._pending ? "opacity-60" : ""}`}>
                          {item.title}
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
    </div>
  );
}
