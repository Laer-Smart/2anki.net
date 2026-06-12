const DOM_ERROR_MESSAGE_FRAGMENTS = [
  "insertBefore' on 'Node'",
  "removeChild' on 'Node'",
  "appendChild' on 'Node'",
  'is not a child of this node',
];

export function isDomManipulationError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') {
    return false;
  }

  const name = (error as { name?: unknown }).name;
  if (name === 'NotFoundError' || name === 'HierarchyRequestError') {
    return true;
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string') {
    return false;
  }

  return DOM_ERROR_MESSAGE_FRAGMENTS.some((fragment) =>
    message.includes(fragment)
  );
}
