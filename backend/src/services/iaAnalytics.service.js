import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Reglas de durabilidad aplicadas directamente a las CATEGORÍAS de la MATERIA PRIMA
const REGLAS_CADUCIDAD_MP = {
  "Proteínas": { diasMaxBodega: 3, tipo: "Altamente Perecedero" }, // Carne, Pollo
  "Verduras": { diasMaxBodega: 5, tipo: "Perecedero" },          // Tomate, Cebolla
  "Lácteos": { diasMaxBodega: 6, tipo: "Perecedero" },           // Queso
  "Abarrotes": { diasMaxBodega: 120, tipo: "No Perecedero" },     // Arroz, Aceite
  "Licores": { diasMaxBodega: 365, tipo: "No Perecedero" }
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
      const regla = REGLAS_CADUCIDAD_MP[mp.categoria] || { diasMaxBodega: 15, tipo: "General" };

      // Días que durará el ingrediente en bodega antes de agotarse por completo
      let diasParaAgotar = promedioDiario > 0 ? stockActual / promedioDiario : 999;

      // Lógica de alertas por desabastecimiento
      if (promedioDiario > 0 && diasParaAgotar <= 2) criticos++;
      else if (promedioDiario > 0 && diasParaAgotar <= 5) bajo++;
      else normal++;

      // Lógica de alertas por Merma (El stock dura más de lo que vive el ingrediente fresco)
      let enRiesgoDeVencer = false;
      let cantidadEnRiesgo = 0;

      if (regla.tipo !== "No Perecedero" && diasParaAgotar > regla.diasMaxBodega && promedioDiario > 0) {
        enRiesgoDeVencer = true;
        const consumoEstimadoVidaUtil = promedioDiario * regla.diasMaxBodega;
        cantidadEnRiesgo = Math.max(0, Math.ceil(stockActual - consumoEstimadoVidaUtil));
      }

      const infoMp = {
        id: mp.idMateriaPrima, // Tu SKU
        nombre: mp.nombre,
        categoria: mp.categoria,
        stock_actual: `${stockActual} ${mp.unidad}`,
        consumo_diario: `${promedioDiario.toFixed(2)} ${mp.unidad}/día`,
        dias_restantes: diasParaAgotar === 999 ? "Sin rotación" : Math.ceil(diasParaAgotar),
        limite_frescura_dias: regla.diasMaxBodega,
        riesgo_merma: enRiesgoDeVencer,
        cantidad_riesgo: cantidadEnRiesgo
      };

      materiasAnalizadas.push(infoMp);
      if (enRiesgoDeVencer && cantidadEnRiesgo > 0) {
        alertasMermas.push(infoMp);
      }
    });

    // --- 5. LA IA PROCESA LOS INGREDIENTES EN RIESGO ---
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

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
        });

        analiticaIA = response.choices[0].message.content;
      } catch (error) {
        console.error("OpenAI Error:", error);
        analiticaIA = "Cálculo analítico finalizado. Se sugiere revisar manualmente el inventario de proteínas en el módulo físico.";
      }
    }

    // 6. Respuesta limpia para el Frontend
    return {
      resumen_cards: {
        productos_activos: materiasPrimas.length, // Total materias primas tracking
        stock_normal: normal,
        stock_bajo: bajo,
        criticos: criticos
      },
      alertas_mermas: alertasMermas.map(m => ({
        sku: m.id,
        producto: m.nombre,
        categoria: m.categoria,
        mensaje: `Peligro de vencimiento: Se proyecta perder ${m.cantidad_riesgo} unidades por falta de rotación en cocina.`
      })),
      analisis_ia_texto: analiticaIA,
      inventario_completo: materiasAnalizadas
    };
  }
}

export default new IaAnalyticsService();  