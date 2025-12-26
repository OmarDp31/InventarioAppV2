// app/utils/exportPdf.jss
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

// =========================================================
// 1. FUNCIONES AUXILIARES PARA GENERAR HTML
// =========================================================

/**
 * Genera la estructura HTML para la tabla de inventario (Productos).
 * @param {string} title - Título del reporte.
 * @param {Array<Object>} products - Lista de productos.
 */
function buildProductsHtmlTable(title, products) {
  const rows = products.map((p, i) => {
    // Usamos p.fechaCreacion o p.fechaDisplay (si se mapeó)
    const fecha = p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleString() : p.fechaDisplay || ""; 
    
    // Validación segura de precios
    const precio = p.precioCompra ? 
      `$${parseFloat(p.precioCompra).toFixed(2)}` : 
      "$0.00";
    
    return `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td>${p.codigoSKU ?? p.codigo ?? ""}</td>
        <td>${p.nombre ?? ""}</td>
        <td>${p.categoria ?? ""}</td>
        <td style="text-align: center;">${p.cantidad ?? 0}</td>
        <td style="text-align: center;">${precio}</td>
        <td>${fecha}</td>
      </tr>
    `;
  }).join("");

  // Calcular totales
  const totalProductos = products.length;
  const totalCantidad = products.reduce((sum, p) => sum + (parseInt(p.cantidad) || 0), 0);
  const valorTotal = products.reduce((sum, p) => {
    const precio = parseFloat(p.precioCompra) || 0;
    const cantidad = parseInt(p.cantidad) || 0;
    return sum + (precio * cantidad);
  }, 0);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { 
            size: A4; 
            margin: 12mm; 
            @bottom-center {
              content: "Página " counter(page) " de " counter(pages);
              font-size: 10px;
              color: #666;
            }
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 20px;
            margin: 0;
            -webkit-print-color-adjust: exact;
          }
          h1 {
            text-align: center;
            margin-bottom: 5px;
            color: #333;
            border-bottom: 2px solid #fc0d05ff;
            padding-bottom: 10px;
          }
          .subtitle {
            display: block;
            text-align: center;
            margin-bottom: 20px;
            color: #666;
            font-size: 14px;
          }
          .summary {
            background-color: #f9f9f9;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 5px;
            border-left: 4px solid #fc0d05ff;
          }
          .summary-item {
            display: inline-block;
            margin-right: 20px;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #fc0d05ff;
            color: white;
            text-align: center;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <span class="subtitle">Generado el ${new Date().toLocaleString()}</span>
        
        <div class="summary">
          <span class="summary-item"><strong>Total Productos:</strong> ${totalProductos}</span>
          <span class="summary-item"><strong>Total Cantidad:</strong> ${totalCantidad}</span>
          <span class="summary-item"><strong>Valor Total:</strong> $${valorTotal.toFixed(2)}</span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>CÓDIGO</th>
              <th>NOMBRE</th>
              <th>CATEGORÍA</th>
              <th>CANTIDAD</th>
              <th>PRECIO COMPRA</th>
              <th>FECHA CREACIÓN</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div class="footer">
          Sistema de Inventario - Generado automáticamente
        </div>
      </body>
    </html>
  `;
}

/**
 * Genera la estructura HTML para la tabla de transacciones (Ventas/Salidas).
 * @param {string} title - Título del reporte.
 * @param {Array<Object>} transactions - Lista de transacciones (de la colección 'ventas').
 */
function buildTransactionsHtmlTable(title, transactions) {
    
    // Calcular totales para el pie de página
    const ventas = transactions.filter(t => t.tipoTransaccion === 'Venta');
    const salidas = transactions.filter(t => t.tipoTransaccion === 'Salida');
    
    const totalVentas = ventas.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
    const totalCantidadVentas = ventas.reduce((sum, t) => sum + (parseInt(t.cantidad) || 0), 0);
    const totalCantidadSalidas = salidas.reduce((sum, t) => sum + (parseInt(t.cantidad) || 0), 0);
    const totalCantidad = totalCantidadVentas + totalCantidadSalidas;

    const rows = transactions.map((t, i) => {
        // Usamos p.fechaDisplay que se mapeó en Exportar.js
        const fecha = t.fechaDisplay || ""; 
        const total = t.tipoTransaccion === 'Venta' ? 
          `$${(parseFloat(t.total) || 0).toFixed(2)}` : 
          'N/A';
        const costo = t.costo ? `$${parseFloat(t.costo).toFixed(2)}` : '';
        const tipoClase = t.tipoTransaccion === 'Venta' ? 'venta' : 'salida';
        
        return `
            <tr class="${tipoClase}">
                <td style="text-align: center;">${i + 1}</td>
                <td>${t.codigoSKU ?? t.codigo ?? ""}</td>
                <td>${t.nombre ?? ""}</td>
                <td style="text-align: center;"><span class="badge ${tipoClase}">${t.tipoTransaccion ?? ""}</span></td>
                <td style="text-align: center;">${t.cantidad ?? 0}</td>
                <td style="text-align: center;">${costo}</td>
                <td style="text-align: center; font-weight: bold;">${total}</td>
                <td>${fecha}</td>
            </tr>
        `;
    }).join("");

    return `
        <html>
            <head>
                <meta charset="utf-8" />
                <style>
                    @page { 
                      size: A4; 
                      margin: 12mm;
                      @bottom-center {
                        content: "Página " counter(page) " de " counter(pages);
                        font-size: 10px;
                        color: #666;
                      }
                    }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        padding: 20px;
                        margin: 0;
                        -webkit-print-color-adjust: exact;
                    }
                    h1 { 
                      text-align: center; 
                      margin-bottom: 5px;
                      color: #333;
                      border-bottom: 2px solid #fc0d05ff;
                      padding-bottom: 10px;
                    }
                    .subtitle {
                      display: block; 
                      text-align: center; 
                      margin-bottom: 20px; 
                      color: #666;
                      font-size: 14px;
                    }
                    .summary {
                      display: flex;
                      justify-content: space-between;
                      background-color: #f9f9f9;
                      padding: 15px;
                      margin-bottom: 15px;
                      border-radius: 5px;
                      border-left: 4px solid #fc0d05ff;
                    }
                    .summary-box {
                      text-align: center;
                      padding: 10px;
                      min-width: 150px;
                    }
                    .summary-ventas { border-top: 3px solid #28a745; }
                    .summary-salidas { border-top: 3px solid #ffc107; }
                    .summary-total { border-top: 3px solid #007bff; }
                    .summary-value {
                      font-size: 24px;
                      font-weight: bold;
                      display: block;
                    }
                    .summary-label {
                      font-size: 12px;
                      color: #666;
                      text-transform: uppercase;
                    }
                    table {
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 12px;
                    }
                    th, td {
                        border: 1px solid #ddd; 
                        padding: 8px; 
                        text-align: left;
                    }
                    th {
                        background-color: #fc0d05ff;
                        color: white;
                        text-align: center;
                        font-weight: bold;
                    }
                    td { 
                      white-space: nowrap;
                      vertical-align: top;
                    }
                    .badge {
                      padding: 3px 8px;
                      border-radius: 12px;
                      font-size: 11px;
                      font-weight: bold;
                      display: inline-block;
                    }
                    .venta .badge { 
                      background-color: #d4edda; 
                      color: #155724; 
                      border: 1px solid #c3e6cb;
                    }
                    .salida .badge { 
                      background-color: #fff3cd; 
                      color: #856404; 
                      border: 1px solid #ffeaa7;
                    }
                    .venta { background-color: #f8fff8; }
                    .salida { background-color: #fffcf5; }
                    .totales { 
                      font-weight: bold; 
                      background-color: #e9ecef;
                    }
                    .footer {
                      margin-top: 20px;
                      text-align: center;
                      font-size: 11px;
                      color: #777;
                      border-top: 1px solid #eee;
                      padding-top: 10px;
                    }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <span class="subtitle">Generado el ${new Date().toLocaleString()}</span>
                
                <div class="summary">
                  <div class="summary-box summary-ventas">
                    <span class="summary-value">${ventas.length}</span>
                    <span class="summary-label">Ventas</span>
                  </div>
                  <div class="summary-box summary-salidas">
                    <span class="summary-value">${salidas.length}</span>
                    <span class="summary-label">Salidas</span>
                  </div>
                  <div class="summary-box summary-total">
                    <span class="summary-value">${transactions.length}</span>
                    <span class="summary-label">Total Trans.</span>
                  </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>CÓDIGO</th>
                            <th>NOMBRE PRODUCTO</th>
                            <th>TIPO</th>
                            <th>CANTIDAD</th>
                            <th>COSTO UNIT.</th>
                            <th>TOTAL</th>
                            <th>FECHA/HORA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                    <tfoot>
                        <tr class="totales">
                            <td colspan="4" style="text-align: right;"><strong>RESUMEN:</strong></td>
                            <td style="text-align: center;"><strong>${totalCantidad}</strong></td>
                            <td style="text-align: center;">-</td>
                            <td style="text-align: center;"><strong>$${totalVentas.toFixed(2)}</strong></td>
                            <td style="text-align: center;">${transactions.length} registros</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="footer">
                  Sistema de Inventario - Reporte de Transacciones
                </div>
            </body>
        </html>
    `;
}

// =========================================================
// 2. FUNCIONES EXPORTABLES CON MANEJO DE ERRORES MEJORADO
// =========================================================

/**
 * Exporta la tabla de productos (Inventario) a PDF.
 * @param {Array<Object>} products - Datos de inventario.
 * @param {string} title - Título del reporte.
 * @param {Function} onSuccess - Callback opcional al éxito.
 * @param {Function} onError - Callback opcional al error.
 */
export async function generatePdfFromProducts(
  products, 
  title = "Reporte de Inventario",
  onSuccess = null,
  onError = null
) {
  try {
    if (!products || products.length === 0) {
      throw new Error("No hay productos para generar el reporte");
    }

    console.log(`Generando PDF de productos: ${products.length} items`);
    
    // Usamos la función de HTML para productos
    const html = buildProductsHtmlTable(title, products); 
    
    if (Platform.OS === "web") {
      // En Web, Print.printAsync generalmente abre el diálogo de impresión/PDF
      await Print.printAsync({ html });
      console.log("PDF generado exitosamente en web");
    } else {
      // En Móvil (iOS/Android) genera un archivo y lo comparte
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf',
          dialogTitle: `Descargar ${title}` 
        });
        console.log("PDF compartido exitosamente:", uri);
      } else {
        // Fallback: intentar imprimir directamente
        await Print.printAsync({ html });
      }
    }
    
    if (onSuccess) onSuccess();
    return true;
    
  } catch (err) {
    console.error("Error generando PDF de Productos:", err);
    
    // Mostrar alerta en dispositivo móvil
    if (Platform.OS !== 'web') {
      Alert.alert(
        "Error al generar PDF",
        err.message || "No se pudo generar el archivo PDF",
        [{ text: "OK" }]
      );
    }
    
    if (onError) onError(err);
    throw err;
  }
}

/**
 * Exporta la tabla de transacciones (Ventas/Salidas) a PDF.
 * @param {Array<Object>} transactions - Datos de transacciones.
 * @param {string} title - Título del reporte.
 * @param {Function} onSuccess - Callback opcional al éxito.
 * @param {Function} onError - Callback opcional al error.
 */
export async function generatePdfFromTransactions(
  transactions, 
  title = "Reporte de Transacciones",
  onSuccess = null,
  onError = null
) {
    try {
        if (!transactions || transactions.length === 0) {
          throw new Error("No hay transacciones para generar el reporte");
        }

        console.log(`Generando PDF de transacciones: ${transactions.length} items`);
        
        // Usamos la nueva función de HTML para transacciones
        const html = buildTransactionsHtmlTable(title, transactions); 

        if (Platform.OS === "web") {
            // En Web, Print.printAsync generalmente abre el diálogo de impresión/PDF
            await Print.printAsync({ html });
            console.log("PDF de transacciones generado exitosamente en web");
        } else {
            // En Móvil (iOS/Android) genera un archivo y lo comparte
            const { uri } = await Print.printToFileAsync({ 
              html,
              base64: false 
            });
            
            if (uri && await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { 
                  UTI: '.pdf', 
                  mimeType: 'application/pdf',
                  dialogTitle: `Descargar ${title}`
                });
                console.log("PDF de transacciones compartido exitosamente:", uri);
            } else {
                // Fallback: intentar imprimir directamente
                await Print.printAsync({ html });
            }
        }
        
        if (onSuccess) onSuccess();
        return true;
        
    } catch (err) {
        console.error("Error generando PDF de Transacciones:", err);
        
        // Mostrar alerta en dispositivo móvil
        if (Platform.OS !== 'web') {
          Alert.alert(
            "Error al generar PDF",
            err.message || "No se pudo generar el archivo PDF de transacciones",
            [{ text: "OK" }]
          );
        }
        
        if (onError) onError(err);
        throw err;
    }
}

/**
 * Función principal que exporta ambos formatos
 */
export default {
  generatePdfFromProducts,
  generatePdfFromTransactions
};