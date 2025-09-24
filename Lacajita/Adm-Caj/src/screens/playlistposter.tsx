import { useEffect, useState } from "react";
import { AsyncMethod } from "../util/apiconnectionAsync";
import { apiUrl } from "../util/apiconnection";

import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import ComponentCard from "../components/common/ComponentCard";
import Select from "../components/form/Select";

// Token de Auth0 se almacena en localStorage como 'authToken'

const PlaylistPoster = () => {
  const [plid, setPlid] = useState("");
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState([]);
  const [img, setImg] = useState(null);
  const [lsimg, setLsimg] = useState(<img src="" />);

  const getPlaylist = async () => {
    AsyncMethod(
      "manplaylists",
      "GET",
      (json) => setPlaylist(json),
      () => {
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    getPlaylist();
  }, []);
  //getPlaylist();

  const setImgSelected = (e) => {
    setImg(e.target.files[0]);
  };

  const sendImg = async (e) => {
    e.preventDefault();
    if (plid != "") {
      setLoading(true);
      const form = new FormData();
      form.append("file", img);
      form.append("plid", plid);

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const configuration: RequestInit = {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: form,
      };

      await fetch(apiUrl("upload-image"), configuration)
        .then((res) => res.json())
        .then((json) => alert(json.msg))
        .finally(() => setLoading(false));
    }
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
      selected: plid == pl.id ? true : false,
    })
  );

  const getSelectedImg = async (p) => {
    setPlid(p);
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const configuration: RequestInit = {
      method: "GET",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };

    await fetch(apiUrl(`images/${p}.jpeg`), configuration)
      .then((res) => res)
      .then((imgsrc) =>
        setLsimg(
          <img
            style={{
              height: 350,
              borderRadius: 5,
              borderWidth: 1,
              borderColor: "#cecece",
            }}
            src={imgsrc.url}
          />
        )
      )
      .finally(() => console.log("Final proccess..."));
  };

  if (loading) return <h1>Favor espere...</h1>;

  return (
    <ComponentCard>
      <form onSubmit={sendImg} className="task-form">
        <Select onChange={(p) => getSelectedImg(p)} options={opcplaylist} />
        <Input
          type="file"
          placeholder="Seleccione la imagen"
          onChange={setImgSelected}
          accept="image/jpeg"
          required={true}
          style={{ width: "80%" }}
        />
        <Button type="submit">Guardar</Button>
        <div>{lsimg}</div>
      </form>
    </ComponentCard>
  );
};

export default PlaylistPoster;
