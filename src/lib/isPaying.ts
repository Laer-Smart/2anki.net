export const isPaying = (locals?: Record<string, unknown>) => {
  if (!locals) {
    return false;
  }
  return locals.patreon === true || locals.subscriber === true;
};
