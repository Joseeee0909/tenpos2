import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai'; // SDK oficial actualizado

const prisma = new PrismaClient();
// Inicializa Gemini usando la variable de entorno
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Reglas de durabilidad basadas en tus categorías reales de MateriaPrima
const REGLAS_CADUCIDAD_MP = {
  "Proteina": { diasMaxBodega: 3, tipo: "Altamente Perecedero" },
  "Lacteos": { diasMaxBodega: 7, tipo: "Perecedero" },
  "Verduras": { diasMaxBodega: 5, tipo: "Perecedero" },
  "Frutas": { diasMaxBodega: 6, tipo: "Perecedero" },
  "Abarrotes": { diasMaxBodega: 90, tipo: "No Perecedero" },   // Arroz, sal, etc.
  "Insumos": { diasMaxBodega: 180, tipo: "No Perecedero" },   // Empaques, servilletas
  "Limpieza": { diasMaxBodega: 365, tipo: "No Perecedero" },  // Jabón, desinfectantes
  "Otro": { diasMaxBodega: 30, tipo: "General" }
};

class IaAnalyticsService {
  async generarAnalisisMateriaPrima(empresaId) {
    // 1. Obtener los ítems vendidos en los últimos 7 días
    const haceSieteDias = new Date();
    haceSieteDias.setDate(haceSieteDias.getDate() - 7);

    const ventasProductos = await prisma.ventaItem.groupBy({
      by: ['productoId'],
      _sum: { cantidad: true },
      where: {
        venta: { empresaId, estado: 'completada', fecha: { gte: haceSieteDias } }
      }
    });

    // 2. Mapear consumo de Materia Prima multiplicando platos vendidos por su Receta
    const consumosMateriaPrimaDia = {}; // { [materiaPrimaId]: consumoDiarioPromedio }

    for (const venta of ventasProductos) {
      if (!venta.productoId) continue;
      const cantidadPlatosVendidos = venta._sum.cantidad || 0;

      // Buscar los ingredientes de este plato
      const recetas = await prisma.receta.findMany({
        where: { productoId: venta.productoId, empresaId }
      });

      // Calcular el gasto total de cada ingrediente
      recetas.forEach(receta => {
        const totalIngredienteUsado = Number(receta.cantidad) * cantidadPlatosVendidos;
        const promedioDiario = totalIngredienteUsado / 7;

        if (!consumosMateriaPrimaDia[receta.materiaPrimaId]) {
          consumosMateriaPrimaDia[receta.materiaPrimaId] = 0;
        }
        consumosMateriaPrimaDia[receta.materiaPrimaId] += promedioDiario;
      });
    }

    // 3. Traer el inventario físico actual de Materia Prima
    const materiasPrimas = await prisma.materiaPrima.findMany({
      where: { empresaId, disponible: true },
      select: { id: true, nombre: true, idMateriaPrima: true, stock: true, categoria: true, unidad: true }
    });

    // 4. Cruzar stock de ingredientes con su velocidad de consumo y caducidad
    let materiasAnalizadas = [];
    let alertasMermas = [];
    let criticos = 0, bajo = 0, normal = 0;

    materiasPrimas.forEach(mp => {
      const promedioDiario = consumosMateriaPrimaDia[mp.id] || 0;
      const stockActual = mp.stock;

      // Buscar la regla usando tus categorías exactas. Si no existe, cae en "Otro"
      const regla = REGLAS_CADUCIDAD_MP[mp.categoria] || REGLAS_CADUCIDAD_MP["Otro"];

      let diasParaAgotar = promedioDiario > 0 ? stockActual / promedioDiario : 999;

      // Lógica de alertas por desabastecimiento (Stock Crítico / Bajo)
      if (promedioDiario > 0 && diasParaAgotar <= 2) criticos++;
      else if (promedioDiario > 0 && diasParaAgotar <= 5) bajo++;
      else normal++;

      let enRiesgoDeVencer = false;
      let cantidadEnRiesgo = 0;
      let motivoAlerta = "";

      if (promedioDiario > 0 && diasParaAgotar > regla.diasMaxBodega) {
        if (regla.tipo === "Altamente Perecedero" || regla.tipo === "Perecedero") {
          // Alerta de descomposición física para Proteina, Lacteos, Verduras, Frutas
          enRiesgoDeVencer = true;
          const consumoEstimadoVidaUtil = promedioDiario * regla.diasMaxBodega;
          cantidadEnRiesgo = Math.max(0, Math.ceil(stockActual - consumoEstimadoVidaUtil));
          motivoAlerta = `Riesgo de descomposición: Se proyecta perder ${cantidadEnRiesgo} ${mp.unidad} antes de vencer.`;
        } else if (diasParaAgotar > 120) {
          // Alerta de Capital Estancado para Abarrotes, Insumos, Limpieza
          enRiesgoDeVencer = true; 
          cantidadEnRiesgo = Math.ceil(stockActual - (promedioDiario * 30)); // Exceso sobre un mes de uso
          motivoAlerta = `Sobreabastecimiento crítico: Tienes stock de ${mp.categoria.toLowerCase()} para más de 4 meses. Capital retenido.`;
        }
      }

      const infoMp = {
        id: mp.idMateriaPrima,
        nombre: mp.nombre,
        categoria: mp.categoria,
        stock_actual: `${stockActual} ${mp.unidad}`,
        consumo_diario: `${promedioDiario.toFixed(2)} ${mp.unidad}/día`,
        dias_restantes: diasParaAgotar === 999 ? "Sin rotación" : Math.ceil(diasParaAgotar),
        riesgo_merma: enRiesgoDeVencer,
        cantidad_riesgo: cantidadEnRiesgo,
        mensaje_alerta: motivoAlerta
      };

      materiasAnalizadas.push(infoMp);
      if (enRiesgoDeVencer && cantidadEnRiesgo > 0) {
        alertasMermas.push(infoMp);
      }
    });

    // --- 5. LA IA (GEMINI) PROCESA LOS INGREDIENTES EN RIESGO ---
    let analiticaIA = "No hay suficientes datos de materias primas para procesar con inteligencia artificial.";

    if (materiasAnalizadas.length > 0) {
      try {
        const prompt = `
          Eres el asistente analítico de TenPos. Analiza el inventario de MATERIAS PRIMAS de un restaurante.
          
          ALERTAS DE INGREDIENTES EN RIESGO DE DAÑARSE (Exceso de stock vs días de frescura):
          ${JSON.stringify(alertasMermas, null, 2)}
          
          ESTADO GENERAL DE LA BODEGA (Ingredientes, consumos y días restantes):
          ${JSON.stringify(materiasAnalizadas.slice(0, 15), null, 2)}
          
          Por favor, redacta un informe de IA gerencial estructurado para el administrador:
          1. [ALERTAS CRÍTICAS] Qué materia prima perecedera (carnes, verduras) se va a podrir si no se usa ya.
          2. [ACCION DE COCINA] Sugiere qué platos del menú (basándote en los nombres de los ingredientes en riesgo) debería priorizar el chef o qué promociones lanzar para evacuar ese inventario.
          3. [ABARROTES] Evalúa si ingredientes de larga duración (como el arroz o licores) están sobre-estoqueados innecesariamente restando liquidez al negocio.
        `;

        // CORRECCIÓN AQUÍ: Sintaxis oficial adaptada para @google/genai
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });

        // Extraemos el texto de la respuesta de Gemini
        analiticaIA = response.text;
      } catch (error) {
        console.error("Gemini AI Error:", error);
        analiticaIA = "Cálculo analítico finalizado matemáticamente. Se sugiere revisar manualmente el inventario de proteínas en el módulo físico.";
      }
    }

    // 6. Respuesta limpia para el Frontend
    return {
      resumen_cards: {
        productos_activos: materiasPrimas.length, 
        stock_normal: normal,
        stock_bajo: bajo,
        criticos: criticos
      },
      alertas_mermas: alertasMermas.map(m => ({
        sku: m.id,
        producto: m.nombre,
        categoria: m.categoria,
        mensaje: m.mensaje_alerta || `Peligro de vencimiento: Se proyecta perder ${m.cantidad_riesgo} unidades.`
      })),
      analisis_ia_texto: analiticaIA,
      inventario_completo: materiasAnalizadas
    };
  }
}

export default new IaAnalyticsService();