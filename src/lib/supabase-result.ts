/** Supabase retorna erros como dados; await sozinho não lança uma exceção. */
export async function requireSuccess<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
}
