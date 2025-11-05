import axios from "axios";

const API_URL = "http://localhost:4000/api"; // tu backend

export const getProductos = async () => {
  const res = await axios.get(`${API_URL}/productos`);
  return res.data;
};
