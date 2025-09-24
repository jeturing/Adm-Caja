import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

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

type PlaylistItem = { id: string | number; title: string };
type SeasonItem = {
  id: string | number;
  title: string;
  playlist_id: string | number;
  videos?: Array<unknown>;
};

const Seasons = () => {
  const location = useLocation();

  const { playid } = location.state || {};

  const [seasonname, setSeasoname] = useState("");
  const [plid, setPlid] = useState<string>(playid ? String(playid) : "");
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [sid, setSid] = useState(0);

  useEffect(() => {
    AsyncMethod(
      "seasons",
      "GET",
  (json) => setSeasons(json as SeasonItem[]),
      () => setLoading(false)
    );
  }, []);

  const getPlaylist = async () => {
    AsyncMethod(
      "manplaylists",
      "GET",
  (json) => setPlaylist(json as PlaylistItem[]),
      () => setLoading(false)
    );
  };

  useEffect(() => {
    getPlaylist();
  }, []);
  //getPlaylist();

  const iudSeason = async (sname: string, id: number | string = 0, del = false) => {
    if (sname != "") {
      setLoading(true);
      const params = {
        playlist_id: plid ? parseInt(plid) : 0,
        name: sname,
        id: id,
        delete: del,
      };

      AsyncMethod(
        "iuseason",
        "POST",
        (json) => {
          json.error != undefined
            ? alert(json.error)
            : console.log("Proccess success!");
        },
        () => {
          clearSeason();
          setLoading(false);
        },
        params
      );
    }
  };

  const clearSeason = () => {
    setSeasoname("");
    setSid(0);
  };

  const opcplaylist = [];
  opcplaylist.push({
    value: "",
    label: "Seleccione Playlist",
    selected: false,
  });
  playlist.map((pl) =>
    opcplaylist.push({
      value: String(pl.id),
      label: (pl as PlaylistItem).title,
      selected: plid == String(pl.id) ? true : false,
    })
  );

  if (loading) return <h1>Favor espere...</h1>;

  return (
    <ComponentCard title="Temporadas">
      <Select options={opcplaylist} onChange={(p) => setPlid(p)} />
      <Input
        type="text"
        className="w-3/5"
        placeholder="Introduzca la temporada"
        onChange={(e) => setSeasoname(e.target.value)}
        value={seasonname}
      />
      <Button onClick={() => iudSeason(seasonname, sid)}>Guardar</Button>
      {sid > 0 && (
        <Button onClick={() => clearSeason()}>Crear Nueva</Button>
      )}
      <Table>
        <TableHeader className={LCTableClass.tblHeader}>
          <TableRow>
            <TableCell isHeader className={LCTableClass.tblHeaderCell}>
              Temporada
            </TableCell>
            <TableCell isHeader className={LCTableClass.tblHeaderCell}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className={LCTableClass.tblBody}>
          {seasons
            .filter((s) => String(s.playlist_id) === plid)
            .map((ss) => {
              return (
                <TableRow key={String(ss.id)}>
                  <TableCell className={LCTableClass.tblCell}>
                    {(ss as SeasonItem).title}
                  </TableCell>
                  <TableCell className={`${LCTableClass.tblCell} text-right`}>
                    <Button
                      onClick={() => {
                        setSeasoname((ss as SeasonItem).title);
                        setSid(Number(ss.id));
                      }}
                    >
                      Editar
                    </Button>
                    {(ss.videos?.length ?? 0) === 0 && (
                      <Button
                        onClick={() => {
                          let conf = confirm("¿Quieres eliminar la temporada?");
                          if (conf) iudSeason("d", ss.id, true);
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

export default Seasons;
