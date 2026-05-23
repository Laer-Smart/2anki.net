import { render, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UploadSourceChips, type UploadSource } from './UploadSourceChips';

describe('UploadSourceChips', () => {
  it('renders an "or" divider above the source chips', () => {
    const { container } = render(
      <UploadSourceChips
        active="local"
        onChange={vi.fn()}
        dropboxAvailable={true}
        googleDriveAvailable={true}
      />
    );
    const group = container.querySelector('[role="group"][aria-label="Other upload sources"]');
    expect(group).not.toBeNull();
    expect(container.textContent).toContain('or');
  });

  it('renders the Dropbox chip when available', () => {
    const { container } = render(
      <UploadSourceChips
        active="local"
        onChange={vi.fn()}
        dropboxAvailable={true}
        googleDriveAvailable={false}
      />
    );
    const dropboxBtn = container.querySelector('button[aria-label="Dropbox"]');
    expect(dropboxBtn).not.toBeNull();
    expect(dropboxBtn?.hasAttribute('disabled')).toBe(false);
  });

  it('renders Dropbox chip disabled when not available', () => {
    const { container } = render(
      <UploadSourceChips
        active="local"
        onChange={vi.fn()}
        dropboxAvailable={false}
        googleDriveAvailable={false}
      />
    );
    const dropboxBtn = container.querySelector('button[aria-label="Dropbox"]');
    expect(dropboxBtn).not.toBeNull();
    expect(dropboxBtn?.hasAttribute('disabled')).toBe(true);
  });

  it('renders the Google Drive chip when available', () => {
    const { container } = render(
      <UploadSourceChips
        active="local"
        onChange={vi.fn()}
        dropboxAvailable={false}
        googleDriveAvailable={true}
      />
    );
    const driveBtn = container.querySelector('button[aria-label="Google Drive"]');
    expect(driveBtn).not.toBeNull();
    expect(driveBtn?.hasAttribute('disabled')).toBe(false);
  });

  it('renders Google Drive chip disabled when not available', () => {
    const { container } = render(
      <UploadSourceChips
        active="local"
        onChange={vi.fn()}
        dropboxAvailable={false}
        googleDriveAvailable={false}
      />
    );
    const driveBtn = container.querySelector('button[aria-label="Google Drive"]');
    expect(driveBtn).not.toBeNull();
    expect(driveBtn?.hasAttribute('disabled')).toBe(true);
  });

  it('calls onChange with "dropbox" when the Dropbox chip is clicked and local is active', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <UploadSourceChips
        active="local"
        onChange={onChange}
        dropboxAvailable={true}
        googleDriveAvailable={false}
      />
    );
    const dropboxBtn = container.querySelector('button[aria-label="Dropbox"]') as HTMLButtonElement;
    await act(async () => {
      dropboxBtn.click();
    });
    expect(onChange).toHaveBeenCalledWith('dropbox');
  });

  it('calls onChange with "local" when the active Dropbox chip is clicked again (toggle off)', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <UploadSourceChips
        active={'dropbox' as UploadSource}
        onChange={onChange}
        dropboxAvailable={true}
        googleDriveAvailable={false}
      />
    );
    const dropboxBtn = container.querySelector('button[aria-label="Dropbox"]') as HTMLButtonElement;
    await act(async () => {
      dropboxBtn.click();
    });
    expect(onChange).toHaveBeenCalledWith('local');
  });

  it('calls onChange with "google_drive" when the Google Drive chip is clicked and local is active', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <UploadSourceChips
        active="local"
        onChange={onChange}
        dropboxAvailable={false}
        googleDriveAvailable={true}
      />
    );
    const driveBtn = container.querySelector('button[aria-label="Google Drive"]') as HTMLButtonElement;
    await act(async () => {
      driveBtn.click();
    });
    expect(onChange).toHaveBeenCalledWith('google_drive');
  });

  it('marks the active chip with aria-pressed="true"', () => {
    const { container } = render(
      <UploadSourceChips
        active={'dropbox' as UploadSource}
        onChange={vi.fn()}
        dropboxAvailable={true}
        googleDriveAvailable={false}
      />
    );
    const dropboxBtn = container.querySelector('button[aria-label="Dropbox"]');
    expect(dropboxBtn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not render null class names', () => {
    const { container } = render(
      <UploadSourceChips
        active="local"
        onChange={vi.fn()}
        dropboxAvailable={true}
        googleDriveAvailable={true}
      />
    );
    expect(container.querySelector('.null')).toBeNull();
  });
});
