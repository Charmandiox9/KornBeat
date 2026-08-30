'use client';
import { useCallback, useEffect, useState } from 'react';

const ENDPOINTS = {
  music: '/api/music/graphql',
  reco: '/api/recommendations/graphql',
};

let idCounter = 0;

/**
 * Cliente GraphQL mínimo (fetch) contra los dos servidores GQL.
 * `server` = 'music' | 'reco'.
 */
export async function gql(server, query, variables = {}) {
  const res = await fetch(ENDPOINTS[server], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors?.length) {
    const message = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json.data;
}

/**
 * Hook useGql(server, query, variables, deps):
 * ejecuta la query al montar y cuando cambian `deps`.
 * Devuelve { data, loading, error, refetch }.
 */
export function useGql(server, query, variables, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await gql(server, query, variables);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function nextQueryId() {
  idCounter += 1;
  return `q${idCounter}`;
}
