import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableCell,
  TableRow,
  TableBody,
} from "../components/ui/table";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import ComponentCard from "../components/common/ComponentCard";
import LCTableClass from "../lccomponents/LCTableClass";
import Select from "../components/form/Select";

import { AsyncMethod } from "../util/apiconnectionAsync";

type PlaylistRow = { id: string | number; title: string; segment: string; active: number; categories: Array<{id: number|string; name: string}>; segment_id: number };
type SegmentRow = { id: number | string; name: string };
type CategoryRow = { id: number | string; name: string };
type SelectedCategory = { id: number | string; name: string };

const Playlist = () => {
  const [cate, setCate] = useState<SelectedCategory[]>([]);
  const [plid, setPlid] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [segid, setSegid] = useState<number>(0);
  const [load, setLoad] = useState(true);

  const [catid, setCatid] = useState<SelectedCategory>({} as SelectedCategory);

  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    AsyncMethod(
      "manplaylists",
      "GET",
  (json) => setPlaylists(json as PlaylistRow[]),
      () => {}
    );
  }, []);

  /*const config = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };*/

  const iuPlaylist = async () => {
    const categs: number[] = [];

    cate.map((c) => categs.push(parseInt(String(c["id"]))));

    if (plid == "" || title == "" || segid == 0) {
      alert("Titulo, Id y Segmento son obligatorios!");
      return;
    }

    const params = {
      id: plid,
  segid: segid,
      img: "",
      title: title,
      categories: categs,
    };

    AsyncMethod(
      "uiplaylist",
      "POST",
      (json) => alert(json.msg),
      () => clearAll(),
      params
    );
  };

  const addCate = () => {
    if ((catid as SelectedCategory).id && Number((catid as SelectedCategory).id) > 0) setCate([...cate, catid]);
  };

  //const categories = [];

  const fillSegmentsCat = async () => {
    //segments[0] = [];
    //categories[0] = [];

    AsyncMethod(
      "segments",
      "GET",
    (json) => setSegments(json as SegmentRow[]),
      () => {
        AsyncMethod(
          "categories",
          "GET",
      (json) => setCategories(json as CategoryRow[]),
          () => setLoad(false)
        );
      }
    );

    /*await fetch(apiUrl("segments"))
      .then((res) => res.json())
      .then((json) => {
        setSegments(json);
        console.log(segments);
      })
      .finally(async () => {
        await fetch(apiUrl("categories"))
          .then((res) => res.json())
          .then((json) => setCategories(json))
          .finally(() => {
            setLoad(false);
          });
      });*/
  };

  useEffect(() => {
    fillSegmentsCat();
  }, []);

  const delPlaylist = async (pid: number | string) => {
    //config["body"] = JSON.stringify({ id: pid });
    //await fetch(apiUrl("dplaylist"), config).finally(() => {});
    AsyncMethod(
      "dplaylist",
      "POST",
      () => {},
      () => {},
      { id: pid }
    );
  };

  const clearAll = () => {
    setTitle("");
    setPlid("");
    setSegid(0);
    setCate([]);
  };

  const opccategories: Array<{value: string; label: string; selected: boolean}> = [];

  categories.map((c) => opccategories.push({ value: String(c.id), label: c.name, selected: false }));

  if (load) return <h1>Please Wait...</h1>;

  return (
    <ComponentCard title="Playlists">
      <Input
        type="text"
        placeholder="Playlist Id"
        value={plid}
        onChange={(pid) => setPlid(pid.target.value)}
      />
      <Input
        type="text"
        placeholder="Título"
        value={title}
        onChange={(title) => setTitle(title.target.value)}
      />
      <Select
        className="dark:bg-dark-900"
        onChange={(e) => setSegid(parseInt(e, 10))}
        options={segments.map((s) => ({
          value: String(s.id),
          label: s.name,
          selected: String(s.id) == String(segid) ? true : false,
        }))}
        placeholder="Seleccione el Segmento"
      />
      {
        //
      }
      <Select
    onChange={(c) => {
          setCatid({
      id: c,
      name: opccategories.filter((oc) => oc.value == c)[0]?.label || "",
          });
        }}
        options={opccategories}
        placeholder="Seleccione la Categoria"
        className="dark:bg-dark-900"
      />
    <Button onClick={() => addCate()}>
        + Categoria
      </Button>
      <Table>
        <TableHeader className={LCTableClass.tblHeader}>
          <TableRow>
            <TableCell className={LCTableClass.tblHeaderCell}>Nombre</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className={LCTableClass.tblBody}>
      {cate.map((t) => {
            return (
        <TableRow key={String(t.id)}>
                <TableCell className={LCTableClass.tblCell}>{t.name}</TableCell>
                <TableCell className={LCTableClass.tblCell}>
                  <Button
                    onClick={() => setCate(cate.filter((c) => c.id != t.id))}
                  >
                    Desvincular
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div style={{ alignItems: "right", flex: 1, width: "100%" }}>
        <table style={{ width: "fit-content", flex: 1 }}>
          <tbody>
            <tr>
              <td>
                <Button onClick={() => iuPlaylist()}>Guardar Cambios</Button>
              </td>
              <td style={{ display: plid != "" ? "block" : "none" }}>
                <Button
                  onClick={() => {
                    clearAll();
                  }}
                >
                  Nueva Playlist
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Table>
        <TableHeader className={LCTableClass.tblHeader}>
          <TableRow>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Id
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Título
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Segmento
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Activo
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Acciones
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className={LCTableClass.tblBody}>
      {playlists.map((t) => {
            return (
        <TableRow key={String(t.id)} className="completed">
                <TableCell className={LCTableClass.tblCell}>{t.id}</TableCell>
                <TableCell className={LCTableClass.tblCell}>
                  {t.title}
                </TableCell>
                <TableCell className={LCTableClass.tblCell}>
                  {t.segment}
                </TableCell>
                <TableCell className={LCTableClass.tblCell}>
                  {t.active === 1 ? "SI" : "NO"}
                </TableCell>
                <TableCell className={LCTableClass.tblCell}>
                  <Button
                    onClick={() => {
                      setCate(t.categories);
                      setTitle(t.title);
            setPlid(String(t.id));
            setSegid(Number(t.segment_id));
                    }}
                  >
                    Edit
                  </Button>
          {t.categories.length === 0 && (
          <Button
                    onClick={() => {
                      const question = confirm(
                        "¿Quieres eliminar el playlist?"
                      );
            if (question) delPlaylist(t.id);
                    }}
                  >
                    Eliminar
                  </Button>
          )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ComponentCard>
  );
};

export default Playlist;
