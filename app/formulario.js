// app/formulario.js
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function FormularioScreen() {
  return (
    <MenuProvider>
      <Formulario />
    </MenuProvider>
  );
}

function Formulario() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precioCompra, setPrecioCompra] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id && user) cargarDatos();
  }, [id, user]);

  const refInventario = collection(db, "users", user.uid, "inventario");

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const ref = doc(db, "users", user.uid, "inventario", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const d = snap.data();
        setNombre(d.nombre ?? "");
        setCategoria(d.categoria ?? "");
        setCantidad(String(d.cantidad ?? ""));
        setPrecioCompra(d.precioCompra === null ? "" : String(d.precioCompra));
        setPrecioVenta(d.precioVenta === null ? "" : String(d.precioVenta));
        setCodigo(d.codigoSKU ?? "");
        setDescripcion(d.descripcion ?? "");
      } else {
        Alert.alert("Error", "Producto no encontrado");
        router.replace("/");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo cargar el producto");
    } finally {
      setLoading(false);
    }
  };

  async function skuExists(sku) {
    const q = query(refInventario, where("codigoSKU", "==", sku));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  const guardar = async () => {
    if (!nombre.trim()) {
      Alert.alert("Validación", "El nombre es obligatorio");
      return;
    }

    setLoading(true);

    try {
      if (codigo.trim() && !id) {
        const exists = await skuExists(codigo.trim());
        if (exists) {
          Alert.alert("Validación", "El SKU ya existe");
          setLoading(false);
          return;
        }
      }

      const payload = {
        nombre: nombre.trim(),
        categoria: categoria.trim(),
        cantidad: Number(cantidad) || 0,
        precioCompra: precioCompra === "" ? null : Number(precioCompra),
        precioVenta: precioVenta === "" ? null : Number(precioVenta),
        codigoSKU: codigo.trim() || null,
        descripcion: descripcion.trim() || null,
        fechaCreacion: new Date().toISOString(),
      };

      if (id) {
        await setDoc(doc(db, "users", user.uid, "inventario", id), payload, {
          merge: true,
        });
        Alert.alert("Éxito", "Producto actualizado");
      } else {
        await addDoc(refInventario, payload);
        Alert.alert("Éxito", "Producto creado");
      }

      router.replace("/");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>
          {id ? "Editar producto" : "Nuevo producto"}
        </Text>
        <Menu>
          <MenuTrigger>
            <Ionicons name="menu" size={28} color="#333" />
          </MenuTrigger>
          <MenuOptions>
            <MenuOption onSelect={() => router.replace("/")}>
              <Text style={styles.menuItem}>Volver a inicio</Text>
            </MenuOption>
            <MenuOption onSelect={() => router.replace("/inventario")}>
              <Text style={styles.menuItem}>Ver inventario</Text>
            </MenuOption>
            <MenuOption onSelect={() => router.replace("/exportar")}>
              <Text style={styles.menuItem}>Exportar inventario</Text>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Código SKU"
        value={codigo}
        onChangeText={setCodigo}
      />
      <TextInput
        style={styles.input}
        placeholder="Nombre"
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        style={styles.input}
        placeholder="Categoría"
        value={categoria}
        onChangeText={setCategoria}
      />
      <TextInput
        style={styles.input}
        placeholder="Cantidad"
        keyboardType="numeric"
        value={cantidad}
        onChangeText={setCantidad}
      />
      <TextInput
        style={styles.input}
        placeholder="Precio compra"
        keyboardType="numeric"
        value={precioCompra}
        onChangeText={setPrecioCompra}
      />
      <TextInput
        style={styles.input}
        placeholder="Precio venta"
        keyboardType="numeric"
        value={precioVenta}
        onChangeText={setPrecioVenta}
      />
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      <Button
        title={loading ? "Guardando..." : id ? "Actualizar" : "Guardar"}
        onPress={guardar}
      />

      <View style={{ marginTop: 12 }}>
        <Button
          title="Cancelar"
          color="#888"
          onPress={() => router.replace("/")}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  menuItem: { padding: 10, fontSize: 16 },
});
