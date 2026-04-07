"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  periods: { value: string; label: string }[];
  current: string;
};

export function PeriodSelector({ periods, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (value: string | null) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("period", value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Sélectionner un mois" />
      </SelectTrigger>
      <SelectContent>
        {periods.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
