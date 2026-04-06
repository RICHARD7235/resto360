"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { DEPARTMENT_LABELS, type Department } from "@/types/personnel";

interface DepartmentFilterProps {
  department: string;
  contractType: string;
  search: string;
  onDepartmentChange: (value: string | null) => void;
  onContractTypeChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}

export function DepartmentFilter({
  department,
  contractType,
  search,
  onDepartmentChange,
  onContractTypeChange,
  onSearchChange,
  onReset,
}: DepartmentFilterProps) {
  const hasFilters = department || contractType || search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Rechercher un employé..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />
      <Select value={department} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Département" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          {(Object.entries(DEPARTMENT_LABELS) as [Department, string][]).map(
            ([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
      <Select value={contractType} onValueChange={onContractTypeChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Contrat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="cdi">CDI</SelectItem>
          <SelectItem value="cdd">CDD</SelectItem>
          <SelectItem value="apprenti">Apprenti</SelectItem>
          <SelectItem value="extra">Extra</SelectItem>
          <SelectItem value="temps_partiel">Temps partiel</SelectItem>
          <SelectItem value="stage">Stage</SelectItem>
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="min-h-11 gap-1">
          <X className="h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
