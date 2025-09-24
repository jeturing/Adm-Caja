
import { useEffect, useState } from "react";

declare global {
  interface Window {
    showToast: (msg: string) => void;
  }
}
import Toast from "../components/ui/Toast";
import ComponentCard from "../components/common/ComponentCard";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
// Select component removed (no usado en este archivo)
import Button from "../components/ui/button/Button";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "../components/ui/table";
import LCTableClass from "../lccomponents/LCTableClass";
import { AsyncMethod } from "../util/apiconnectionAsync";

type LandingItem = { id: number | string; imgsrc: string | null; video?: string | null; link: string | null; muted?: boolean };
type SegmentItem = { id: number | string; name: string; order_: number };

const Lchome = () => {
  const [toastMsg, setToastMsg] = useState<string>("");
  // Exponer showToast global para uso en AsyncMethod
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.showToast = (msg: string) => {
        setToastMsg(msg);
      };
    }
  }, []);
  const [landing, setLanding] = useState<LandingItem[]>([]);
  const [muteMap, setMuteMap] = useState<Record<string | number, boolean>>({});
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [tvalue, setTvalue] = useState<number>(0);
  const [tlink, setTlink] = useState("");
  const [link, setLink] = useState("");
  const [muteNew, setMuteNew] = useState<boolean>(false);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [apiMode, setApiMode] = useState<'rest' | 'legacy' | 'unknown'>('unknown');
  const tipoOptions = [
    { value: 0, label: "Video" },
    { value: 1, label: "Imagen" },
  ];

  useEffect(() => {
    // Detectar modo de API en runtime: REST ('/home-carousel') o legacy ('/homecarousel' + '/idhomecarousel')
    const detect = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;
        // Intentar REST primero
        let res = await fetch('/api/home-carousel', { method: 'GET', headers });
        if (res.ok) { setApiMode('rest'); return; }
        // Intentar legacy
        res = await fetch('/api/homecarousel', { method: 'GET', headers });
        if (res.ok) { setApiMode('legacy'); return; }
        // Fallback conservador
        setApiMode('rest');
        console.warn('Detect API mode: neither /home-carousel nor /homecarousel returned OK; defaulting to rest');
      } catch (e) {
        console.warn('Detect API mode failed, defaulting to rest', e);
        setApiMode('rest');
      }
    };
    detect();
  }, []);

  // Cargar listado de landing una vez que sepamos el modo de API
  useEffect(() => {
    if (apiMode === 'unknown') return;
    const handleList = (json: any) => {
      setLanding(json);
      const newMuteMap: Record<string | number, boolean> = {};
      json.forEach((item: LandingItem) => {
        newMuteMap[item.id] = item.muted ?? false;
      });
      setMuteMap(newMuteMap);
    };
    if (apiMode === 'legacy') {
      AsyncMethod('homecarousel', 'GET', handleList, () => {});
    } else {
      AsyncMethod('home-carousel', 'GET', handleList, () => {});
    }
  }, [apiMode]);

  useEffect(() => {
    AsyncMethod(
      "allsegments",
      "GET",
      (json) => setSegments(json),
      () => {}
    );
  }, []);

  // Guardar item: crea (POST /home-carousel) o actualiza (PUT /home-carousel/{id}).
  const saveHomecarousel = async (id: number | string = 0) => {
    const normalizedLink = (link ?? "").toString().trim();
      const body: Record<string, any> = {};
      // Enviar explicitamente null cuando el link está vacío para indicar eliminación
      body.link = normalizedLink !== "" ? normalizedLink : null;
    body.imgsrc = tvalue === 1 ? (tlink.trim() === "" ? null : tlink) : null;
    body.video = tvalue === 0 ? (tlink.trim() === "" ? null : tlink) : null;
    body.muted = id !== 0 ? (muteMap[id] ?? false) : muteNew;

    const refresh = () => {
      // usar wrapper según apiMode
      const handleList = (json: any) => {
        setLanding(json);
        const newMuteMap: Record<string | number, boolean> = {};
        json.forEach((item: LandingItem) => {
          newMuteMap[item.id] = item.muted ?? false;
        });
        setMuteMap(newMuteMap);
      };
      if (apiMode === 'legacy') {
        AsyncMethod('homecarousel', 'GET', handleList, () => {});
      } else {
        AsyncMethod('home-carousel', 'GET', handleList, () => {});
      }
    };

    const onFinal = () => { setLink(""); setTlink(""); setMuteNew(false); setEditId(null); };

    // helper para POST en legacy que reintenta con link=="" si servidor rechaza null
    const legacyPost = async (payload: Record<string, any>) => {
      const url = '/api/idhomecarousel';
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      try {
        let res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        let text = await res.text().catch(()=>'');
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch(e) { parsed = null; }
        if (res.ok) {
          console.log('legacyPost ok', parsed || text);
          refresh(); onFinal(); setTimeout(refresh, 600);
          return { ok: true, json: parsed };
        }
        // si el backend rechaza null para 'link' con 422, reintentar con cadena vacía
        if (res.status === 422 && payload.link === null) {
          payload.link = "";
          res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
          text = await res.text().catch(()=>'');
          try { parsed = text ? JSON.parse(text) : null; } catch(e) { parsed = null; }
          if (res.ok) { console.log('legacyPost retry ok', parsed || text); refresh(); onFinal(); setTimeout(refresh, 600); return { ok: true, json: parsed }; }
        }
        // fallback: show error
        const userMessage = parsed ? (parsed.msg || parsed.error || JSON.stringify(parsed)) : text || `${res.status} ${res.statusText}`;
        try { if (typeof window !== 'undefined' && window.showToast) window.showToast(`Error: ${res.status} ${res.statusText}\n${userMessage}`); } catch(e){}
        return { ok: false, status: res.status, body: parsed || text };
      } catch (e) {
        try { if (typeof window !== 'undefined' && window.showToast) window.showToast(`Network error: ${String(e)}`); } catch(err){}
        return { ok: false, error: e };
      }
    };

    if (apiMode === 'legacy') {
        // Legacy API: POST /idhomecarousel with {id:0, link, imgsrc, video} to create.
        // Si el campo link está vacío, enviar null (no string vacío)
        const legacyLink = (body.link === undefined || body.link === "") ? null : body.link;
        if (id === 0 || id === '0') {
          const payload = { id: 0, link: legacyLink, imgsrc: body.imgsrc ?? null, video: body.video ?? null, muted: body.muted ?? false };
          await legacyPost(payload);
        } else {
          // delete then create
          // pedir borrado primero
          AsyncMethod('idhomecarousel', 'POST', async (_del) => {
            const payload = { id: 0, link: legacyLink, imgsrc: body.imgsrc ?? null, video: body.video ?? null, muted: body.muted ?? false };
            await legacyPost(payload);
          }, onFinal, { id: id });
        }
    } else {
      // REST API
      if (id === 0 || id === '0') {
        AsyncMethod('home-carousel', 'POST', (resJson) => { console.log('home-carousel create response', resJson); refresh(); onFinal(); setTimeout(refresh, 600); }, onFinal, body);
      } else {
        AsyncMethod(`home-carousel/${id}`, 'PUT', (resJson) => { console.log('home-carousel update response', resJson); refresh(); onFinal(); setTimeout(refresh, 600); }, onFinal, body);
      }
    }
  };

  // Eliminar item: DELETE /home-carousel/{id}
  const deleteHomecarousel = async (id: number | string) => {
    if (apiMode === 'legacy') {
      AsyncMethod('idhomecarousel', 'POST', (_json) => {
        // legacy delete performed by sending {id: <id>}
        AsyncMethod('homecarousel', 'GET', (json) => setLanding(json), () => {});
        const newMuteMap = { ...muteMap };
        delete newMuteMap[id];
        setMuteMap(newMuteMap);
      }, () => {}, { id: id });
    } else {
      AsyncMethod(`home-carousel/${id}`, 'DELETE', () => {
        AsyncMethod('home-carousel', 'GET', (json) => setLanding(json), () => {});
        const newMuteMap = { ...muteMap };
        delete newMuteMap[id];
        setMuteMap(newMuteMap);
      }, () => {}, {});
    }
  };

  const uSegments = async (arr: SegmentItem[]) => {
    AsyncMethod(
      "usegments",
      "POST",
      () => {},
      () => {},
      { arrorder: arr }
    );
  };

  // variable 'option' eliminada (no usada)
  // variable 'option' eliminada (no usada)
  return (
    <>
      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg("")} />
      )}
      <ComponentCard title="Home Landing">
      <Label>Tipo</Label>
      <div style={{ display: "flex", gap: "2rem", marginBottom: "1rem" }}>
        {tipoOptions.map((opt) => (
          <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="radio"
              name="tipo"
              value={opt.value}
              checked={tvalue === opt.value}
              onChange={() => setTvalue(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      <Label>Link</Label>
      <Input
        type="text"
        placeholder="Introducir link del tipo"
        onChange={(tl) => setTlink(tl.target.value)}
        value={tlink}
      />
      {/* Vista previa de video si tipo es Video y hay URL */}
      {tvalue === 0 && tlink.trim() !== "" && (
        <div style={{ margin: "1rem 0" }}>
          <Label>Vista previa video</Label>
          <video src={tlink} controls style={{ maxWidth: "100%", maxHeight: "300px" }} />
        </div>
      )}
      {/* Vista previa de video al editar (si editId y tvalue=0 y tlink) */}
      {editId !== null && tvalue === 0 && tlink.trim() !== "" && (
        <div style={{ margin: "1rem 0" }}>
          <Label>Vista previa video (edición)</Label>
          <video src={tlink} controls style={{ maxWidth: "100%", maxHeight: "300px" }} />
        </div>
      )}
      {/* Vista previa de imagen si tipo es Imagen y hay URL */}
      {tvalue === 1 && tlink.trim() !== "" && (
        <div style={{ margin: "1rem 0" }}>
          <Label>Vista previa imagen</Label>
          <img src={tlink} alt="Vista previa" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px" }} />
        </div>
      )}
      <Label>Link a redireccionar</Label>
      <Input
        type="text"
        placeholder="Link a redireccionar (opcional)"
        onChange={(l) => setLink(l.target.value)}
        value={link}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1rem 0" }}>
        <input
          type="checkbox"
          checked={muteNew}
          onChange={e => setMuteNew(e.target.checked)}
          style={{ transform: "scale(1.2)" }}
        />
        <Label>Mute (nuevo item)</Label>
      </div>
      <div style={{ textAlign: "right" }}>
        <Button onClick={() => {
          if (editId !== null) {
            saveHomecarousel(editId);
          } else {
            saveHomecarousel();
          }
        }}>{editId !== null ? "Actualizar" : "Guardar"}</Button>
        {editId !== null && (
          <Button variant="outline" size="sm" onClick={() => {
            setEditId(null);
            setLink("");
            setTlink("");
            setMuteNew(false);
            setTvalue(0);
          }}>Cancelar</Button>
        )}
      </div>
      <Table>
        <TableHeader className={LCTableClass.tblHeader}>
          <TableRow>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Tipo
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Link
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Link a Redireccionar
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Mute
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Acciones
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className={LCTableClass.tblBody}>
          {landing.map((item) => (
            <TableRow key={item.id}>
              <TableCell className={LCTableClass.tblCell}>
                {item.imgsrc == null ? "Video" : "Imagen"}
              </TableCell>
              <TableCell className={LCTableClass.tblCell}>
                {item.imgsrc == null ? item.video : item.imgsrc}
              </TableCell>
              <TableCell className={LCTableClass.tblCell}>{item.link}</TableCell>
              <TableCell className={LCTableClass.tblCell}>
                <input
                  type="checkbox"
                  checked={muteMap[item.id] ?? false}
                  onChange={e => {
                    setMuteMap({ ...muteMap, [item.id]: e.target.checked });
                  }}
                  style={{ transform: "scale(1.2)", marginRight: "0.5rem" }}
                />
              </TableCell>
              <TableCell className={LCTableClass.tblCell}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteHomecarousel(item.id)}
                >
                  Eliminar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditId(item.id);
                    setLink(item.link ?? "");
                    setTlink(item.imgsrc == null ? item.video ?? "" : item.imgsrc ?? "");
                    setMuteNew(muteMap[item.id] ?? false);
                    setTvalue(item.imgsrc == null ? 0 : 1);
                  }}
                >
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <h3>Ordenar Segmentos</h3>
      <Table>
        <TableHeader className={LCTableClass.tblHeader}>
          <TableRow>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Segmento
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Orden
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className={LCTableClass.tblBody}>
          {segments.map((s) => (
            <TableRow key={s.id}>
              <TableCell className={LCTableClass.tblCell}>{s.name}</TableCell>
              <TableCell className={LCTableClass.tblCell}>
                <Input
                  type="number"
                  value={s.order_}
                  onChange={(o) => (s.order_ = parseInt(o.target.value, 10) || 0)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div style={{ textAlign: "right" }}>
        <Button size="sm" onClick={() => uSegments(segments)}>
          Generar Orden
        </Button>
      </div>
      </ComponentCard>
    </>
  );
};

export default Lchome;
