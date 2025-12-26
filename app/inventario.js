// app/inventario.js
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { db } from "../firebase";
import { useAuth } from "../utils/AuthProvider";

const { height: windowHeight, width: windowWidth } = Dimensions.get("window");

export default function InventarioScreen() {
  return <Inventario />;
}

function Inventario() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const localItemsRef = useRef([]);
  const flatListRef = useRef(null);
  const scrollViewRef = useRef(null);
  const searchInputRef = useRef(null);

  // Estilos CSS para web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        /* Estilos para mejorar la barra de scroll en navegadores web */
        *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        
        *::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 5px;
        }
        
        *::-webkit-scrollbar-thumb {
          background: #4a90e2;
          border-radius: 5px;
          border: 2px solid #f0f0f0;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background: #3a80d2;
        }
        
        /* Mejorar la experiencia de scroll */
        .scrollable-content {
          scroll-behavior: smooth;
        }
        
        /* Evitar zoom en inputs en iOS */
        input, textarea {
          font-size: 16px !important;
        }
        
        /* Mejorar foco en inputs */
        input:focus, textarea:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2) !important;
          border-color: #4a90e2 !important;
        }
        
        /* Hacer que el input sea fácil de hacer clic */
        .search-input {
          cursor: text !important;
          user-select: text !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

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
      const categoria = (item.categoria ?? "").toLowerCase();
      return sku.includes(q) || nombre.includes(q) || categoria.includes(q);
    });

    setFiltered(res);
  };

  const handleNavigation = (route) => {
    setMenuVisible(false);
    router.push(route);
  };

  const exportarInventarioPDF = () => {
    setMenuVisible(false);
    router.push("/exportar");
  };

  // Función para manejar el foco en la búsqueda
  const handleSearchFocus = () => {
    if (Platform.OS === 'web' && scrollViewRef.current) {
      // En web, desplazar suavemente hacia arriba para mostrar el input
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  // Función para manejar la tecla Enter en búsqueda
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
  };

  // Función para cerrar teclado cuando se hace clic fuera en web
  const handleWebBackgroundClick = (e) => {
    if (Platform.OS === 'web') {
      // Solo cerrar teclado si se hace clic fuera de un input
      const isInput = e.target.tagName === 'INPUT' || 
                      e.target.tagName === 'TEXTAREA' || 
                      e.target.isContentEditable;
      if (!isInput) {
        Keyboard.dismiss();
      }
    }
  };

  // Manejar clic en el overlay del modal
  const handleModalOverlayClick = (e) => {
    if (Platform.OS === 'web') {
      // Prevenir que el clic se propague al TouchableWithoutFeedback
      e.stopPropagation();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Cargando inventario...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* SOLUCIÓN: Remover TouchableWithoutFeedback o usarlo de manera selectiva */}
      {Platform.OS === 'web' ? (
        // En web, no usar TouchableWithoutFeedback o usar un enfoque diferente
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: "#f5f7fa" }}
          contentContainerStyle={{ 
            flexGrow: 1, 
            paddingBottom: 30,
            minHeight: windowHeight - 100
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          bounces={true}
          overScrollMode="always"
          onClick={handleWebBackgroundClick}
          // Configuración específica para web
          {...(Platform.OS === 'web' && {
            contentContainerStyle: {
              flexGrow: 1,
              paddingBottom: 40,
              minHeight: '100vh',
            }
          })}
        >
          {/* Render del contenido aquí */}
          <InventarioContent 
            search={search}
            applyFilter={applyFilter}
            searchInputRef={searchInputRef}
            handleSearchFocus={handleSearchFocus}
            handleSearchSubmit={handleSearchSubmit}
            filtered={filtered}
            router={router}
            menuVisible={menuVisible}
            setMenuVisible={setMenuVisible}
            handleNavigation={handleNavigation}
            exportarInventarioPDF={exportarInventarioPDF}
            handleModalOverlayClick={handleModalOverlayClick}
          />
        </ScrollView>
      ) : (
        // En móvil, mantener TouchableWithoutFeedback
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView 
            ref={scrollViewRef}
            style={{ flex: 1, backgroundColor: "#f5f7fa" }}
            contentContainerStyle={{ 
              flexGrow: 1, 
              paddingBottom: 30,
              minHeight: windowHeight - 100
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={true}
            overScrollMode="always"
          >
            <InventarioContent 
              search={search}
              applyFilter={applyFilter}
              searchInputRef={searchInputRef}
              handleSearchFocus={handleSearchFocus}
              handleSearchSubmit={handleSearchSubmit}
              filtered={filtered}
              router={router}
              menuVisible={menuVisible}
              setMenuVisible={setMenuVisible}
              handleNavigation={handleNavigation}
              exportarInventarioPDF={exportarInventarioPDF}
              handleModalOverlayClick={handleModalOverlayClick}
            />
          </ScrollView>
        </TouchableWithoutFeedback>
      )}

      {/* Botón flotante para agregar producto */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push("/formulario")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// Componente separado para el contenido
function InventarioContent({
  search,
  applyFilter,
  searchInputRef,
  handleSearchFocus,
  handleSearchSubmit,
  filtered,
  router,
  menuVisible,
  setMenuVisible,
  handleNavigation,
  exportarInventarioPDF,
  handleModalOverlayClick
}) {
  return (
    <>
      {/* --- Encabezado --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventario</Text>
          <Text style={styles.subtitle}>Gestión de productos</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
        >
          <Ionicons name="menu" size={30} color="#4a90e2" />
        </TouchableOpacity>
      </View>

      {/* --- Barra de búsqueda --- */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          placeholder="Buscar por SKU, nombre o categoría"
          placeholderTextColor="#999"
          value={search}
          onChangeText={applyFilter}
          style={styles.search}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
          onFocus={handleSearchFocus}
          blurOnSubmit={true}
          // Propiedades específicas para web
          {...(Platform.OS === 'web' && {
            className: 'search-input',
            enterKeyHint: "search",
            tabIndex: 1,
            onClick: (e) => e.stopPropagation(), // Prevenir que se propague al padre
            onTouchStart: (e) => e.stopPropagation(), // Para dispositivos táctiles
            style: {
              ...styles.search,
              cursor: 'text',
              userSelect: 'text',
            }
          })}
        />
        {search.length > 0 && (
          <TouchableOpacity 
            onPress={() => applyFilter("")} 
            style={styles.clearButton}
            {...(Platform.OS === 'web' && {
              onClick: (e) => {
                e.stopPropagation();
                applyFilter("");
              }
            })}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* --- Estadísticas rápidas --- */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{filtered.length}</Text>
          <Text style={styles.statLabel}>Productos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {filtered.reduce((sum, item) => sum + (item.cantidad || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Total Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            ${filtered.reduce((sum, item) => sum + (item.precioVenta || 0) * (item.cantidad || 0), 0).toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Valor Total</Text>
        </View>
      </View>

      {/* --- Lista de productos --- */}
      <View style={styles.mainContent}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#e0e0e0" />
            <Text style={styles.emptyTitle}>
              {search.length > 0 ? "No se encontraron productos" : "No hay productos"}
            </Text>
            <Text style={styles.emptyText}>
              {search.length > 0 
                ? "Intenta con otros términos de búsqueda" 
                : "Comienza agregando tu primer producto"}
            </Text>
            {search.length === 0 && (
              <TouchableOpacity 
                style={styles.addFirstButton}
                onPress={() => router.push("/formulario")}
                {...(Platform.OS === 'web' && {
                  onClick: (e) => e.stopPropagation()
                })}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addFirstButtonText}>Agregar primer producto</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.productsList}>
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => router.push(`/${item.id}`)}
                  activeOpacity={0.7}
                  {...(Platform.OS === 'web' && {
                    onClick: (e) => e.stopPropagation()
                  })}
                >
                  {/* Encabezado del producto */}
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleContainer}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      {item.categoria && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>{item.categoria}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.quantityContainer}>
                      <Text style={styles.quantityText}>{item.cantidad || 0}</Text>
                      <Text style={styles.quantityLabel}>unidades</Text>
                    </View>
                  </View>

                  {/* Información del producto */}
                  <View style={styles.itemInfo}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>SKU:</Text>
                      <Text style={styles.infoValue}>
                        {item.codigoSKU ? item.codigoSKU : "Sin código"}
                      </Text>
                    </View>
                    
                    {/* Precios */}
                    <View style={styles.pricesContainer}>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Compra:</Text>
                        <Text style={styles.priceValueBuy}>
                          ${item.precioCompra ? item.precioCompra.toFixed(2) : "0.00"}
                        </Text>
                      </View>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Venta:</Text>
                        <Text style={styles.priceValueSell}>
                          ${item.precioVenta ? item.precioVenta.toFixed(2) : "0.00"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Pie del item */}
                  <View style={styles.itemFooter}>
                    <Text style={styles.lastUpdated}>
                      {item.fechaCreacion 
                        ? `Creado: ${new Date(item.fechaCreacion).toLocaleDateString()}`
                        : "Sin fecha"
                      }
                    </Text>
                    <View style={styles.arrowContainer}>
                      <Text style={styles.detailsText}>Ver detalles</Text>
                      <Ionicons name="chevron-forward" size={18} color="#4a90e2" />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListFooterComponent={<View style={styles.listFooter} />}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
            />
          </View>
        )}
      </View>

      {/* Espacio adicional al final para mejor scroll */}
      <View style={styles.bottomSpacer} />

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
          {...(Platform.OS === 'web' && {
            onClick: (e) => {
              e.stopPropagation();
              setMenuVisible(false);
            }
          })}
        >
          <View 
            style={styles.menuBox}
            {...(Platform.OS === 'web' && {
              onClick: (e) => e.stopPropagation()
            })}
          >
            <Text style={styles.menuHeader}>Navegación</Text>
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => handleNavigation("/")}
              {...(Platform.OS === 'web' && {
                onClick: (e) => {
                  e.stopPropagation();
                  handleNavigation("/");
                }
              })}
            >
              <Ionicons name="home-outline" size={22} color="#333" />
              <Text style={styles.menuItem}>Volver a inicio</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => handleNavigation("/formulario")}
              {...(Platform.OS === 'web' && {
                onClick: (e) => {
                  e.stopPropagation();
                  handleNavigation("/formulario");
                }
              })}
            >
              <Ionicons name="add-circle-outline" size={22} color="#333" />
              <Text style={styles.menuItem}>Añadir producto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => handleNavigation("/ventas")}
              {...(Platform.OS === 'web' && {
                onClick: (e) => {
                  e.stopPropagation();
                  handleNavigation("/ventas");
                }
              })}
            >
              <Ionicons name="cash-outline" size={22} color="#333" />
              <Text style={styles.menuItem}>Registrar venta/salida</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={() => handleNavigation("/reportes")}
              {...(Platform.OS === 'web' && {
                onClick: (e) => {
                  e.stopPropagation();
                  handleNavigation("/reportes");
                }
              })}
            >
              <Ionicons name="stats-chart-outline" size={22} color="#333" />
              <Text style={styles.menuItem}>Ver reportes</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuRow}
              onPress={exportarInventarioPDF}
              {...(Platform.OS === 'web' && {
                onClick: (e) => {
                  e.stopPropagation();
                  exportarInventarioPDF();
                }
              })}
            >
              <Ionicons name="document-text-outline" size={22} color="#4a90e2" />
              <Text style={[styles.menuItem, styles.menuItemHighlight]}>
                Exportar a PDF
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// Mantén los mismos estilos que ya tienes...
const styles = StyleSheet.create({
  // ... (todos tus estilos existentes se mantienen igual)
  container: { 
    flex: 1, 
    backgroundColor: "#f5f7fa", 
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
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
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
    ...Platform.select({
      web: {
        marginTop: 20,
      }
    })
  },
  title: { 
    fontSize: 28, 
    fontWeight: "800",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Platform.OS === 'web' ? '#f0f7ff' : 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        ':hover': {
          backgroundColor: '#e6f0ff',
        }
      }
    })
  },
  
  // Search - ESTILO ESPECIAL PARA EL INPUT
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        ':focus-within': {
          borderColor: '#4a90e2',
          shadowColor: '#4a90e2',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        }
      }
    })
  },
  searchIcon: {
    marginRight: 10,
  },
  search: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        fontSize: 16,
        cursor: 'text !important',
        userSelect: 'text !important',
        MozUserSelect: 'text',
        WebkitUserSelect: 'text',
        msUserSelect: 'text',
        outline: 'none',
        '&:focus': {
          outline: 'none',
          boxShadow: 'none',
        }
      }
    })
  },
  clearButton: {
    padding: 4,
    borderRadius: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        ':hover': {
          backgroundColor: '#f0f0f0',
        }
      }
    })
  },
  
  // ... (el resto de tus estilos se mantienen igual)
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 25,
    ...Platform.select({
      web: {
        flexWrap: 'wrap',
        gap: 10,
      }
    })
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
    ...Platform.select({
      web: {
        flex: '1 1 100px',
        minWidth: 100,
        maxWidth: 150,
        transition: 'transform 0.2s ease',
        ':hover': {
          transform: 'translateY(-2px)',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
        }
      }
    })
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4a90e2",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  
  // Main Content Area
  mainContent: {
    flex: 1,
    marginBottom: 20,
    ...Platform.select({
      web: {
        minHeight: 400,
      }
    })
  },
  
  // Products List
  productsList: {
    paddingHorizontal: 20,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  addFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a90e2",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 25,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#3a80d2',
          transform: 'translateY(-2px)',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
        }
      }
    })
  },
  addFirstButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  
  // Item
  item: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          transform: 'translateY(-2px)',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          borderColor: '#4a90e2',
        }
      }
    })
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  itemTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: "#e6f2ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4a90e2",
  },
  quantityContainer: {
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
  },
  quantityText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4a90e2",
  },
  quantityLabel: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },
  
  // Item Info
  itemInfo: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 50,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  
  // Prices
  pricesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    color: "#888",
    marginBottom: 4,
  },
  priceValueBuy: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  priceValueSell: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
  },
  
  // Item Footer
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    marginTop: 15,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#aaa",
  },
  arrowContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsText: {
    fontSize: 14,
    color: "#4a90e2",
    fontWeight: "500",
    marginRight: 4,
  },
  
  // List Footer
  listFooter: {
    height: 30,
  },
  
  // Bottom Spacer
  bottomSpacer: {
    height: 100,
  },
  
  // FAB Button
  fab: {
    position: "absolute",
    right: 25,
    bottom: 25,
    backgroundColor: "#4a90e2",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#3a80d2',
          transform: 'scale(1.05)',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
        }
      }
    })
  },
  
  // Modal
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
    width: 260,
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
    color: "#4a90e2",
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
    ...Platform.select({
      web: {
        cursor: 'pointer',
        ':hover': {
          backgroundColor: '#f5f7fa',
        }
      }
    })
  },
  menuItem: { 
    fontSize: 16, 
    fontWeight: "500", 
    color: '#333',
    marginLeft: 12,
  },
  menuItemHighlight: {
    fontWeight: "600",
    color: "#4a90e2",
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
  },
});