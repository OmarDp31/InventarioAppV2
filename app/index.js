// app/index.js (página principal)

import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebase";
import { useAuth } from "./utils/AuthProvider";

export default function Index() {
  const { user, initializing, signOut } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

  // ✅ Redirección si no está logueado
  useEffect(() => {
    if (!initializing && !user) {
      router.replace("/login");
    }
  }, [user, initializing]);

  // ✅ Cargar inventario MULTIUSUARIO
  useEffect(() => {
    if (!user) return;

    const refInventario = collection(db, "users", user.uid, "inventario");
    const qFirestore = query(refInventario, orderBy("nombre"));

    const unsub = onSnapshot(qFirestore, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
      setFiltered(data);
    });

    return unsub;
  }, [user]);

  // ✅ Búsqueda por nombre o SKU
  const onChangeSearch = (text) => {
    setSearch(text);
    const txt = text.trim().toLowerCase();

    if (!txt) {
      setFiltered([]);
      return;
    }

    const res = items.filter((item) => {
      const sku = String(item.codigoSKU || item.codigo || "").toLowerCase();
      const nombre = String(item.nombre || "").toLowerCase();
      return sku.includes(txt) || nombre.includes(txt);
    });

    setFiltered(res);
  };

  // ✅ Cerrar sesión
  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  if (initializing || !user) return null;

  return (
    <View style={styles.container}>

      {/* ✅ Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Invent-Go</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Barra de búsqueda */}
      <TextInput
        placeholder="Buscar por código SKU o nombre..."
        value={search}
        onChangeText={onChangeSearch}
        style={styles.search}
      />

      {/* ✅ SOLO mostrar resultados si el usuario está buscando */}
      {search.trim().length > 0 && filtered.length > 0 && (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => router.push(`/${item.id}`)}
            >
              <Text style={styles.resultName}>{item.nombre}</Text>
              <Text style={styles.resultSku}>
                SKU: {item.codigoSKU ?? item.codigo ?? "-"}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.resultList}
        />
      )}

      {/* ✅ Si no hay resultados */}
      {search.trim().length > 0 && filtered.length === 0 && (
        <Text style={{ textAlign: "center", marginBottom: 10 }}>
          No se encontraron productos
        </Text>
      )}

      {/* ✅ Tarjetas */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/formulario")}
      >
        <Text style={styles.cardTitle}>➕ Añadir producto</Text>
        <Text style={styles.cardSub}>Crear nuevo producto</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/inventario")}
      >
        <Text style={styles.cardTitle}>📦 Ver inventario</Text>
        <Text style={styles.cardSub}>Listado completo de productos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/exportar")}
      >
        <Text style={styles.cardTitle}>📄 Exportar PDF</Text>
        <Text style={styles.cardSub}>Generar PDF del inventario</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/reportes")}
      >
        <Text style={styles.cardTitle}>📊 Reportes</Text>
        <Text style={styles.cardSub}>Estadísticas y resumen</Text>
      </TouchableOpacity>

      {/* ✅ Botón flotante azul con + */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/formulario")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ✅ Menú lateral */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuBox}>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.menuItem}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 26, fontWeight: "700" },
  menuIcon: { fontSize: 28 },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  resultList: { maxHeight: 200 },
  resultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  resultName: { fontWeight: "600" },
  resultSku: { fontSize: 12, color: "#555" },
  card: {
    backgroundColor: "#f6f6f6",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardSub: { fontSize: 13, color: "#555" },

  // ✅ Botón flotante
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#4f05fcff",
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    zIndex: 9999,
  },
  fabText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "bold",
    lineHeight: 65,
    textAlign: "center",
    fontFamily: "sans-serif",
    paddingTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 20,
  },
  menuBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
  },
  menuItem: { fontSize: 16, fontWeight: "600" },
});
