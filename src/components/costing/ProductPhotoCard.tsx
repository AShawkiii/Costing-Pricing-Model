/**
 * Product photo section.
 *
 * Accepts a click or a drag-and-drop, downscales the picture (see lib/image.ts)
 * and stores it inside the costing model, so it travels with the model into the
 * Costing & Pricing Card and the printed cost sheet.
 */

import { useRef, useState, type DragEvent } from 'react';
import { Card } from '../ui/Card';
import { Notice } from '../ui/Notice';
import { useApp } from '../../state/AppStateContext';
import { ACCEPTED_TYPES, formatBytes, ImageError, MAX_IMAGE_EDGE, readProductPhoto } from '../../lib/image';

export function ProductPhotoCard() {
  const { state, dispatch } = useApp();
  const photo = state.costing.product.photo;
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      dispatch({ type: 'setProductPhoto', photo: await readProductPhoto(file) });
    } catch (e) {
      setError(e instanceof ImageError ? e.message : 'The image could not be processed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <Card
      title="Product Photo"
      subtitle="Shown on the Costing & Pricing Card and the printed cost sheet."
      badge={<span className="badge badge--optional">Optional</span>}
      actions={
        photo && (
          <>
            <button className="btn btn--secondary btn--sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              Replace
            </button>
            <button className="btn btn--danger btn--sm" onClick={() => dispatch({ type: 'removeProductPhoto' })}>
              Remove
            </button>
          </>
        )
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        style={{ display: 'none' }}
        aria-label="Product photo file"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {photo ? (
        <div className="photo-row">
          <img className="photo-preview" src={photo.dataUrl} alt={`Product photo: ${photo.name}`} />
          <div className="photo-meta">
            <div className="photo-meta__name">{photo.name}</div>
            <div className="text-muted">
              {photo.width} × {photo.height} px · {formatBytes(photo.bytes)} stored
            </div>
            <p className="text-muted" style={{ margin: '8px 0 0' }}>
              The picture is resized to {MAX_IMAGE_EDGE}px on its longest edge and saved with the costing model, so it
              appears on the card and in the printed sheet without any upload.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone${dragging ? ' dropzone--active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="dropzone__icon" aria-hidden>▣</div>
          <div className="dropzone__title">{busy ? 'Processing image…' : 'Add a product photo'}</div>
          <div className="dropzone__hint">Click to choose a file, or drop a JPG / PNG / WebP here (max 10 MB).</div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </Card>
  );
}
