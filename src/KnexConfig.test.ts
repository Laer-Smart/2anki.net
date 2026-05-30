type MigrationsConfig = { disableMigrationsListValidation?: boolean };

function loadConfigWith(localDev: string | undefined) {
  jest.resetModules();
  const original = process.env.LOCAL_DEV;
  if (localDev === undefined) {
    delete process.env.LOCAL_DEV;
  } else {
    process.env.LOCAL_DEV = localDev;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require('./KnexConfig').default;
  if (original === undefined) {
    delete process.env.LOCAL_DEV;
  } else {
    process.env.LOCAL_DEV = original;
  }
  return config.migrations as MigrationsConfig;
}

describe('KnexConfig migrations validation', () => {
  it('disables migration-list validation in local dev', () => {
    expect(loadConfigWith('true').disableMigrationsListValidation).toBe(true);
  });

  it('keeps strict validation when LOCAL_DEV is unset (prod/CI)', () => {
    expect(loadConfigWith(undefined).disableMigrationsListValidation).toBe(
      false
    );
  });

  it('keeps strict validation when LOCAL_DEV is not exactly "true"', () => {
    expect(loadConfigWith('false').disableMigrationsListValidation).toBe(false);
  });
});
