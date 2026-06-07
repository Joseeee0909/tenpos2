export const toCurrency = (value) =>
  `$${Math.round(Number(value || 0)).toLocaleString('es-CO')}`;

export const formatClock = (value) => {
  const date = new Date(value || Date.now());
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const categoryEmoji = {
  comida: '🍛',
  bebidas: '🥤',
  bebida: '🥤',
  entradas: '🥟',
  postres: '🍰',
  postre: '🍰',
  otro: '🍽️'
};

export const getCategoryEmoji = (category) => {
  const key = String(category || '').toLowerCase();
  return categoryEmoji[key] || categoryEmoji.otro;
};
