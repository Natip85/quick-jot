import { useMemo } from "react";
import { debounce } from "lodash-es";
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const searchParamsParser = {
  folderId: parseAsString,
};

export const loadSearchParams = createLoader(searchParamsParser);

export const useFoldersSearchParams = ({ debounceMs = 500 }: { debounceMs?: number } = {}) => {
  const [searchParams, setSearchParams] = useQueryStates(searchParamsParser);

  const debouncedSetSearchParams = useMemo(
    () => debounce(setSearchParams, debounceMs),
    [setSearchParams, debounceMs]
  );

  const resetFilters = async (folderId?: string) => {
    await setSearchParams({ folderId });
  };

  return {
    folderId: searchParams.folderId,
    searchParams,
    setSearchParams,
    debouncedSetSearchParams,
    resetFilters,
  };
};
