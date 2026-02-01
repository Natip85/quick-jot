"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useNotesSearchParams } from "../query-params";

export function SearchInput({ className }: { className?: string }) {
  const { q, debouncedSetSearchParams, clearQuery } = useNotesSearchParams();

  // Use local state for the input value to avoid losing focus on URL updates
  // Initialize with q value, and reset when q changes via key prop pattern
  const [localValue, setLocalValue] = useState(q ?? "");

  // Reset local value when q is cleared externally (e.g., from another component)
  // Using controlled input pattern where local state tracks the input
  if (q === null && localValue !== "") {
    setLocalValue("");
  }

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
      placeholder="Search all notes..."
      value={localValue}
      onChange={handleChange}
      onClear={handleClear}
      showSearch
      size="sm"
      className={className}
    />
  );
}
