import { useEffect, useRef, useState } from 'react';
import type { Photo } from '../services/localEngine';
import { photoUrl } from '../services/localEngine';

export interface Viewport {
  zoom: number;
  x: number;
  y: number;
}
interface Props {
  photo: Photo;
  viewport: Viewport;
  onChange: (value: Viewport) => void;
  showFaces: boolean;
}

export default function SyncPreview({
  photo,
  viewport,
  onChange,
  showFaces,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: Viewport } | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [full, setFull] = useState(false);
  const [focusFace,setFocusFace] = useState<number | null>(null);
  const [rendering,setRendering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(element);
  return () => observer.disconnect();
  }, []);
  const cameraPreview = photo.preview_basis === 'embedded_jpeg';
  const width = (cameraPreview && full ? natural.width : photo.original_width) || natural.width || 1;
  const height = (cameraPreview && full ? natural.height : photo.original_height) || natural.height || 1;
  const fit = Math.min(1, size.width / width, size.height / height);
  const pixelZoom = Math.max(1, 1 / fit);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      onChange({
        ...viewport,
        zoom: Math.min(
          Math.max(30, pixelZoom),
          Math.max(1, viewport.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)),
        ),
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [onChange, viewport, pixelZoom]);
    const inspect = (faceIndex:number | null = null) => {
    setFocusFace(faceIndex);
    if(cameraPreview && !full) { setFull(true); setRendering(true); return; }
    const face=photo.analysis?.faces.find(f=>f.index===faceIndex);
    onChange({zoom:pixelZoom,x:face?(0.5-(face.box[0]+face.box[2])/2)*pixelZoom:0,y:face?(0.5-(face.box[1]+face.box[3])/2)*pixelZoom:0});
  };
  return (
    <section className="inspection-pane">
      <div className="pane-title">
        <strong>{photo.name}</strong>
        <button onClick={() => inspect()}>
          100% pixels
        </button>
        {!!photo.analysis?.faces.length && <button onClick={()=>inspect(photo.analysis?.key_face ?? 0)}>Key Face 100%</button>}
      </div>
      <div
        ref={container}
        className="original-viewport"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            start: viewport,
          };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          onChange({
            ...drag.current.start,
            x:
              drag.current.start.x +
              (event.clientX - drag.current.x) / (width * fit),
            y:
              drag.current.start.y +
              (event.clientY - drag.current.y) / (height * fit),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {failed ? (
          <p className="preview-error">
            Original unavailable. Check that the source file is still in its
            folder.
          </p>
        ) : (
          <div
            className="original-image"
            style={{
              width: width * fit,
              height: height * fit,
              transform: `translate(-50%, -50%) translate(${viewport.x * width * fit}px, ${viewport.y * height * fit}px) scale(${viewport.zoom})`,
            }}
          >
            <img
              src={photoUrl(photo, cameraPreview && !full ? 'embedded' : 'original')}
              alt={photo.name}
              draggable={false}
              onLoad={(event) => {
                const w=event.currentTarget.naturalWidth,h=event.currentTarget.naturalHeight;
                setNatural({width:w,height:h});
                if(rendering) {
                  const zoom=Math.max(1,1/Math.min(1,size.width/w,size.height/h));
                  const face=photo.analysis?.faces.find(f=>f.index===focusFace);
                  onChange({zoom,x:face?(0.5-(face.box[0]+face.box[2])/2)*zoom:0,y:face?(0.5-(face.box[1]+face.box[3])/2)*zoom:0});
                  setRendering(false);
                }
              }}
              onError={() => {setFailed(true);setRendering(false);}}
            />
            {showFaces &&
              photo.analysis?.faces.map((face) => (
                <div
                  key={face.index}
                  className={`face-box ${face.eyes}`}
                  style={{
                    left: `${face.box[0] * 100}%`,
                    top: `${face.box[1] * 100}%`,
                    width: `${(face.box[2] - face.box[0]) * 100}%`,
                    height: `${(face.box[3] - face.box[1]) * 100}%`,
                  }}
                >
                  <span>Face {face.index + 1}</span>
                </div>
              ))}
          </div>
        )}
      </div>
      <p className="pane-hint">
        Full-resolution original · drag to pan · scroll to zoom
      </p>
    </section>
  );
}
