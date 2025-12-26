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
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { db } from "../firebase";
import { useAuth } from "../utils/AuthProvider";

const { width } = Dimensions.get("window");

export default function FormularioScreen() {
  return <Formulario />;
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // REFS para manejo del teclado
  const scrollViewRef = useRef(null);
  const skuRef = useRef(null);
  const nombreRef = useRef(null);
  const categoriaRef = useRef(null);
  const cantidadRef = useRef(null);
  const precioCompraRef = useRef(null);
  const precioVentaRef = useRef(null);
  const descripcionRef = useRef(null);

  useEffect(() => {
    if (id && user) cargarDatos();
  }, [id, user]);

  const refInventario = collection(db, "users", user?.uid, "inventario");

  const cargarDatos = async () => {
    if (!user) return;
    
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
    if (!user) return false;
    
    const q = query(refInventario, where("codigoSKU", "==", sku));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  const guardar = async () => {
    if (!user) {
      Alert.alert("Error", "Usuario no autenticado");
      return;
    }

    if (!nombre.trim()) {
      Alert.alert("Validación", "El nombre es obligatorio");
      nombreRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      // Validar SKU único solo para productos nuevos
      if (codigo.trim() && !id) {
        const exists = await skuExists(codigo.trim());
        if (exists) {
          Alert.alert("Validación", "El SKU ya existe");
          setLoading(false);
          skuRef.current?.focus();
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
        fechaActualizacion: new Date().toISOString(),
      };

      if (id) {
        await setDoc(doc(db, "users", user.uid, "inventario", id), payload, {
          merge: true,
        });
        setSuccessMessage("Producto actualizado correctamente");
      } else {
        await addDoc(refInventario, payload);
        setSuccessMessage("Producto creado correctamente");
      }

      // Mostrar modal de éxito en lugar de alerta
      setShowSuccessModal(true);
      
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo guardar el producto");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    router.replace("/");
  };

  const handleNavigation = (route) => {
    setMenuVisible(false);
    router.push(route);
  };

  const exportarAPDF = () => {
    setMenuVisible(false);
    router.push("/exportar");
  };

  // Función para manejar el cierre del teclado en web
  const handleWebBackgroundClick = (e) => {
    if (Platform.OS === 'web') {
      const isInput = e.target.tagName === 'INPUT' || 
                      e.target.tagName === 'TEXTAREA' || 
                      e.target.isContentEditable;
      if (!isInput) {
        Keyboard.dismiss();
      }
    }
  };

  // Función para manejar la tecla Enter en inputs web
  const handleKeyPress = (e, nextRef) => {
    if (Platform.OS === 'web' && e.key === 'Enter') {
      e.preventDefault();
      if (nextRef) {
        nextRef.current?.focus();
      } else {
        guardar();
      }
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={{ marginTop: 20, color: '#666' }}>Cargando usuario...</Text>
      </View>
    );
  }

  if (loading && !showSuccessModal) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={{ marginTop: 20, color: '#666' }}>
          {id ? "Cargando producto..." : "Guardando..."}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1, backgroundColor: "#f5f7fa" }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // En web: manejar clics en el fondo
        {...(Platform.OS === 'web' && {
          onClick: handleWebBackgroundClick
        })}
      >
        {/* --- Encabezado --- */}
        <View style={styles.header}>
          <Text style={styles.titulo}>
            {id ? "Editar producto" : "Nuevo producto"}
          </Text>
          
          <TouchableOpacity 
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
            accessible={true}
            accessibilityLabel="Menú de navegación"
            accessibilityRole="button"
          >
            <Ionicons name="menu" size={30} color="#4a90e2" />
          </TouchableOpacity>
        </View>

        {/* --- Formulario --- */}
        <View style={styles.formContainer}>
          <View style={styles.inputWithLabel}>
            <Text style={styles.inputLabel}>Código SKU</Text>
            <TextInput
              ref={skuRef}
              style={styles.input}
              placeholder="00000"
              placeholderTextColor="#999"
              value={codigo}
              onChangeText={setCodigo}
              returnKeyType="next"
              onSubmitEditing={() => nombreRef.current?.focus()}
              blurOnSubmit={false}
              onKeyPress={(e) => handleKeyPress(e, nombreRef)}
              {...(Platform.OS === 'web' && {
                tabIndex: 1
              })}
            />
          </View>

          <View style={styles.inputWithLabel}>
            <Text style={[styles.inputLabel, styles.requiredLabel]}>Nombre *</Text>
            <TextInput
              ref={nombreRef}
              style={styles.input}
              placeholder="Nombre o Marca del Producto"
              placeholderTextColor="#999"
              value={nombre}
              onChangeText={setNombre}
              returnKeyType="next"
              onSubmitEditing={() => categoriaRef.current?.focus()}
              blurOnSubmit={false}
              onKeyPress={(e) => handleKeyPress(e, categoriaRef)}
              {...(Platform.OS === 'web' && {
                tabIndex: 2
              })}
            />
          </View>

          <View style={styles.inputWithLabel}>
            <Text style={styles.inputLabel}>Categoría</Text>
            <TextInput
              ref={categoriaRef}
              style={styles.input}
              placeholder="Categoria a la que pertenecera"
              placeholderTextColor="#999"
              value={categoria}
              onChangeText={setCategoria}
              returnKeyType="next"
              onSubmitEditing={() => cantidadRef.current?.focus()}
              blurOnSubmit={false}
              onKeyPress={(e) => handleKeyPress(e, cantidadRef)}
              {...(Platform.OS === 'web' && {
                tabIndex: 3
              })}
            />
          </View>

          <View style={styles.doubleInputRow}>
            <View style={[styles.inputWithLabel, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Cantidad</Text>
              <TextInput
                ref={cantidadRef}
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={cantidad}
                onChangeText={setCantidad}
                returnKeyType="next"
                onSubmitEditing={() => precioCompraRef.current?.focus()}
                blurOnSubmit={false}
                onKeyPress={(e) => handleKeyPress(e, precioCompraRef)}
                {...(Platform.OS === 'web' && {
                  tabIndex: 4
                })}
              />
            </View>
            
            <View style={[styles.inputWithLabel, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Precio Compra</Text>
              <View style={styles.inputWithPrefix}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  ref={precioCompraRef}
                  style={[styles.input, { paddingLeft: 30 }]}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={precioCompra}
                  onChangeText={setPrecioCompra}
                  returnKeyType="next"
                  onSubmitEditing={() => precioVentaRef.current?.focus()}
                  blurOnSubmit={false}
                  onKeyPress={(e) => handleKeyPress(e, precioVentaRef)}
                  {...(Platform.OS === 'web' && {
                    tabIndex: 5
                  })}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputWithLabel}>
            <Text style={styles.inputLabel}>Precio Venta</Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                ref={precioVentaRef}
                style={[styles.input, { paddingLeft: 30 }]}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={precioVenta}
                onChangeText={setPrecioVenta}
                returnKeyType="next"
                onSubmitEditing={() => descripcionRef.current?.focus()}
                blurOnSubmit={false}
                onKeyPress={(e) => handleKeyPress(e, descripcionRef)}
                {...(Platform.OS === 'web' && {
                  tabIndex: 6
                })}
              />
            </View>
          </View>

          <View style={styles.inputWithLabel}>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              ref={descripcionRef}
              style={[styles.input, styles.textArea]}
              placeholder="Describe el producto, características, etc."
              placeholderTextColor="#999"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
              onSubmitEditing={Platform.OS === 'web' ? undefined : Keyboard.dismiss}
              onKeyPress={(e) => {
                if (Platform.OS === 'web' && e.key === 'Enter' && e.ctrlKey) {
                  guardar();
                }
              }}
              {...(Platform.OS === 'web' && {
                tabIndex: 7
              })}
            />
          </View>

          {/* --- Botones --- */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={guardar}
              disabled={loading}
              accessible={true}
              accessibilityLabel={id ? "Actualizar producto" : "Guardar producto"}
              accessibilityRole="button"
              {...(Platform.OS === 'web' && {
                tabIndex: 8,
                onClick: (e) => {
                  e.preventDefault();
                  guardar();
                }
              })}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={id ? "create-outline" : "add-circle-outline"} size={22} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.primaryButtonText}>
                    {id ? "Actualizar Producto" : "Guardar Producto"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace("/")}
              disabled={loading}
              accessible={true}
              accessibilityLabel="Cancelar y volver al inicio"
              accessibilityRole="button"
              {...(Platform.OS === 'web' && {
                tabIndex: 9
              })}
            >
              <Ionicons name="close-outline" size={22} color="#666" style={{ marginRight: 10 }} />
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL DE ÉXITO */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#34C759" />
            </View>
            <Text style={styles.successTitle}>¡Éxito!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessModalClose}
              accessible={true}
              accessibilityLabel="Continuar"
              accessibilityRole="button"
              {...(Platform.OS === 'web' && {
                tabIndex: 10
              })}
            >
              <Text style={styles.successButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DEL MENÚ */}
      <Modal 
        visible={menuVisible} 
        transparent 
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuBox}>
            <Text style={styles.menuHeader}>Navegación</Text>
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => handleNavigation("/")}
              accessible={true}
              accessibilityLabel="Volver a inicio"
              accessibilityRole="button"
            >
              <Ionicons name="home-outline" size={22} color="#333" />
              <Text style={styles.menuItem}>Volver a inicio</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />

            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => handleNavigation("/inventario")}
              accessible={true}
              accessibilityLabel="Ver inventario"
              accessibilityRole="button"
            >
              <Ionicons name="cube-outline" size={22} color="#333" />
              <Text style={styles.menuItem}>Ver inventario</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => handleNavigation("/reportes")}
              accessible={true}
              accessibilityLabel="Ver reportes"
              accessibilityRole="button"
            >
              <Ionicons name="stats-chart-outline" size={22} color="#333" />
              <Text style={styles.menuItem}>Ver reportes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => handleNavigation("/ventas")}
              accessible={true}
              accessibilityLabel="Registrar venta o salida"
              accessibilityRole="button"
            >
              <Ionicons name="cash-outline" size={22} color="#333" />
              <Text style={styles.menuItem}>Registrar venta/salida</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={exportarAPDF}
              accessible={true}
              accessibilityLabel="Exportar inventario en PDF"
              accessibilityRole="button"
            >
              <Ionicons name="document-text-outline" size={22} color="#4a90e2" />
              <Text style={[styles.menuItem, styles.menuItemHighlight]}>
                Exportar a PDF
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const PRIMARY_COLOR = "#4a90e2";
const SECONDARY_COLOR = "#50e3c2";
const TEXT_DARK = "#333333";
const TEXT_MUTED = "#999999";
const BORDER_COLOR = "#e0e0e0";
const SUCCESS_COLOR = "#34C759";

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f7fa", 
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  formContainer: { 
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  menuButton: {
    padding: 5,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      ':hover': {
        opacity: 0.8,
      },
    }),
  },
  
  // Inputs mejorados
  inputWithLabel: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: 8,
    marginLeft: 4,
  },
  requiredLabel: {
    color: "#ff3b30",
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: Platform.OS === 'ios' ? 16 : 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    color: TEXT_DARK,
    backgroundColor: "#fff",
    minHeight: Platform.OS === 'ios' ? 50 : 48,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'textfield',
      ':focus': {
        borderColor: PRIMARY_COLOR,
        boxShadow: `0 0 0 2px ${PRIMARY_COLOR}20`,
      },
    }),
  },
  textArea: {
    height: 120,
    paddingTop: Platform.OS === 'ios' ? 16 : 14,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' && {
      resize: 'vertical',
    }),
  },
  inputWithPrefix: {
    position: 'relative',
  },
  currencyPrefix: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'ios' ? 18 : 16,
    fontSize: 16,
    color: TEXT_DARK,
    fontWeight: '500',
    zIndex: 1,
  },
  doubleInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  // Botones
  buttonContainer: {
    marginTop: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    padding: Platform.OS === 'ios' ? 18 : 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease, transform 0.1s ease',
      ':hover': {
        backgroundColor: '#3a80d2',
        transform: 'translateY(-1px)',
      },
      ':active': {
        transform: 'translateY(0)',
      },
    }),
  },
  buttonDisabled: {
    backgroundColor: "#a0c8f0",
    ...(Platform.OS === 'web' && {
      cursor: 'not-allowed',
      ':hover': {
        backgroundColor: "#a0c8f0",
        transform: 'none',
      },
    }),
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#fff",
    padding: Platform.OS === 'ios' ? 18 : 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: '#f8f9fa',
      },
    }),
  },
  secondaryButtonText: {
    color: TEXT_DARK,
    fontSize: 18,
    fontWeight: "600",
  },
  
  // Modal de éxito
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: Platform.OS === 'web' ? 400 : width * 0.85,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: '#3a80d2',
      },
    }),
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal del menú
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: 'flex-start',
    alignItems: "flex-end",
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingRight: 15,
  },
  menuBox: {
    backgroundColor: "#fff",
    width: width > 600 ? 300 : 260,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  menuHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 5,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: '#f5f7fa',
      },
    }),
  },
  menuItem: { 
    fontSize: 16, 
    fontWeight: "500", 
    color: '#333',
    marginLeft: 12,
  },
  menuItemHighlight: {
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
  },
  
  // Centro
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "#f5f7fa",
  },
});