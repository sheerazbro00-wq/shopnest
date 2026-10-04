import { useEffect, useRef, useState } from "react";
import { signImageUpload, uploadToCloudinary } from "../../api/admin";
import { sized } from "../../utils/format";
import { checkImageLink } from "../../utils/imageUrl";

// Product photos: upload from the device (spec 002 US-1, US-2) or paste a link (US-3).
// Finished uploads become plain URLs in `images`, exactly like pasted links (AC-1.5).

const MAX_IMAGES = 12; // AC-1.7, also enforced on save (R-5)
const MAX_BYTES = 10 * 1024 * 1024; // AC-1.3, also enforced by Cloudinary (R-5)
const PARALLEL = 2; // smooth on mobile data (plan §8)
const SLIP_TTL_MS = 50 * 60 * 1000; // Cloudinary accepts a signature for 1 hour
const TYPES = /^image\/(jpeg|png|webp|heic|heif)$/;
const EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;
const isHeic = (file) => /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

// Android often reports HEIC photos with an empty type, so the name decides then.
const isPhoto = (file) => TYPES.test(file.type) || (!file.type && EXTENSIONS.test(file.name));
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
let nextId = 0;

export default function ImagesEditor({ images, onChange, onPendingChange, error }) {
  const [uploads, setUploads] = useState([]); // in the order picked (AC-1.2)
  const [notice, setNotice] = useState("");
  const [uploadsOff, setUploadsOff] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [checking, setChecking] = useState(false);
  const [broken, setBroken] = useState({});
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const slip = useRef(null); // { data, at } — reused for every upload within the hour
  const controllers = useRef(new Map()); // upload id → AbortController

  const patch = (id, change) => setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...change } : u)));

  const getSlip = async () => {
    if (slip.current && Date.now() - slip.current.at < SLIP_TTL_MS) return slip.current.data;
    const data = await signImageUpload();
    slip.current = { data, at: Date.now() };
    return data;
  };

  // Ask for a slip up front: it hides the Upload box when the server has uploads off.
  useEffect(() => {
    getSlip().catch((err) => err.response?.status === 503 && setUploadsOff(true));
  }, []);

  // Leaving the editor (or Discard, which remounts it) cancels uploads and frees previews.
  const latest = useRef(uploads);
  latest.current = uploads;
  useEffect(
    () => () => {
      controllers.current.forEach((c) => c.abort());
      latest.current.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
    },
    []
  );

  const pending = uploads.filter((u) => u.status === "queued" || u.status === "uploading").length;
  useEffect(() => onPendingChange?.(pending), [pending]);

  const start = async (item) => {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    patch(item.id, { status: "uploading", progress: 0, error: "" });
    try {
      const done = await uploadToCloudinary(item.file, await getSlip(), {
        signal: controller.signal,
        onProgress: (p) => patch(item.id, { progress: p }),
      });
      patch(item.id, { status: "done", url: done });
    } catch (err) {
      if (err?.aborted) return;
      // A refused file won't upload on retry either (e.g. not really a photo, R-4).
      patch(item.id, {
        status: "failed",
        retryable: !err?.refused,
        error: err?.refused ? "Not a readable photo" : "Upload failed",
      });
    } finally {
      controllers.current.delete(item.id);
    }
  };

  // Keep at most PARALLEL uploads running; start the next queued ones in order.
  useEffect(() => {
    const running = uploads.filter((u) => u.status === "uploading").length;
    uploads
      .filter((u) => u.status === "queued")
      .slice(0, Math.max(0, PARALLEL - running))
      .forEach(start);
  }, [uploads]);

  // Move finished uploads into the image list in the order they were picked. A failed
  // tile doesn't hold the others back; it joins the end once retried (AC-1.2, AC-2.3).
  useEffect(() => {
    const ready = [];
    for (const u of uploads) {
      if (u.status === "queued" || u.status === "uploading") break;
      if (u.status === "done") ready.push(u);
    }
    if (!ready.length) return;
    ready.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
    onChange([...images, ...ready.map((u) => u.url).filter((x) => !images.includes(x))]);
    setUploads((list) => list.filter((u) => !ready.includes(u)));
  }, [uploads]);

  const addFiles = (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    const problems = [];
    const ok = [];
    for (const f of files) {
      if (!isPhoto(f)) problems.push(`“${f.name}” isn't a photo. Use JPG, PNG, WebP or HEIC.`); // AC-2.1
      else if (f.size > MAX_BYTES) problems.push(`“${f.name}” is ${mb(f.size)} MB. Photos can be up to 10 MB.`); // AC-2.2
      else ok.push(f);
    }
    const room = Math.max(0, MAX_IMAGES - images.length - uploads.length);
    const accepted = ok.slice(0, room);
    const skipped = ok.length - accepted.length;
    if (skipped) problems.push(room ? `Only ${room} more image${room === 1 ? "" : "s"} fit (12 max), so ${skipped} ${skipped === 1 ? "was" : "were"} skipped.` : "This product already has 12 images, the most it can have."); // AC-2.4
    setNotice(problems.join(" "));
    setUploads((list) => [
      ...list,
      ...accepted.map((file) => ({
        id: ++nextId,
        file,
        name: file.name,
        preview: isHeic(file) ? null : URL.createObjectURL(file), // most browsers can't draw HEIC
        status: "queued",
        progress: 0,
      })),
    ]);
  };

  const removeUpload = (u) => {
    controllers.current.get(u.id)?.abort();
    if (u.preview) URL.revokeObjectURL(u.preview);
    setUploads((list) => list.filter((x) => x.id !== u.id));
    setNotice("");
  };

  const addLink = async () => {
    if (images.length + uploads.length >= MAX_IMAGES) return setUrlError("Up to 12 images");
    setChecking(true);
    const result = await checkImageLink(url);
    setChecking(false);
    if (result.error) return setUrlError(result.error);
    if (images.includes(result.url)) return setUrlError("That image is already added");
    onChange([...images, result.url]);
    setUrl("");
    setUrlError("");
  };

  const move = (i, dir) => {
    const next = [...images];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  const full = images.length + uploads.length >= MAX_IMAGES;
  const dropProps = uploadsOff
    ? {}
    : {
        onDragOver: (e) => {
          if (![...e.dataTransfer.types].includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        },
        onDragLeave: (e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false),
        onDrop: (e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        },
      };

  return (
    <div className={`pe-media${dragging ? " is-dragging" : ""}`} {...dropProps}>
      {!uploadsOff && (
        <>
          {/* A broad "image/*" makes phones offer camera *and* gallery; a list of exact
              types makes many Android phones jump straight to the gallery. Types are
              checked after picking instead (AC-2.1). */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = ""; // picking the same photo again still fires
            }}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="pe-upload-row">
            <button type="button" className="pe-upload" onClick={() => fileInput.current.click()} disabled={full}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="pe-upload__icon">
                <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
              <span className="pe-upload__label">{dragging ? "Drop photos to upload" : "Upload images"}</span>
              <span className="pe-upload__hint">{full ? "12 images is the most a product can have" : "JPG, PNG, WebP or HEIC · up to 10 MB each"}</span>
            </button>
            {/* Phones only: always opens the camera, whatever the picker above offers. */}
            <button type="button" className="pe-upload pe-upload--camera" onClick={() => cameraInput.current.click()} disabled={full}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="pe-upload__icon">
                <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span className="pe-upload__label">Take photo</span>
            </button>
          </div>
          {notice && (
            <p className="pe-error" role="alert">
              {notice}
            </p>
          )}
        </>
      )}

      {images.length + uploads.length > 0 ? (
        <ul className="pe-images">
          {images.map((src, i) => (
            <li key={src} className={i === 0 ? "is-main" : ""}>
              <img src={sized(src, 300)} alt={`Image ${i + 1}`} onError={() => setBroken((b) => ({ ...b, [src]: true }))} onLoad={() => setBroken((b) => ({ ...b, [src]: false }))} />
              {broken[src] && <span className="pe-images__broken">Can&rsquo;t load this image</span>}
              {i === 0 && <span className="pe-images__main">Main</span>}
              <div className="pe-images__tools">
                <button type="button" aria-label={`Move image ${i + 1} left`} disabled={i === 0} onClick={() => move(i, -1)}>
                  &larr;
                </button>
                <button type="button" aria-label={`Move image ${i + 1} right`} disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                  &rarr;
                </button>
                <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => onChange(images.filter((x) => x !== src))}>
                  &times;
                </button>
              </div>
            </li>
          ))}
          {uploads.map((u) => (
            <li key={u.id} className={`pe-tile is-${u.status}`}>
              {u.preview ? <img src={u.preview} alt="" /> : <span className="pe-tile__name">{u.name}</span>}
              <div className="pe-tile__overlay">
                {u.status === "failed" ? (
                  <>
                    <span className="pe-tile__error">{u.error}</span>
                    {u.retryable && (
                      <button type="button" className="pe-tile__retry" onClick={() => patch(u.id, { status: "queued", error: "" })}>
                        Retry
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="pe-tile__pct">{u.status === "queued" ? "Waiting…" : u.progress >= 1 ? "Finishing…" : `${Math.round(u.progress * 100)}%`}</span>
                    <span
                      className="pe-tile__bar"
                      role="progressbar"
                      aria-label={`Uploading ${u.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(u.progress * 100)}
                    >
                      <span style={{ width: `${Math.round(u.progress * 100)}%` }} />
                    </span>
                  </>
                )}
              </div>
              <button type="button" className="pe-tile__remove" aria-label={`Cancel ${u.name}`} onClick={() => removeUpload(u)}>
                &times;
              </button>
            </li>
          ))}
        </ul>
      ) : (
        uploadsOff && <p className="pe-empty">No images yet. The first image is the one shoppers see in listings.</p>
      )}
      {images.length > 0 && <p className="pe-hint">The first image (Main) is the one shoppers see in listings.</p>}

      <p className="pe-link-label">{uploadsOff ? "Image link" : "Or paste an image link"}</p>
      <div className="pe-inline">
        <label htmlFor="ImageUrl" className="visually-hidden">
          Image URL
        </label>
        <input
          id="ImageUrl"
          className="pe-input"
          type="url"
          placeholder="https://…/image.jpg"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setUrlError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (url.trim() && !checking) addLink();
            }
          }}
        />
        <button type="button" className="adm-btn" onClick={addLink} disabled={!url.trim() || checking}>
          {checking ? "Checking…" : "Add"}
        </button>
      </div>
      {(urlError || error) && <p className="pe-error">{urlError || error}</p>}
    </div>
  );
}
