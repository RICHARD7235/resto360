type Props = { items: string[] };

export function V2Footer({ items }: Props) {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">Disponible en v2</p>
      <ul className="text-xs text-muted-foreground space-y-1">
        {items.map((it) => (
          <li key={it}>· {it}</li>
        ))}
      </ul>
    </div>
  );
}
