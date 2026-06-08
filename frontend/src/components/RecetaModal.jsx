import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function RecetaModal({ open, onClose, producto }) {
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [itemsReceta, setItemsReceta] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!open || !producto?.id) return;

    const loadData = async () => {
      try {
        const [resReceta, resMP] = await Promise.all([
          fetch(`${API_URL}/recetas/${producto.id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          fetch(`${API_URL}/materias-primas`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ]);

        const dataReceta = await resReceta.json();
        const dataMP = await resMP.json();

        setMateriasPrimas(dataMP.MateriasPrimas || []);

        if (dataReceta.receta?.length) {
          setItemsReceta(
            dataReceta.receta.map((r) => ({
              id: r.id,
              materiaPrimaId: r.materiaPrimaId,
              cantidad: r.cantidad
            }))
          );
        } else {
          setItemsReceta([
            {
              id: "",
              cantidad: ""
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [open, producto?.id]);

  const updateItem = (index, field, value) => {
    setItemsReceta((prev) => {
      const copy = [...prev];

      copy[index] = {
        ...copy[index],
        [field]: value
      };

      return copy;
    });
  };

  const addItem = () => {
    setItemsReceta((prev) => [
      ...prev,
      {
        id: "",
        cantidad: ""
      }
    ]);
  };

  const removeItem = (index) => {
    setItemsReceta((prev) => {
      if (prev.length === 1) {
        return [
          {
            id: "",
            cantidad: ""
          }
        ];
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const saveReceta = async () => {
    try {
      const ingredientes = itemsReceta.filter(
        (i) =>
          i.materiaPrimaId &&
          Number(i.cantidad) > 0
      );

      if (!ingredientes.length) {
        alert("Debes agregar al menos un ingrediente");
        return;
      }

      const payload = {
        productoId: producto.id,
        ingredientes
      };
      
      const res = await fetch(
        `${API_URL}/recetas/${producto.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ingredientes
          })
        }
      );

      if (!res.ok) {
        throw new Error("Error guardando receta");
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert("Error guardando receta");
    }
  };

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="mbox receta-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mhead">
          <span className="mtitle">
            Receta de {producto?.nombre}
          </span>

          <button
            className="mclose"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="mbody">
          <div className="recipe-header">
            <span>Materia Prima</span>
            <span>Cantidad</span>
            <span></span>
          </div>

          {itemsReceta.map((item, index) => (
            <div
              key={index}
              className="recipe-row"
            >
              <select
              className="fselect" 
              value={item.materiaPrimaId}
              onChange={(e) =>
                updateItem(
                  index,
                  "materiaPrimaId",
                  e.target.value
                )
              }
            >
              <option value="">
                Selecciona...
              </option>

              {materiasPrimas.map((mp) => (
                <option
                  key={mp.id}
                  value={mp.id}
                >
                  {mp.nombre}
                </option>
              ))}
            </select>

              <input
                type="number"
                min="0"
                className="finput"
                value={item.cantidad}
                onChange={(e) =>
                  updateItem(
                    index,
                    "cantidad",
                    e.target.value
                  )
                }
              />

              <button
                type="button"
                className="recipe-delete"
                onClick={() =>
                  removeItem(index)
                }
              >
                🗑
              </button>
            </div>
          ))}

          <button
            type="button"
            className="recipe-add"
            onClick={addItem}
          >
            + Agregar ingrediente
          </button>
        </div>

        <div className="mfooter">
          <button
            className="mf-cancel"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="mf-save"
            onClick={saveReceta}
          >
            Guardar receta
          </button>
        </div>
      </div>
    </div>
  );
}