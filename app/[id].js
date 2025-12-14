// app/[id].js
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Platform, StyleSheet, Text, View } from "react-native";
import { db } from "../firebase";
import { useAuth } from "./utils/AuthProvider";

export default function Detalle() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || !user) {
      router.replace("/");
      return;
    }

    (async () => {
      try {
        const ref = doc(db, "users", user.uid, "inventario", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          Alert.alert("No encontrado", "El producto no existe.");
          router.replace("/");
          return;
        }

        setProducto({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error("Cargar detalle:", err);
        Alert.alert("Error", "No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  const confirmarEliminar = () => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Eliminar este producto?")) eliminarProducto();
      return;
    }

    Alert.alert("Confirmar", "¿Eliminar este producto?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: eliminarProducto },
    ]);
  };

  const eliminarProducto = async () => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, "users", user.uid, "inventario", id));
      Alert.alert("Eliminado", "Producto eliminado correctamente.");
      router.replace("/");
    } catch (err) {
      console.error("Eliminar:", err);
      Alert.alert("Error", "No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!producto) return <View style={styles.center}><Text>Producto no disponible.</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.nombre}>{producto.nombre}</Text>
      <Text>SKU: {producto.codigoSKU ?? producto.codigo ?? "-"}</Text>
      <Text>Categoría: {producto.categoria ?? "-"}</Text>
      <Text>Cantidad: {producto.cantidad ?? 0}</Text>
      <Text>Precio compra: {producto.precioCompra ?? "-"}</Text>
      <Text>Precio venta: {producto.precioVenta ?? "-"}</Text>
      <Text style={{ marginTop: 8 }}>Descripción: {producto.descripcion ?? "-"}</Text>
      <Text style={{ marginTop: 8 }}>
        Fecha: {producto.fechaCreacion ? new Date(producto.fechaCreacion).toLocaleString() : "-"}
      </Text>

      <View style={{ marginTop: 20 }}>
        <Button title="Editar" onPress={() => router.push({ pathname: "/formulario", params: { id } })} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title={deleting ? "Eliminando..." : "Eliminar"} color="#d11" onPress={confirmarEliminar} disabled={deleting} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title="Volver" color="#666" onPress={() => router.replace("/")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, backgroundColor: "#fff" },
  nombre: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
