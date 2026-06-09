export const buildPurchaseOrder = (quantities, inventario) => {
  return Object.entries(quantities)
    .filter(([_, qty]) => Number(qty) > 0)
    .map(([id, qty]) => {
      const producto = inventario?.find(
        (item) => String(item.id) === String(id)
      );

      return {
        id,
        nombre: producto?.nombre || "Desconocido",
        categoria: producto?.categoria || "",
        cantidad: Number(qty)
      };
    });
};