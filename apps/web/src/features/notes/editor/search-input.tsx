"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { useNotesSearchParams } from "../query-params";

export function SearchInput({ className }: { className?: string }) {
  const { q, debouncedSetSearchParams, clearQuery } = useNotesSearchParams();

  // Use local state for the input value to avoid losing focus on URL updates
  const [localValue, setLocalValue] = useState(q);

  // Sync local state when URL param changes externally (e.g., cleared from elsewhere)
  useEffect(() => {
    setLocalValue(q);
  }, [q]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    void debouncedSetSearchParams({ q: value || null });
  };

  const handleClear = () => {
    setLocalValue("");
    clearQuery();
  };

  return (
    <Input
      type="text"
      placeholder="Search notes..."
      value={localValue}
      onChange={handleChange}
      onClear={handleClear}
      showSearch
      size="sm"
      className={className}
    />
  );
}
