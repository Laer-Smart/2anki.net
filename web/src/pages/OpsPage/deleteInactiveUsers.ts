export interface DeleteInactiveUsersResponse {
  count: number;
  dryRun: boolean;
}

export async function deleteInactiveUsers(
  dryRun: boolean
): Promise<DeleteInactiveUsersResponse> {
  const response = await fetch(
    `/api/ops/delete-inactive-users?dryRun=${dryRun}`,
    { method: 'POST', credentials: 'include' }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
}
