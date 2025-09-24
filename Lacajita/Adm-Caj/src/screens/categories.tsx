import { useEffect, useState } from "react";
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
import { AsyncMethod } from "../util/apiconnectionAsync";
import Toast from "../components/ui/Toast";

type CategoryItem = { id: number | string; name: string; hascat?: number };

const Categories = () => {
  const [cat, setCat] = useState<CategoryItem[]>([]);
  const [name, setName] = useState("");
  const [id, setId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  // Nota: las operaciones POST usan AsyncMethod que configura headers automáticamente

  useEffect(() => {
    AsyncMethod(
      "categories",
      "GET",
      (json) => { setCat(json as CategoryItem[]); },
      () => setLoading(false)
    );
  }, []);

  const clearCat = () => {
    setName("");
    setId(0);
  };

  const setInsert = async (name: string, id: number | string = 0) => {
    AsyncMethod(
      "icategory",
      "POST",
      (res) => {
        setToastMsg(res?.msg || "Guardado");
        AsyncMethod('categories','GET',(json)=>setCat(json as CategoryItem[]),()=>{});
      },
      () => { clearCat(); },
      { name: name, id: id }
    );
  };

  const setDelete = async (id: number | string) => {
    const confi = confirm("¿Quieres eliminar la categoria?");

    if (confi) {
      AsyncMethod(
        "dcategory",
        "POST",
        (res) => { setToastMsg(res?.msg || "Eliminada");
                   // refrescar listado
                   AsyncMethod('categories','GET',(json)=>setCat(json as CategoryItem[]),()=>{});
                 },
        () => { clearCat(); },
        { id: id }
      );
    }
  };

  if (loading) return <h1>Por favor espere...</h1>;

  return (
    <ComponentCard title="Categorias">
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}
      <Input
        type="text"
        placeholder="Input Task"
        //value={taskInput}
        onChange={(e) => {
          setName(e.target.value);
          // if (key === "Enter") addTask();
        }}
        value={name}
      />
      <div style={{ textAlign: "right" }}>
        <Button onClick={() => setInsert(name, id)}>Guardar</Button>
        {id > 0 && <Button onClick={() => clearCat()}>Nueva Categoria</Button>}
      </div>
      <Table>
        <TableHeader className={LCTableClass.tblHeader}>
          <TableRow>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Nombre
            </TableCell>
            <TableCell className={LCTableClass.tblHeaderCell} isHeader>
              Acciones
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className={LCTableClass.tblBody}>
          {cat.map((t) => {
            return (
              <TableRow key={t.id}>
                <TableCell className={LCTableClass.tblCell}>{t.name}</TableCell>
                <TableCell className={LCTableClass.tblCell}>
                  {
                    <div>
                      <Button
                        onClick={() => {
                          setName(t.name);
                          setId(Number(t.id));
                        }}
                      >
                        Edit
                      </Button>
                      {t.hascat == 0 && (
                        <Button onClick={() => setDelete(t.id)}>Delete</Button>
                      )}
                    </div>
                  }
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ComponentCard>
  );
};

export default Categories;
