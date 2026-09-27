type PageResult<T> = { data: T[] | null; error: unknown };
type PageQuery<T> = { range(from: number, to: number): PromiseLike<PageResult<T>> };

// Use a fresh, consistently ordered query for every page; never show partial balances or reports.
export async function fetchAllRows<T>(createQuery: () => PageQuery<T>): Promise<PageResult<T>> {
  const rows: T[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await createQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}
