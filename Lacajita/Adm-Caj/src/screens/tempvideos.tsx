import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
//import Seasons from "./seasons";

import Button from "../components/ui/button/Button";
import ComponentCard from "../components/common/ComponentCard";
import Select from "../components/form/Select";

import { AsyncMethod } from "../util/apiconnectionAsync";

const TempVideos = () => {
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [searchseas, setSearchseas] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [plid, setPlid] = useState("");
  const [loading, setLoading] = useState(true);
  const [sesionname, setSesioname] = useState("");

  useEffect(() => {
    AsyncMethod(
      "manplaylists",
      "GET",
      (json) => setPlaylist(json),
      () => {
        AsyncMethod(
          "seasons",
          "GET",
          (json) => setSeasons(json),
          () => {
            setLoading(false);
            if (plid != "") {
              setSearchseas([]);
              getPlaylistVideos(plid);
            }
          }
        );
      }
    );
  }, []);

  const config = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };

  //iuseasonvideos
  const insertUpdateSV = async (sid, arrv) => {
    setLoading(true);

    const params = { season_id: sid, videoarr: arrv };

    AsyncMethod(
      "iuseasonvideos",
      "POST",
      () => {},
      () => setLoading(false),
      params
    );
  };

  const getPlaylistVideos = async (plid) => {
    setLoading(true);
    setVideos([]);
    fetch(`https://cdn.jwplayer.com/v2/playlists/${plid}?format=json`)
      .then((response) => response.json())
      .then((json) => {
        const pl = json["playlist"];

        //add videos
        const vi = [];
        pl.map((l) => {
          vi.push({
            title: l["title"],
            mediaid: l["mediaid"],
            img: l["image"].split("?")[0],
            desc: l["description"],
          });
        });
        setVideos(vi);
      })
      .finally(() => {
        // console.log("New Seasons: ", JSON.stringify(seasons));
        setLoading(false);
      });
  };

  const opcplaylist = [];
  opcplaylist.push({
    value: "",
    label: "Seleccione Playlist",
    selected: false,
  });

  playlist.map((pl) =>
    opcplaylist.push({
      value: pl.id,
      label: pl.title,
      selected: String(plid) == String(pl.id) ? true : false,
    })
  );

  if (loading)
    return (
      <center>
        <h1>Loading...</h1>
      </center>
    );

  return (
    <ComponentCard title="Temporadas y Videos">
      <Select
        options={opcplaylist}
        onChange={(p) => {
          setPlid(p);
          getPlaylistVideos(p);
          setSearchseas([]);
        }}
      />
      <div>
        <table style={{ width: "100%" }}>
          <colgroup>
            <col style={{ width: "50%" }} />
            <col style={{ width: "50%" }} />
          </colgroup>
          <tr>
            <td style={{ verticalAlign: "top" }}>
              <h3>Videos</h3>
              {videos
                .filter((vv) => {
                  let exists = false;
                  seasons
                    .filter((ss) => ss.playlist_id == plid)
                    .map((s) => {
                      for (let sv = 0; sv < s.videos.length; sv++) {
                        if (s.videos[sv] == vv.mediaid) {
                          exists = true;
                        }
                      }
                    });

                  if (!exists) return vv;
                })
                .map((v) => {
                  return (
                    <div key={v.mediaid} style={styles.videodiv}>
                      <img style={styles.img} src={v.img} />
                      <h4 style={{ width: 250 }}>{v.title}</h4>
                      <Button
                        hidden={searchseas[0] == undefined ? true : false}
                        onClick={() => {
                          searchseas[0].videos.push(v.mediaid);
                          insertUpdateSV(
                            searchseas[0].id,
                            searchseas[0].videos
                          );
                        }}
                      >
                        Add to Season
                      </Button>
                    </div>
                  );
                })}
            </td>
            <td style={{ verticalAlign: "top" }}>
              <h3>Temporadas</h3>
              <Select
                style={{ width: "80%" }}
                onChange={(s) =>
                  setSearchseas(seasons.filter((se) => se.id == s))
                }
                options={[
                  {
                    value: 0,
                    label: "Seleccione Temporada",
                    selected: false,
                  },
                  ...seasons
                    .filter((ss) => ss.playlist_id == plid)
                    .map((s) => ({
                      value: s.id,
                      label: s.title,
                      selected:
                        searchseas[0] != undefined
                          ? searchseas[0].id == s.id
                            ? true
                            : false
                          : false,
                    })),
                ]}
                placeholder="Seleccionar Temporada"
              />
              <Button
                onClick={() =>
                  navigate("/lcseasons", {
                    state: { fromPage: "temporadasvideos", playid: plid },
                  })
                }
              >
                +
              </Button>
              <div>
                {searchseas.map((s) => {
                  return (
                    <div
                      style={{
                        backgroundColor: "#808080",
                        padding: 5,
                      }}
                    >
                      {videos.map((v) => {
                        for (let sv = 0; sv < s.videos.length; sv++) {
                          if (v.mediaid == s.videos[sv])
                            return (
                              <center>
                                <div key={v.mediaid} style={styles.videodiv2}>
                                  <img style={styles.img} src={v.img} />
                                  <h4 style={{ width: 250 }}>{v.title}</h4>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      insertUpdateSV(
                                        s.id,
                                        searchseas[0].videos.filter(
                                          (vv) => vv != v.mediaid
                                        )
                                      );

                                      s.videos = s.videos.filter(
                                        (vi) => vi != v.mediaid
                                      );
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </center>
                            );
                        }
                      })}
                    </div>
                  );
                })}
              </div>
            </td>
          </tr>
        </table>
      </div>
    </ComponentCard>
  );
};

export default TempVideos;

const styles = {
  img: {
    width: 250,
    height: 150,
    borderRadius: 5,
  },
  videodiv: {
    borderColor: "#ceceec",
    borderWidth: 1,
    borderStyle: "solid",
    padding: 10,
    borderRadius: 5,
    width: "fit-content",
  },
  videodiv2: {
    borderColor: "#ceceec",
    borderWidth: 1,
    borderStyle: "solid",
    padding: 10,
    borderRadius: 5,
    width: "fit-content",
    backgroundColor: "#fff",
    marginBottom: 10,
  },
};
