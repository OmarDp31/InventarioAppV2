// app/index.js (página principal)
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { db } from "../firebase";
import { useAuth } from "../utils/AuthProvider";

export default function Index() {
    const { user, initializing, signOut } = useAuth();
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [items, setItems] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [menuVisible, setMenuVisible] = useState(false);
    const [fabMenuVisible, setFabMenuVisible] = useState(false);

    // Redirección si no está logueado
    useEffect(() => {
        if (!initializing && !user) {
            router.replace("/login");
        }
    }, [user, initializing]);

    // Cargar inventario MULTIUSUARIO
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

    // Búsqueda por nombre o SKU
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

    // FUNCIÓN DE CERRAR SESIÓN CON CONFIRMACIÓN
    const handleLogout = () => {
        setMenuVisible(false);

        const performLogout = async () => {
            try {
                await signOut();
                router.replace("/login");
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                Alert.alert("Error", "No se pudo cerrar la sesión. Intenta de nuevo.");
            }
        };

        if (Platform.OS === "web") {
            const ok = window.confirm("¿Estás seguro de que deseas cerrar sesión?");
            if (ok) {
                performLogout();
            }
            return;
        }

        Alert.alert(
            "Confirmar Salida",
            "¿Estás seguro de que deseas cerrar sesión?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Cerrar Sesión", 
                    style: "destructive", 
                    onPress: performLogout,
                },
            ]
        );
    };

    if (initializing || !user) return null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* 1. Header Fijo con Título Mejorado */}
                <View style={styles.header}>
                    {/* Título más atractivo y prominente */}
                    <Text style={styles.title}>Invent<Text style={styles.titleAccent}>-Go</Text></Text>
                    
                    <TouchableOpacity onPress={() => setMenuVisible(true)}>
                        <Ionicons name="menu" size={30} color="#007aff" />
                    </TouchableOpacity>
                </View>

                {/* 2. Barra de búsqueda Fija */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Buscar por código SKU o nombre..."
                        placeholderTextColor="#999"
                        value={search}
                        onChangeText={onChangeSearch}
                        style={styles.searchInput}
                    />
                </View>

                {/* 3. Contenido Principal con ScrollView */}
                {search.trim().length === 0 || filtered.length === 0 ? (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        
                        {/* Tarjeta 1: Venta/Salidas */}
                        <TouchableOpacity
                            style={[styles.card, styles.cardVentas]}
                            onPress={() => router.push("/ventas")}
                        >
                            <Ionicons name="cart-outline" size={32} color="#007aff" />
                            <View style={styles.cardTextBox}>
                                <Text style={styles.cardTitle}>Registrar Venta / Salida</Text>
                                <Text style={styles.cardSub}>Descontar productos del inventario</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#ccc" />
                        </TouchableOpacity>
                        
                        {/* Tarjeta 2: Reportes */}
                        <TouchableOpacity
                            style={[styles.card, styles.cardReportes]}
                            onPress={() => router.push("/reportes")}
                        >
                            <Ionicons name="stats-chart-outline" size={32} color="#34C759" />
                            <View style={styles.cardTextBox}>
                                <Text style={styles.cardTitle}>Ver Reportes</Text>
                                <Text style={styles.cardSub}>Estadísticas y resumen de ventas</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#ccc" />
                        </TouchableOpacity>

                        {/* Tarjeta 3: Añadir producto */}
                        <TouchableOpacity
                            style={[styles.card, styles.cardAnadir]}
                            onPress={() => router.push("/formulario")}
                        >
                            <Ionicons name="add-circle-outline" size={32} color="#FF9500" />
                            <View style={styles.cardTextBox}>
                                <Text style={styles.cardTitle}>Añadir producto</Text>
                                <Text style={styles.cardSub}>Crear nuevo producto</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#ccc" />
                        </TouchableOpacity>

                        {/* Tarjeta 4: Ver inventario */}
                        <TouchableOpacity
                            style={[styles.card, styles.cardInventario]}
                            onPress={() => router.push("/inventario")}
                        >
                            <Ionicons name="cube-outline" size={32} color="#5856D6" />
                            <View style={styles.cardTextBox}>
                                <Text style={styles.cardTitle}>Ver inventario</Text>
                                <Text style={styles.cardSub}>Listado completo de productos</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#ccc" />
                        </TouchableOpacity>

                        {/* Tarjeta 5: Exportar PDF */}
                        <TouchableOpacity
                            style={[styles.card, styles.cardExportar]}
                            onPress={() => router.push("/exportar")}
                        >
                            <Ionicons name="document-text-outline" size={32} color="#FF3B30" />
                            <View style={styles.cardTextBox}>
                                <Text style={styles.cardTitle}>Exportar PDF</Text>
                                <Text style={styles.cardSub}>Generar PDF del inventario</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#ccc" />
                        </TouchableOpacity>
                        
                        <View style={{ height: 80 }} /> 
                        
                    </ScrollView>
                ) : (
                    // 4. Lista de resultados de búsqueda (Si hay búsqueda activa)
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

                {/* Si no hay resultados */}
                {search.trim().length > 0 && filtered.length === 0 && (
                    <Text style={styles.noResultsText}>
                        No se encontraron productos
                    </Text>
                )}

                {/* 5. Botón flotante FAB (Trigger de menú) */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setFabMenuVisible(true)}
                >
                    <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>
                
                {/* 6. Modal para el Menú Desplegable del FAB */}
                <Modal visible={fabMenuVisible} transparent animationType="fade">
                    <TouchableOpacity
                        style={styles.modalFabOverlay}
                        activeOpacity={1}
                        onPress={() => setFabMenuVisible(false)}
                    >
                        <View style={styles.fabMenuBox}>
                            <TouchableOpacity 
                                style={styles.fabMenuItem} 
                                onPress={() => {
                                    setFabMenuVisible(false);
                                    router.push("/ventas");
                                }}
                            >
                                <Ionicons name="arrow-up-circle-outline" size={20} color="#007aff" style={styles.fabMenuIcon} />
                                <Text style={styles.fabMenuText}>Registrar Venta/Salida</Text>
                            </TouchableOpacity>
                            <View style={styles.fabMenuDivider} />
                            <TouchableOpacity 
                                style={styles.fabMenuItem} 
                                onPress={() => {
                                    setFabMenuVisible(false);
                                    router.push("/formulario");
                                }}
                            >
                                <Ionicons name="create-outline" size={20} color="#FF9500" style={styles.fabMenuIcon} />
                                <Text style={styles.fabMenuText}>Añadir Producto</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Menú lateral (hamburguesa superior) */}
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
                            <Text style={styles.menuHeader}>Cuenta</Text>
                            <View style={styles.menuDivider} />
                            
                            <TouchableOpacity 
                                style={styles.menuRow}
                                onPress={() => {
                                    setMenuVisible(false);
                                    router.push("/inventario");
                                }}
                            >
                                <Ionicons name="cube-outline" size={20} color="#333" />
                                <Text style={styles.menuItem}>Ver Inventario</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.menuRow}
                                onPress={() => {
                                    setMenuVisible(false);
                                    router.push("/reportes");
                                }}
                            >
                                <Ionicons name="stats-chart-outline" size={20} color="#333" />
                                <Text style={styles.menuItem}>Reportes</Text>
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />
                            
                            <TouchableOpacity 
                                style={styles.menuRow}
                                onPress={handleLogout}
                            >
                                <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
                                <Text style={[styles.menuItem, { color: '#ff3b30' }]}>
                                    Cerrar Sesión
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Fondo blanco limpio para todo
    },
    container: { 
        flex: 1, 
        paddingHorizontal: 16, 
        backgroundColor: '#fcfcfc', // Fondo base ligeramente gris (Versión 2.0)
    },
    
    // --- Header y Título Mejorados (Versión 2.1) ---
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: 'center',
        marginBottom: 15,
        paddingTop: Platform.OS === 'android' ? 10 : 0, 
    },
    title: { 
        fontSize: 36, // Título grande
        fontWeight: "900", // Extra bold
        color: '#1a1a1a', // Color oscuro para impacto
        letterSpacing: -0.5, 
    },
    titleAccent: {
        color: '#007aff', // Azul de acento (Se puede cambiar a un verde o naranja si se desea)
        fontWeight: "900",
    },
    
    // Contenedor de Búsqueda
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 12,
        paddingHorizontal: 10,
        marginBottom: 20,
        backgroundColor: '#fff',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#000',
    },
    
    scrollContent: {
        paddingBottom: 20, 
    },
    
    // Tarjeta de Navegación (Estilo de la Versión 2.0 que te gustó)
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#fff",
        padding: 18,
        borderRadius: 12,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: '#007aff', 
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    // Colores de Borde específicos
    cardVentas: { borderLeftColor: '#007aff' }, 
    cardReportes: { borderLeftColor: '#34C759' },
    cardAnadir: { borderLeftColor: '#FF9500' }, 
    cardInventario: { borderLeftColor: '#5856D6' }, 
    cardExportar: { borderLeftColor: '#FF3B30' }, 
    
    cardTextBox: {
        flex: 1,
        marginLeft: 15,
    },
    cardTitle: { 
        fontSize: 17, 
        fontWeight: "600",
        color: '#1a1a1a' 
    },
    cardSub: { 
        fontSize: 13, 
        color: "#777",
        marginTop: 2,
    },
    
    // Resultados de Búsqueda
    resultList: { maxHeight: 250, paddingHorizontal: 4, },
    resultItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultName: { fontWeight: "600", color: '#000', flex: 1, },
    resultSku: { fontSize: 13, color: "#555", marginLeft: 10, },
    noResultsText: {
        textAlign: "center", 
        marginTop: 20, 
        color: '#999',
        fontSize: 16,
    },

    // FAB y Modals
    fab: {
        position: "absolute",
        bottom: 30,
        right: 30,
        backgroundColor: "#007aff",
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    modalFabOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    fabMenuBox: {
        position: 'absolute',
        bottom: 100,
        right: 25,
        backgroundColor: "#fff",
        padding: 5,
        borderRadius: 10,
        width: 250,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    fabMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    fabMenuIcon: {
        marginRight: 10,
    },
    fabMenuText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    fabMenuDivider: {
        height: 1,
        backgroundColor: '#eee',
        marginHorizontal: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: 'flex-start',
        alignItems: "flex-end",
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingRight: 10,
    },
    menuBox: {
        backgroundColor: "#fff",
        width: 200,
        padding: 10,
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    menuHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007aff',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 5,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    menuItem: { 
        fontSize: 16, 
        fontWeight: "500", 
        color: '#333',
        marginLeft: 10,
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 5,
    }
});