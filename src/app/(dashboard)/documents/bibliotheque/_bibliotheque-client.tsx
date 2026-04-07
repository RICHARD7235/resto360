"use client";

import { useMemo, useState } from "react";
import { CategorySidebar } from "../_components/category-sidebar";
import { DocumentsTable } from "../_components/documents-table";
import { DocumentFormDialog } from "../_components/document-form-dialog";
import type { DocumentCategory, DocumentWithStatus } from "@/types/documents";

interface BibliothequeClientProps {
  categories: DocumentCategory[];
  documents: DocumentWithStatus[];
}

export function BibliothequeClient({
  categories,
  documents,
}: BibliothequeClientProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!selected) return documents;
    return documents.filter((d) => d.category_id === selected);
  }, [documents, selected]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
      <aside>
        <CategorySidebar
          categories={categories}
          documents={documents}
          selected={selected}
          onSelect={setSelected}
        />
      </aside>
      <section className="space-y-4">
        <div className="flex justify-end">
          <DocumentFormDialog categories={categories} />
        </div>
        <DocumentsTable documents={filtered} />
      </section>
    </div>
  );
}
