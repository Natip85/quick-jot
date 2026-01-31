import { useMemo } from "react";
import { debounce } from "lodash-es";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const searchParamsParser = {
  folderId: parseAsString,
  noteId: parseAsString,
  q: parseAsString.withDefault(""),
};

export const loadSearchParams = createLoader(searchParamsParser);

export const useNotesSearchParams = ({ debounceMs = 500 }: { debounceMs?: number } = {}) => {
  const [searchParams, setSearchParams] = useQueryStates(searchParamsParser);

  const debouncedSetSearchParams = useMemo(
    () => debounce(setSearchParams, debounceMs),
    [setSearchParams, debounceMs]
  );

  const setFolderId = (folderId: string | null) => {
    // When changing folder, clear the selected note
    void setSearchParams({ folderId, noteId: null });
  };

  const setNoteId = (noteId: string | null) => {
    void setSearchParams({ noteId });
  };

  const resetFilters = async () => {
    await setSearchParams({ folderId: null, noteId: null });
  };

  const setQuery = (q: string) => {
    void setSearchParams({ q: q || null });
  };

  const clearQuery = () => {
    void setSearchParams({ q: null });
  };

  return {
    folderId: searchParams.folderId,
    noteId: searchParams.noteId,
    q: searchParams.q,
    searchParams,
    setSearchParams,
    setFolderId,
    setNoteId,
    setQuery,
    clearQuery,
    debouncedSetSearchParams,
    resetFilters,
  };
};
