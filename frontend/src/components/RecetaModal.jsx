import { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL;

export default function RecetaModal({ open, onClose, producto }) {
  const [receta, setReceta] = useState([]);
  const [materiasPrimas, setMateriasPrimas] = useState([]);

  const [itemsReceta, setItemsReceta] = useState([
    { materiaPrimaId: "", cantidad: "" }
  ]);
  const token = localStorage.getItem("token");

  // ---------------------------
  // LOAD DATA
  // ---------------------------
  useEffect(() => {
    if (!open || !producto?.id) return;

    const loadData = async () => {
      try {
        const resReceta = await fetch(`${API_URL}/recetas/${producto.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataReceta = await resReceta.json();

        const resMP = await fetch(`${API_URL}/materias-primas`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const dataMP = await resMP.json();

        setReceta(dataReceta.receta || []);
        setMateriasPrimas(dataMP.MateriasPrimas || []);
      } catch (err) {
        console.error("Error cargando datos del modal:", err);
      }
    };

    loadData();
  }, [open, producto?.id]);

  // ---------------------------
  // HELPERS
  // ---------------------------
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
    setItemsReceta((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, { materiaPrimaId: "", cantidad: "" }];
    });
  };

  const removeItem = (index) => {
    setItemsReceta((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  // ---------------------------
  // SAVE
  // ---------------------------
  const saveReceta = async () => {
    try {
      const ingredientes = itemsReceta.filter(
        (i) => i.materiaPrimaId && i.cantidad
      );

      const payload = {
        productoId: producto.id,
        ingredientes
      };

      await fetch(`${API_URL}/recetas`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      // reload receta
      const res = await fetch(`${API_URL}/recetas/${producto.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReceta(data.receta || []);

      setItemsReceta([{ materiaPrimaId: "", cantidad: "" }]);
    } catch (err) {
      console.error("Error guardando receta:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
    <div className="mbox" onClick={(e) => e.stopPropagation()}>

      {/* HEADER */}
      <div className="mhead">
        <span className="mtitle">
          Receta de {producto?.nombre}
        </span>
        <button className="mclose" onClick={onClose}>×</button>
      </div>

      {/* BODY */}
      <div className="mbody">
        <div>
          <h4>Receta actual</h4>

          {receta.length === 0 ? (
            <p style={{ opacity: 0.6 }}>
              Este producto aún no tiene receta.
            </p>
          ) : (
            <ul>
              {receta.map((r) => (
                <li key={r.id}>
                  {r.materiasPrimas?.nombre} - {r.cantidad} {r.materiasPrimas?.unidad}
                </li>
              ))}
            </ul>
          )}
        </div>

        <hr style={{ margin: "12px 0" }} />

        {/* FORM */}
        <div>
          <h4>Agregar ingredientes</h4>
          <br />

          {itemsReceta.map((item, index) => (
            <div className="form-2" key={index}>

              {/* SELECT */}
              <div>
                <label className="form-lbl">Materia Prima</label>
                <select
                  className="fselect"
                  value={item.materiaPrimaId}
                  onChange={(e) =>
                    updateItem(index, "materiaPrimaId", e.target.value)
                  }
                >
                  <option value="">Selecciona...</option>
                  {materiasPrimas.map((mp) => (
                    <option
                      key={mp.idMateriaPrima || mp.id}
                      value={mp.idMateriaPrima || mp.id}
                    >
                      {mp.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* CANTIDAD */}
              <div>
                <label className="form-lbl">Cantidad</label>
                <input
                  className="finput"
                  type="number"
                  value={item.cantidad}
                  onChange={(e) =>
                    updateItem(index, "cantidad", e.target.value)
                  }
                />
              </div>

              {/* BOTONES */}
              <button
                type="button"
                className="act-btn"
                onClick={addItem}
              >
                +
              </button>

              <button
                type="button"
                className="act-btn"
                onClick={() => removeItem(index)}
              >
                −
              </button>

            </div>
          ))}
        </div>

      </div>

      {/* FOOTER */}
      <div className="mfooter">
        <button className="mf-cancel" onClick={onClose}>
          Cancelar
        </button>

        <button className="mf-save" onClick={saveReceta}>
          Guardar receta
        </button>
      </div>

    </div>
    </div>
  );
}