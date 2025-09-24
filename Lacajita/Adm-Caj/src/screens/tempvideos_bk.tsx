import { useState, useEffect } from "react";
import { apiUrl } from "../util/apiconnection";

const TempVideos = () => {
  const [videos, setVideos] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [plid, setPlid] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("manplaylists"))
      .then((res) => res.json())
      .then((json) => setPlaylist(json))
      .finally(async () => {
        fetch(apiUrl("seasons"))
          .then((res) => res.json())
          .then((json) => setSeasons(json))
          .finally(() => setLoading(false));
      });
  }, []);

  //iuseasonvideos
  const insertUpdateSV = async (sid, arrv) => {
    setLoading(true);
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season_id: sid, videosarr: arrv }),
    };
    await fetch(apiUrl("iuseasonvideos"), config)
      .then((res) => res.json())
      .then((json) => alert(json.msg))
      .finally(() => setLoading(false));
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

        /* seasons.map((s) => {
          if (s.playlist_id == plid) {
            const vid = [];
            for (let v = 0; v < s.videos.length; v++) {
              pl.map((l) => {
                if (l["mediaid"] == s.videos[v])
                  vid.push({
                    title: l["title"],
                    mediaid: l["mediaid"],
                    img: l["image"].split("?")[0],
                    desc: l["description"],
                  });
              });
            }

            s["arrvideos"] = vid;
          }
        });

        setSeasons(seasons);*/
      })
      .finally(() => {
        console.log("New Seasons: ", JSON.stringify(seasons));
        setLoading(false);
      });
  };

  if (loading)
    return (
      <center>
        <h1>Loading...</h1>
      </center>
    );

  return (
    <div className="task-form">
      <select
        onChange={(p) => {
          setPlid(p.target.value);
          getPlaylistVideos(p.target.value);
        }}
      >
        <option value="">Seleccionar Playlist</option>
        {playlist.map((pl) => (
          <option value={pl.id} selected={pl.id == plid ? true : false}>
            {pl.title}
          </option>
        ))}
      </select>
      <button>Añadir Nueva Temporada</button>
      <div>
        <input
          type="text"
          style={{ width: "60%" }}
          placeholder="Introduzca la temporada"
        />
        <button>Agregar Temporada</button>
        <button>Cancelar</button>
      </div>
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
                      <h4 style={{ width: 250 }}>
                        {v.title + " id: " + v.mediaid}
                      </h4>
                      <button>Add to Season</button>
                    </div>
                  );
                })}
            </td>
            <td style={{ verticalAlign: "top" }}>
              <h3>Temporadas</h3>
              <div>
                {seasons
                  .filter((ss) => ss.playlist_id == plid)
                  .map((s) => {
                    return (
                      <div
                        style={{
                          backgroundColor: "#808080",
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: "#000",
                            color: "#fff",
                            padding: 10,
                            marginBottom: 5,
                          }}
                        >
                          <h3>{s.title}</h3>
                        </div>
                        {videos.map((v) => {
                          for (let sv = 0; sv < s.videos.length; sv++) {
                            console.log("video id: ", s.videos[sv]);
                            if (v.mediaid == s.videos[sv])
                              return (
                                <center>
                                  <div style={styles.videodiv2}>
                                    <img style={styles.img} src={v.img} />
                                    <h4 style={{ width: 250 }}>{v.title}</h4>
                                    <button>Remove</button>
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
    </div>
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
