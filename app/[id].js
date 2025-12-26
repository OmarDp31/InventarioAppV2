// app/[id].js
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { db } from "../firebase";
import { useAuth } from "../utils/AuthProvider";

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
      if (typeof window !== 'undefined' && window.confirm("¿Eliminar este producto?")) {
        eliminarProducto();
      }
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Cargando producto...</Text>
      </View>
    );
  }

  if (!producto) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>Producto no disponible</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={{ flex: 1, backgroundColor: "#f5f7fa" }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.replace("/")}
            >
              <Ionicons name="arrow-back" size={24} color="#4a90e2" />
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalle del Producto</Text>
          </View>

          {/* Tarjeta principal */}
          <View style={styles.card}>
            {/* Encabezado del producto */}
            <View style={styles.productHeader}>
              <View style={styles.productIconContainer}>
                <Ionicons name="cube-outline" size={30} color="#fff" />
              </View>
              <View style={styles.productTitleContainer}>
                <Text style={styles.productName}>{producto.nombre}</Text>
                <Text style={styles.productSku}>
                  SKU: {producto.codigoSKU ?? producto.codigo ?? "N/A"}
                </Text>
              </View>
            </View>

            {/* Información del producto */}
            <View style={styles.detailsContainer}>
              {/* Sección Stock y Categoría */}
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="pricetag-outline" size={18} color="#4a90e2" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Categoría</Text>
                    <Text style={styles.detailValue}>
                      {producto.categoria ?? "No especificada"}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="layers-outline" size={18} color="#4a90e2" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Stock</Text>
                    <Text style={[styles.detailValue, styles.stockValue]}>
                      {producto.cantidad ?? 0} unidades
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sección Precios */}
              <View style={styles.priceSection}>
                <Text style={styles.sectionTitle}>Precios</Text>
                <View style={styles.priceRow}>
                  <View style={styles.priceItem}>
                    <Ionicons name="arrow-down-circle-outline" size={20} color="#34C759" />
                    <Text style={styles.priceLabel}>Compra</Text>
                    <Text style={styles.priceValue}>
                      ${producto.precioCompra ? parseFloat(producto.precioCompra).toFixed(2) : "0.00"}
                    </Text>
                  </View>
                  
                  <View style={styles.priceItem}>
                    <Ionicons name="arrow-up-circle-outline" size={20} color="#FF9500" />
                    <Text style={styles.priceLabel}>Venta</Text>
                    <Text style={styles.priceValue}>
                      ${producto.precioVenta ? parseFloat(producto.precioVenta).toFixed(2) : "0.00"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sección Descripción */}
              {producto.descripcion && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>Descripción</Text>
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>{producto.descripcion}</Text>
                  </View>
                </View>
              )}

              {/* Sección Fecha */}
              <View style={styles.dateSection}>
                <View style={styles.dateItem}>
                  <Ionicons name="calendar-outline" size={16} color="#999" />
                  <Text style={styles.dateText}>
                    {producto.fechaCreacion 
                      ? new Date(producto.fechaCreacion).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : "Fecha no disponible"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Acciones */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => router.push({ pathname: "/formulario", params: { id } })}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={confirmarEliminar}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Eliminar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f7fa", 
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 10 : 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4a90e2",
    fontWeight: "600",
    marginLeft: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    textAlign: 'center',
    marginRight: 50,
  },
  
  // Scroll Content
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  
  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
    marginBottom: 20,
  },
  
  // Product Header
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#4a90e2",
    padding: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  productIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  productTitleContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 5,
  },
  productSku: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  
  // Details Container
  detailsContainer: {
    padding: 25,
  },
  
  // Detail Row
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6F0FF",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  stockValue: {
    color: "#4a90e2",
    fontWeight: "700",
  },
  
  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 15,
    marginTop: 10,
  },
  
  // Price Section
  priceSection: {
    marginBottom: 25,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginHorizontal: 5,
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#333",
  },
  
  // Description Section
  descriptionSection: {
    marginBottom: 25,
  },
  descriptionBox: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4a90e2",
  },
  descriptionText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },
  
  // Date Section
  dateSection: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 15,
    marginTop: 10,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: "#999",
    marginLeft: 8,
    fontStyle: 'italic',
  },
  
  // Actions Container
  actionsContainer: {
    flexDirection: 'row',
    padding: 25,
    paddingTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: "#4a90e2",
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  
  // Loading & Error
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999",
  },
});