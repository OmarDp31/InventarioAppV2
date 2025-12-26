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
import { db } from "../firebase";
import { useAuth } from "../utils/AuthProvider";
import { generatePdfFromProducts, generatePdfFromTransactions } from "../utils/exportPdf";

export default function ExportarScreen() {
    return <Exportar />;
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
    const [menuVisible, setMenuVisible] = useState(false);

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
        { label: "Reporte de Ventas", value: "sales" },
        { label: "Reporte de Salidas Autorizadas", value: "outcomes" },
        { label: "Movimiento del día (Transacciones)", value: "daily_movements" },
    ];

    const seleccionarOpcion = (opcion) => {
        setMode(opcion.value);
        setModeLabel(opcion.label);
        setParam("");
        setPreview([]);
        setModalVisible(false);

        if (["all", "week", "sales", "outcomes", "daily_movements"].includes(opcion.value)) {
            cargarVistaPrevia(opcion.value, "");
        }
    };

    const cargarVistaPrevia = async (modo, parametro) => {
        setLoading(true);
        let data = [];

        try {
            if (!user?.uid) {
                Alert.alert("Error", "Usuario no autenticado");
                setLoading(false);
                return;
            }

            // LÓGICA DE INVENTARIO
            if (["all", "week", "category", "sku"].includes(modo)) {
                const col = collection(db, "users", user.uid, "inventario");

                if (modo === "all") {
                    const q = query(col, orderBy("nombre"));
                    const snap = await getDocs(q);
                    data = snap.docs.map((d) => ({
                        id: d.id, 
                        ...d.data(),
                        fechaDisplay: d.data().fechaCreacion 
                            ? new Date(d.data().fechaCreacion).toLocaleString() 
                            : "-"
                    }));
                } else if (modo === "week") {
                    const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    const q = query(col, where("fechaCreacion", ">=", semanaAtras), orderBy("fechaCreacion", "desc"));
                    const snap = await getDocs(q);
                    data = snap.docs.map((d) => ({
                        id: d.id, 
                        ...d.data(),
                        fechaDisplay: d.data().fechaCreacion 
                            ? new Date(d.data().fechaCreacion).toLocaleString() 
                            : "-"
                    }));
                } else if (modo === "category") {
                    // Búsqueda insensible a mayúsculas/minúsculas
                    const q = query(col, orderBy("nombre"));
                    const snap = await getDocs(q);
                    const searchTerm = parametro.trim().toLowerCase();
                    data = snap.docs
                        .map((d) => ({
                            id: d.id, 
                            ...d.data(),
                            fechaDisplay: d.data().fechaCreacion 
                                ? new Date(d.data().fechaCreacion).toLocaleString() 
                                : "-"
                        }))
                        .filter(item => 
                            item.categoria && 
                            item.categoria.toLowerCase() === searchTerm
                        );
                } else if (modo === "sku") {
                    const q = query(col, where("codigoSKU", "==", parametro.trim()));
                    const snap = await getDocs(q);
                    data = snap.docs.map((d) => ({
                        id: d.id, 
                        ...d.data(),
                        fechaDisplay: d.data().fechaCreacion 
                            ? new Date(d.data().fechaCreacion).toLocaleString() 
                            : "-"
                    }));
                }
            } 
            
            // LÓGICA DE TRANSACCIONES (VENTAS, SALIDAS, MOVIMIENTO DIARIO)
            else if (["sales", "outcomes", "daily_movements"].includes(modo)) {
                const col = collection(db, "users", user.uid, "ventas"); 

                // IMPORTANTE: Verificar primero qué datos existen en la colección
                console.log(`Cargando vista previa para modo: ${modo}`);
                
                // Primero obtenemos algunas transacciones para ver la estructura
                const testQuery = query(col, orderBy("fecha", "desc"), where("fecha", ">=", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()));
                const testSnap = await getDocs(testQuery);
                
                console.log(`Total transacciones encontradas (últimos 30 días): ${testSnap.size}`);
                
                if (testSnap.size > 0) {
                    // Mostrar la estructura de la primera transacción para debug
                    const primeraTrans = testSnap.docs[0].data();
                    console.log("Estructura de primera transacción:", {
                        tipoTransaccion: primeraTrans.tipoTransaccion,
                        tipo: primeraTrans.tipo,
                        fecha: primeraTrans.fecha,
                        nombre: primeraTrans.nombre
                    });
                }

                let q;
                
                if (modo === "daily_movements") {
                    // Movimientos del día (todas las transacciones del día actual)
                    const inicioDia = new Date();
                    inicioDia.setHours(0, 0, 0, 0);
                    const finDia = new Date(inicioDia);
                    finDia.setDate(finDia.getDate() + 1);
                    
                    q = query(
                        col, 
                        where("fecha", ">=", inicioDia.toISOString()),
                        where("fecha", "<", finDia.toISOString()),
                        orderBy("fecha", "desc")
                    );
                } else if (modo === "sales") {
                    // IMPORTANTE: Buscamos por tipoTransaccion === "Venta"
                    const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    
                    q = query(
                        col, 
                        where("tipoTransaccion", "==", "Venta"),
                        where("fecha", ">=", semanaAtras),
                        orderBy("fecha", "desc")
                    );
                    console.log("Buscando ventas con filtro: tipoTransaccion = 'Venta'");
                } else if (modo === "outcomes") {
                    // IMPORTANTE: Buscamos por tipoTransaccion === "Salida Autorizada"
                    const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    
                    q = query(
                        col, 
                        where("tipoTransaccion", "==", "Salida Autorizada"),
                        where("fecha", ">=", semanaAtras),
                        orderBy("fecha", "desc")
                    );
                    console.log("Buscando salidas con filtro: tipoTransaccion = 'Salida Autorizada'");
                }

                const snap = await getDocs(q); 
                console.log(`Transacciones encontradas para ${modo}: ${snap.size}`);
                
                data = snap.docs.map((d) => {
                    const item = d.data();
                    console.log(`Transacción ${d.id}:`, {
                        tipoTransaccion: item.tipoTransaccion,
                        tipo: item.tipo,
                        nombre: item.nombre,
                        fecha: item.fecha
                    });
                    
                    return { 
                        id: d.id, 
                        ...item,
                        fechaDisplay: item.fecha 
                            ? new Date(item.fecha).toLocaleString('es-ES', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            }) 
                            : "-"
                    };
                });
            } else {
                setLoading(false);
                return;
            }

            setPreview(data);

            if (data.length === 0) {
                let mensaje = "No hay datos para ese filtro.";
                if (modo === "sales") {
                    mensaje = "No hay ventas registradas en la última semana.";
                } else if (modo === "outcomes") {
                    mensaje = "No hay salidas autorizadas en la última semana.";
                } else if (modo === "daily_movements") {
                    mensaje = "No hay movimientos registrados hoy.";
                }
                Alert.alert("Vista previa", mensaje);
            }
        } catch (err) {
            console.error("Error al cargar vista previa:", err);
            Alert.alert("Error", "No fue posible cargar la vista previa. Verifica la estructura de los datos.");
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
            let title = modeLabel;
            
            if (mode === "category") {
                title = `Inventario - Categoría: ${param}`;
            } else if (mode === "sku") {
                title = `Inventario - SKU: ${param}`;
            }

            if (["all", "week", "category", "sku"].includes(mode)) {
                await generatePdfFromProducts(preview, title);
            } else if (["sales", "outcomes", "daily_movements"].includes(mode)) {
                await generatePdfFromTransactions(preview, title);
            } else {
                Alert.alert("Error", "Tipo de reporte desconocido.");
            }

        } catch (err) {
            console.error(err);
            Alert.alert("Error", "No fue posible generar el PDF.");
        } finally {
            setLoading(false);
        }
    };

    const handleNavigation = (route) => {
        setMenuVisible(false);
        router.push(route);
    };

    const previewContainerStyle =
        Platform.OS === "web"
            ? { maxHeight: "50vh", overflowY: "auto", marginTop: 8 }
            : { maxHeight: 300, marginTop: 8 };
            
    const renderPreviewItem = (p) => {
        if (["all", "week", "category", "sku"].includes(mode) || mode === "") {
            return (
                <>
                    <Text style={{ fontWeight: "600" }}>
                        {p.nombre} ({p.codigoSKU ?? p.codigo ?? "-"})
                    </Text>
                    <Text>{p.categoria} — Cant: {p.cantidad}</Text>
                    <Text style={{ fontSize: 12, color: "#666" }}>
                        Fecha: {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleString() : "-"}
                    </Text>
                </>
            );
        } else if (["sales", "outcomes", "daily_movements"].includes(mode)) {
            const isVenta = p.tipoTransaccion === 'Venta';
            const totalDisplay = isVenta ? ` | Total: $${(p.total || 0).toFixed(2)}` : '';
            return (
                <>
                    <Text style={{ fontWeight: "600" }}>
                        {p.nombre} ({p.tipoTransaccion})
                    </Text>
                    <Text>
                        Cant: {p.cantidad} 
                        {totalDisplay}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#666" }}>
                        Fecha: {p.fechaDisplay}
                    </Text>
                </>
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* --- Encabezado con menú hamburguesa --- */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Exportar Reportes</Text>
                    <Text style={styles.subtitle}>Generar documentos PDF</Text>
                </View>
                
                <TouchableOpacity 
                    onPress={() => setMenuVisible(true)}
                    style={styles.menuButton}
                >
                    <Ionicons name="menu" size={30} color="#4a90e2" />
                </TouchableOpacity>
            </View>

            <View className="no-print" style={styles.content}>
                {/* Selector de tipo de reporte */}
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <View style={styles.selector}>
                        <Text style={styles.selectorText}>{modeLabel}</Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </View>
                </TouchableOpacity>

                {/* Modal para seleccionar tipo de reporte */}
                <Modal visible={modalVisible} transparent animationType="fade">
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        onPress={() => setModalVisible(false)}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Seleccionar tipo de reporte</Text>
                            <FlatList
                                data={opciones}
                                keyExtractor={(item) => item.value}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => seleccionarOpcion(item)}
                                        style={styles.option}
                                    >
                                        <Text style={styles.optionText}>{item.label}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Campo de búsqueda para categoría o SKU */}
                {(mode === "category" || mode === "sku") && (
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={
                                mode === "category"
                                    ? "Escribe la categoría (ej: Electrónica)"
                                    : "Escribe el código SKU"
                            }
                            placeholderTextColor="#999"
                            value={param}
                            onChangeText={setParam}
                            onSubmitEditing={() => cargarVistaPrevia(mode, param)}
                        />
                        <TouchableOpacity
                            onPress={() => cargarVistaPrevia(mode, param)}
                            style={styles.searchButton}
                        >
                            <Ionicons name="search" size={20} color="#fff" />
                            <Text style={styles.searchButtonText}>Buscar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Botón para generar PDF */}
                <TouchableOpacity
                    onPress={generarPDF}
                    disabled={loading || preview.length === 0}
                    style={[
                        styles.generateButton,
                        preview.length > 0 ? styles.buttonActive : styles.buttonInactive,
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="document-text-outline" size={22} color="#fff" />
                            <Text style={styles.generateButtonText}>GENERAR PDF</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Vista previa */}
                <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>
                        Vista previa del informe ({preview.length} elementos)
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4a90e2" />
                        <Text style={styles.loadingText}>Cargando vista previa...</Text>
                    </View>
                ) : preview.length === 0 ? (
                    <View style={styles.emptyPreview}>
                        <Ionicons name="document-outline" size={60} color="#e0e0e0" />
                        <Text style={styles.emptyText}>No hay datos para la vista previa</Text>
                        <Text style={styles.emptySubtext}>
                            {mode === "" 
                                ? "Selecciona un tipo de reporte" 
                                : mode === "sales" 
                                    ? "No hay ventas registradas en la última semana"
                                    : mode === "outcomes"
                                        ? "No hay salidas autorizadas en la última semana"
                                        : mode === "daily_movements"
                                            ? "No hay movimientos registrados hoy"
                                            : "No hay datos que coincidan con tu búsqueda"}
                        </Text>
                    </View>
                ) : (
                    <View style={previewContainerStyle}>
                        {preview.map((p) => (
                            <View
                                key={p.id}
                                style={styles.previewItem}
                            >
                                {renderPreviewItem(p)}
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* MODAL DEL MENÚ HAMBURGUESA - CORREGIDO PARA IR A /ventas */}
            <Modal 
                visible={menuVisible} 
                transparent 
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={styles.menuBox}>
                        <Text style={styles.menuHeader}>Navegación</Text>
                        <View style={styles.menuDivider} />
                        
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => handleNavigation("/")}
                        >
                            <Ionicons name="home-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Volver a inicio</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => handleNavigation("/formulario")}
                        >
                            <Ionicons name="add-circle-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Añadir producto</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => handleNavigation("/inventario")}
                        >
                            <Ionicons name="cube-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Ver inventario</Text>
                        </TouchableOpacity>
                        
                        {/* CORRECCIÓN: Botón para registrar venta/salida - DEBE IR A /ventas */}
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => handleNavigation("/ventas")}
                        >
                            <Ionicons name="cash-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Registrar venta/salida</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => handleNavigation("/reportes")}
                        >
                            <Ionicons name="stats-chart-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Ver reportes</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
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
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 25,
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
        padding: 5,
    },
    
    // Content
    content: {
        paddingHorizontal: 20,
        flex: 1,
    },
    
    // Selector
    selector: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 15,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    selectorText: {
        fontSize: 16,
        color: "#333",
    },
    
    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: "#fff",
        marginHorizontal: 30,
        borderRadius: 14,
        padding: 10,
        maxHeight: "70%",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#4a90e2",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    option: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    optionText: {
        fontSize: 16,
        color: "#333",
    },
    
    // Search Container
    searchContainer: {
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: "#e0e0e0",
        padding: 14,
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: "#fff",
        color: "#333",
        marginBottom: 10,
    },
    searchButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4a90e2",
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: '#4a90e2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    searchButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },
    
    // Generate Button
    generateButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 25,
    },
    buttonActive: {
        backgroundColor: "#4a90e2",
        shadowColor: '#4a90e2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonInactive: {
        backgroundColor: "#ccc",
    },
    generateButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
        marginLeft: 10,
    },
    
    // Preview
    previewHeader: {
        marginBottom: 15,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
    },
    previewItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
        borderRadius: 8,
        marginBottom: 8,
    },
    
    // Loading
    loadingContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
    },
    
    // Empty State
    emptyPreview: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f0f0f0",
        marginTop: 10,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginTop: 15,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#888",
        textAlign: "center",
        marginTop: 5,
        paddingHorizontal: 20,
    },
    
    // Menu Hamburguesa
    menuOverlay: {
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
    },
    menuItem: { 
        fontSize: 16, 
        fontWeight: "500", 
        color: '#333',
        marginLeft: 12,
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 5,
    },
});