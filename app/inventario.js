// app/inventario.js
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

export default function InventarioScreen() {
  return (
    <MenuProvider>
      <Inventario />
    </MenuProvider>
  );
}

function Inventario() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const localItemsRef = useRef([]);

  useEffect(() => {
    if (!user) return;

    const qFirestore = query(
      collection(db, "users", user.uid, "inventario"),
      orderBy("nombre")
    );

    const unsub = onSnapshot(
      qFirestore,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        localItemsRef.current = data;
        setItems(data);
        setFiltered(data);
        setLoading(false);
      },
      (err) => {
        console.error("Inventario:", err);
        Alert.alert("Error", "No se pudo cargar el inventario.");
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  const applyFilter = (text) => {
    setSearch(text);
    const q = text.trim().toLowerCase();

    if (!q) {
      setFiltered(localItemsRef.current);
      return;
    }

    const res = localItemsRef.current.filter((item) => {
      const sku = (item.codigoSKU ?? item.codigo ?? "").toLowerCase();
      const nombre = (item.nombre ?? "").toLowerCase();
      return sku.includes(q) || nombre.includes(q);
    });

    setFiltered(res);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventario</Text>
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
            <MenuOption onSelect={() => router.replace("/exportar")}>
              <Text style={styles.menuItem}>Exportar inventario</Text>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>

      <TextInput
        placeholder="Buscar por SKU o nombre"
        value={search}
        onChangeText={applyFilter}
        style={styles.search}
      />

      {filtered.length === 0 ? (
        <Text style={styles.empty}>No hay productos</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/${item.id}`)}
            >
              <Text style={styles.name}>{item.nombre}</Text>
              <Text>SKU: {item.codigoSKU ?? "-"}</Text>
              <Text>Cantidad: {item.cantidad ?? 0}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700" },
  search: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  item: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 20, color: "#999" },
  menuItem: { padding: 10, fontSize: 16 },
});
