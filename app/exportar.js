// app/exportar.js
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuProvider,
  MenuTrigger,
} from "react-native-popup-menu";
import { db } from "../firebase";
import { useAuth } from "./utils/AuthProvider";
import { generatePdfFromProducts } from "./utils/exportPdf";

export default function ExportarScreen() {
  return (
    <MenuProvider>
      <Exportar />
    </MenuProvider>
  );
}

function Exportar() {
  const router = useRouter();
  const { user } = useAuth();

  const [mode, setMode] = useState("");
  const [modeLabel, setModeLabel] = useState("Selecciona el tipo de reporte");
  const [param, setParam] = useState("");
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      const style = document.createElement("style");
      style.innerHTML = `
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const opciones = [
    { label: "Inventario completo", value: "all" },
    { label: "Última semana", value: "week" },
    { label: "Por categoría", value: "category" },
    { label: "Por código SKU", value: "sku" },
  ];

  const seleccionarOpcion = (opcion) => {
    setMode(opcion.value);
    setModeLabel(opcion.label);
    setParam("");
    setPreview([]);
    setModalVisible(false);

    if (opcion.value === "all" || opcion.value === "week") {
      cargarVistaPrevia(opcion.value, "");
    }
  };

  const cargarVistaPrevia = async (modo, parametro) => {
    setLoading(true);
    try {
      const col = collection(db, "users", user.uid, "inventario");
      let q;

      if (modo === "all") {
        q = query(col, orderBy("nombre"));
      } else if (modo === "week") {
        const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        q = query(col, where("fechaCreacion", ">=", semanaAtras), orderBy("fechaCreacion", "desc"));
      } else if (modo === "category") {
        q = query(col, where("categoria", "==", parametro.trim()));
      } else if (modo === "sku") {
        q = query(col, where("codigoSKU", "==", parametro.trim()));
      }

      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPreview(data);

      if (data.length === 0) {
        Alert.alert("Vista previa", "No hay datos para ese filtro.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No fue posible cargar la vista previa.");
    } finally {
      setLoading(false);
    }
  };

  const generarPDF = async () => {
    if (preview.length === 0) {
      Alert.alert("Sin datos", "Carga la vista previa antes de generar.");
      return;
    }
    setLoading(true);
    try {
      const title =
        mode === "all"
          ? "Inventario completo"
          : mode === "week"
          ? "Inventario - Última semana"
          : mode === "category"
          ? `Inventario - Categoría: ${param}`
          : `Inventario - SKU: ${param}`;

      await generatePdfFromProducts(preview, title);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No fue posible generar el PDF.");
    } finally {
      setLoading(false);
    }
  };

  const previewContainerStyle =
    Platform.OS === "web"
      ? { maxHeight: "50vh", overflowY: "auto", marginTop: 8 }
      : { maxHeight: 300, marginTop: 8 };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Exportar inventario</Text>
        <Menu>
          <MenuTrigger>
            <Ionicons name="menu" size={28} color="#333" />
          </MenuTrigger>
          <MenuOptions>
            <MenuOption onSelect={() => router.replace("/")}>
              <Text style={styles.menuItem}>Volver a inicio</Text>
            </MenuOption>
            <MenuOption onSelect={() => router.replace("/formulario")}>
              <Text style={styles.menuItem}>Añadir producto</Text>
            </MenuOption>
            <MenuOption onSelect={() => router.replace("/inventario")}>
              <Text style={styles.menuItem}>Ver inventario</Text>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>

      <View className="no-print">
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <TextInput style={styles.input} value={modeLabel} editable={false} />
        </TouchableOpacity>

        <Modal visible={modalVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <FlatList
                data={opciones}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => seleccionarOpcion(item)}
                    style={styles.option}
                  >
                    <Text>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {(mode === "category" || mode === "sku") && (
          <>
            <TextInput
              style={styles.input}
              placeholder={
                mode === "category"
                  ? "Escribe la categoría"
                  : "Escribe el código SKU"
              }
              value={param}
              onChangeText={setParam}
            />
            <TouchableOpacity
              onPress={() => cargarVistaPrevia(mode, param)}
              style={[styles.boton, styles.botonActivo]}
            >
              <Text style={styles.botonTexto}>Buscar</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          onPress={generarPDF}
          disabled={loading || preview.length === 0}
          style={[
            styles.boton,
            preview.length > 0 ? styles.botonActivo : styles.botonInactivo,
          ]}
        >
          <Text style={styles.botonTexto}>GENERAR PDF</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ marginTop: 20, fontWeight: "700" }}>
        Vista previa del informe ({preview.length})
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 10 }} />
      ) : preview.length === 0 ? (
        <Text style={{ marginTop: 10 }}>No hay datos para la vista previa.</Text>
      ) : (
        <View style={previewContainerStyle}>
          {preview.map((p) => (
            <View
              key={p.id}
              style={{
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: "#eee",
              }}
            >
              <Text style={{ fontWeight: "600" }}>
                {p.nombre} ({p.codigoSKU ?? p.codigo ?? "-"})
              </Text>
              <Text>{p.categoria} — Cant: {p.cantidad}</Text>
              <Text style={{ fontSize: 12, color: "#666" }}>
                Fecha: {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleString() : "-"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  heading: {
    fontSize: 20,
    fontWeight: "700",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalContent: {
    backgroundColor: "#fff",
    marginHorizontal: 40,
    borderRadius: 8,
    padding: 10,
  },

  option: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  boton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },

  botonActivo: {
    backgroundColor: "#0a84ff",
  },

  botonInactivo: {
    backgroundColor: "#ccc",
  },

  botonTexto: {
    color: "#fff",
    fontWeight: "bold",
  },

  menuItem: {
    padding: 10,
    fontSize: 16,
  },
});