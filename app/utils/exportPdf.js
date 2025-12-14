// app/utils/exportPdf.js
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function buildHtmlTable(title, products) {
  const rows = products.map((p, i) => {
    const fecha = p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleString() : "";
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${p.codigoSKU ?? p.codigo ?? ""}</td>
        <td>${p.nombre ?? ""}</td>
        <td>${p.categoria ?? ""}</td>
        <td>${p.cantidad ?? ""}</td>
        <td>${p.precioCompra ?? ""}</td>
        <td>${fecha}</td>
      </tr>
    `;
  }).join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 20px;
            margin: 0;
            -webkit-print-color-adjust: exact;
          }
          h1 {
            text-align: center;
            margin-bottom: 10px;
          }
          small {
            display: block;
            text-align: center;
            margin-bottom: 20px;
            color: #555;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            text-align: center;
          }
          td:nth-child(1), td:nth-child(5), td:nth-child(6) {
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <small>Generado: ${new Date().toLocaleString()}</small>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>CÓDIGO</th>
              <th>NOMBRE</th>
              <th>CATEGORÍA</th>
              <th>CANTIDAD</th>
              <th>PRECIO COMPRA</th>
              <th>FECHA</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export async function generatePdfFromProducts(products, title = "Inventario") {
  try {
    const html = buildHtmlTable(title, products);
    if (Platform.OS === "web") {
      await Print.printAsync({ html });
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) {
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ html });
      }
    }
  } catch (err) {
    console.error("Error generando PDF:", err);
    throw err;
  }
}
