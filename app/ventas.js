// app/ventas.js 
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    limit,
    query,
    updateDoc
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

export default function VentasScreen() {
    return <Ventas />;
}

const generateTempId = () =>
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 5);

// ============ INPUTS INDEPENDIENTES PARA MÓVIL ============
const CantidadInput = React.memo(({ 
    value, 
    onChange, 
    onSubmitEditing,
    returnKeyType,
    placeholder,
    inputRef
}) => {
    const [localValue, setLocalValue] = useState(value || "");
    
    // Sincronizar con el valor externo
    useEffect(() => {
        setLocalValue(value || "");
    }, [value]);
    
    const handleChange = (text) => {
        setLocalValue(text);
        onChange(text);
    };
    
    return (
        <TextInput
            ref={inputRef}
            placeholder={placeholder}
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={[styles.inputSmall, { marginRight: 8 }]}
            value={localValue}
            onChangeText={handleChange}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={false}
        />
    );
});

const PrecioInput = React.memo(({ 
    value, 
    onChange, 
    onSubmitEditing,
    returnKeyType,
    placeholder,
    editable,
    inputRef
}) => {
    const [localValue, setLocalValue] = useState(value || "");
    
    // Sincronizar con el valor externo
    useEffect(() => {
        setLocalValue(value || "");
    }, [value]);
    
    const handleChange = (text) => {
        setLocalValue(text);
        onChange(text);
    };
    
    return (
        <TextInput
            ref={inputRef}
            placeholder={placeholder}
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={[styles.inputSmall, !editable && styles.inputDisabled]}
            value={localValue}
            onChangeText={handleChange}
            editable={editable}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={false}
        />
    );
});

// ============ COMPONENTE PRINCIPAL OPTIMIZADO ============
function Ventas() {
    const { user } = useAuth();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [resultados, setResultados] = useState([]);
    const [productos, setProductos] = useState([]);
    const [tipo, setTipo] = useState("Venta");
    const [menuVisible, setMenuVisible] = useState(false); 
    const [guardando, setGuardando] = useState(false);
    
    const searchInputRef = useRef(null);
    const cantidadInputRefs = useRef([]);
    const precioInputRefs = useRef([]);
    const searchTimeoutRef = useRef(null);
    
    // Función auxiliar para mostrar alertas compatibles con web
    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };
    
    // Búsqueda optimizada
    const handleSearch = (text) => {
        setSearch(text);
        
        if (!user || !user.uid || !text.trim()) {
            setResultados([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            const qText = text.trim().toLowerCase();
            
            try {
                const ref = collection(db, "users", user.uid, "inventario");
                const q = query(ref, limit(15));
                const snap = await getDocs(q);

                const resultadosFiltrados = snap.docs
                    .map((d) => ({
                        id: d.id,
                        ...d.data(),
                    }))
                    .filter((item) => {
                        const nombre = item.nombre?.toLowerCase() || "";
                        const sku = item.codigoSKU?.toLowerCase() || "";
                        
                        return nombre.includes(qText) || sku.includes(qText);
                    })
                    .slice(0, 8);

                setResultados(resultadosFiltrados);
            } catch (error) {
                console.error("Error en búsqueda:", error);
                setResultados([]);
            }
        }, 250);
    };
    
    // Cálculo de total optimizado
    const calcularTotal = () => {
        if (tipo !== "Venta" || productos.length === 0) return 0;
        let total = 0;
        for (let i = 0; i < productos.length; i++) {
            const item = productos[i];
            const cantidad = Number(item.cantidad) || 0;
            const precio = Number(item.precio) || 0;
            total += cantidad * precio;
        }
        return total;
    };

    const esMultiVenta = productos.length > 1;

    // ============ FUNCIONES PRINCIPALES ============
    
    const agregarProducto = (producto) => {
        const itemId = producto.id || generateTempId();

        if (producto.id && productos.find(p => p.productoInventarioId === producto.id)) {
            showAlert("Ya agregado", "Este producto ya está en la lista");
            return;
        }

        const nuevoProducto = {
            id: itemId,
            nombre: producto.nombre,
            cantidad: "",
            precio: producto.precioVenta ? producto.precioVenta.toString() : "",
            productoInventarioId: producto.id || null,
            cantidadDisponible: producto.cantidad || 0,
        };

        setProductos(prev => [...prev, nuevoProducto]);
        setSearch("");
        setResultados([]);
        
        // Enfocar después de que se renderice
        setTimeout(() => {
            const index = productos.length;
            if (cantidadInputRefs.current[index]) {
                cantidadInputRefs.current[index].focus();
            }
        }, 150);
    };

    const agregarProductoManual = () => {
        if (!search.trim()) {
            showAlert("Error", "Ingresa el nombre del producto");
            return;
        }
        agregarProducto({
            nombre: search.trim(),
            id: null,
            precioVenta: "",
            cantidad: 0,
        });
    };

    const actualizarProducto = (index, campo, valor) => {
        setProductos(prev => {
            const nuevos = [...prev];
            nuevos[index] = {
                ...nuevos[index],
                [campo]: valor
            };
            return nuevos;
        });
    };

    const eliminarProducto = (index) => {
        const showDeleteAlert = () => {
            if (Platform.OS === 'web') {
                if (window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
                    eliminarProductoConfirmado(index);
                }
            } else {
                Alert.alert(
                    "Confirmar Eliminación",
                    "¿Estás seguro de que quieres eliminar este producto?",
                    [
                        { text: "Cancelar", style: "cancel" },
                        { 
                            text: "Eliminar", 
                            style: "destructive", 
                            onPress: () => eliminarProductoConfirmado(index)
                        },
                    ]
                );
            }
        };
        
        const eliminarProductoConfirmado = (index) => {
            // Eliminar refs
            cantidadInputRefs.current.splice(index, 1);
            precioInputRefs.current.splice(index, 1);
            
            // Reindexar refs restantes
            const nuevasCantidadRefs = [];
            const nuevasPrecioRefs = [];
            
            for (let i = 0; i < cantidadInputRefs.current.length; i++) {
                if (i < index) {
                    nuevasCantidadRefs[i] = cantidadInputRefs.current[i];
                    nuevasPrecioRefs[i] = precioInputRefs.current[i];
                } else if (i > index) {
                    nuevasCantidadRefs[i-1] = cantidadInputRefs.current[i];
                    nuevasPrecioRefs[i-1] = precioInputRefs.current[i];
                }
            }
            
            cantidadInputRefs.current = nuevasCantidadRefs;
            precioInputRefs.current = nuevasPrecioRefs;
            
            // Eliminar producto
            setProductos(prev => prev.filter((_, i) => i !== index));
        };
        
        showDeleteAlert();
    };

    // ============ GUARDAR VENTA CORREGIDO ============
    const guardarVenta = async () => {
        if (guardando) return;
        
        // Validar antes de cambiar estado
        if (!user || !user.uid) {
            showAlert("Error", "Usuario no autenticado");
            return;
        }
        
        if (productos.length === 0) {
            showAlert("Validación", "Agrega al menos un producto");
            return;
        }

        // Validar todos los productos
        const productosValidos = [];
        const actualizacionesInventario = [];
        let totalGeneral = 0;
        
        for (let i = 0; i < productos.length; i++) {
            const producto = productos[i];
            const cantidad = Number(producto.cantidad);
            const precio = tipo === "Venta" ? Number(producto.precio) : 0;
            
            // Validaciones
            if (!producto.nombre?.trim()) {
                showAlert("Error", `El producto necesita un nombre`);
                return;
            }
            
            if (!cantidad || cantidad <= 0) {
                showAlert("Error", `Cantidad inválida para "${producto.nombre}"`);
                return;
            }
            
            if (producto.productoInventarioId && cantidad > producto.cantidadDisponible) {
                showAlert("Error de Stock", `Excede stock disponible (${producto.cantidadDisponible}) para "${producto.nombre}"`);
                return;
            }
            
            if (tipo === "Venta" && (!precio || precio < 0)) {
                showAlert("Error", `Precio inválido para "${producto.nombre}"`);
                return;
            }
            
            const total = tipo === "Venta" ? cantidad * precio : 0;
            totalGeneral += total;
            
            productosValidos.push({
                productoId: producto.productoInventarioId,
                nombre: producto.nombre,
                cantidad,
                precioUnitario: tipo === "Venta" ? precio : 0,
                total,
                tipo: producto.productoInventarioId ? "Inventario" : "Manual",
            });
            
            if (producto.productoInventarioId) {
                actualizacionesInventario.push({
                    id: producto.productoInventarioId,
                    cantidad: producto.cantidadDisponible - cantidad,
                });
            }
        }
        
        // Si todo está validado, proceder a guardar
        setGuardando(true);
        
        try {
            // 1. Guardar la venta principal
            const ventaData = {
                tipoTransaccion: tipo === "Venta" ? "Venta" : "Salida Autorizada",
                fecha: new Date().toISOString(),
                productos: productosValidos,
                totalVenta: tipo === "Venta" ? totalGeneral : 0,
                cantidadProductos: productosValidos.length,
                esMultiVenta: productos.length > 1,
            };
            
            await addDoc(collection(db, "users", user.uid, "ventas"), ventaData);
            
            // 2. Actualizar inventarios (en segundo plano, no bloqueante)
            if (actualizacionesInventario.length > 0) {
                // Usar Promise.allSettled para que una falla no detenga las demás
                const inventarioPromises = actualizacionesInventario.map(async (actualizacion) => {
                    try {
                        const inventarioRef = doc(db, "users", user.uid, "inventario", actualizacion.id);
                        await updateDoc(inventarioRef, {
                            cantidad: actualizacion.cantidad,
                        });
                    } catch (inventarioError) {
                        console.warn("Error al actualizar inventario, pero continuamos:", inventarioError);
                    }
                });
                
                // No esperamos, se ejecuta en background
                Promise.allSettled(inventarioPromises)
                    .then(() => console.log("Inventarios actualizados"))
                    .catch(() => console.log("Algunos inventarios no se actualizaron"));
            }
            
            // 3. Mostrar mensaje de éxito
            const mensajeExito = productos.length > 1
                ? ` ${productos.length} productos ${tipo === "Venta" ? "vendidos" : "registrados"}\n Total: $${totalGeneral.toFixed(2)}`
                : ` ${tipo === "Venta" ? "Venta" : "Salida"} registrada\n ${productos[0].nombre}\n $${totalGeneral.toFixed(2)}`;
            
            // Función para limpiar y navegar
            const handleSuccess = () => {
                setProductos([]);
                setSearch("");
                setResultados([]);
                cantidadInputRefs.current = [];
                precioInputRefs.current = [];
                setGuardando(false);
                router.replace("/");
            };
            
            // Mostrar alerta según plataforma
            if (Platform.OS === 'web') {
                // En web, usar window.alert y luego limpiar
                window.alert(`OPERACIÓN EXITOSA\n\n${mensajeExito}`);
                handleSuccess();
            } else {
                // En móvil, usar Alert.alert normal
                Alert.alert(
                    "OPERACIÓN EXITOSA",
                    mensajeExito,
                    [{
                        text: "CONTINUAR",
                        onPress: handleSuccess
                    }]
                );
            }
            
        } catch (error) {
            console.error("ERROR al guardar venta:", error);
            setGuardando(false);
            
            // Mensaje de error específico
            let mensajeError = "Error al guardar la venta";
            
            if (error.code === 'unavailable' || error.message.includes('network')) {
                mensajeError = " Sin conexión a internet";
            } else if (error.code === 'permission-denied') {
                mensajeError = " No tienes permisos para esta acción";
            } else if (error.message.includes('timeout')) {
                mensajeError = " La operación tardó demasiado";
            } else {
                mensajeError = " Error interno. Intenta nuevamente";
            }
            
            showAlert("ERROR", `${mensajeError}\n\nVerifica tu conexión e intenta de nuevo.`);
        }
    };

    const exportarAPDF = () => {
        setMenuVisible(false);
        router.push("/exportar");
    };

    const total = calcularTotal();

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView 
                style={{ flex: 1, backgroundColor: "#f5f7fa" }}
                contentContainerStyle={{ paddingBottom: 30 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>
                            Registrar {tipo}
                        </Text>
                        <Text style={styles.subtitle}>
                            {tipo === "Venta" ? "Registrar venta de productos" : "Registrar salida autorizada"}
                        </Text>
                    </View>

                    <TouchableOpacity 
                        onPress={() => setMenuVisible(true)}
                        style={styles.menuButton}
                    >
                        <Ionicons name="menu" size={30} color="#4a90e2" />
                    </TouchableOpacity>
                </View>

                {/* Selector de Tipo */}
                <View style={styles.typeSelectorContainer}>
                    <TouchableOpacity
                        style={[
                            styles.typeButton,
                            tipo === "Venta" && styles.typeButtonActiveVenta,
                        ]}
                        onPress={() => {
                            setTipo("Venta");
                            setSearch("");
                            setResultados([]);
                        }}
                    >
                        <Ionicons name="cart-outline" size={20} color={tipo === "Venta" ? "#fff" : "#4a90e2"} />
                        <Text style={[
                            styles.typeButtonText,
                            tipo === "Venta" && styles.typeButtonTextActive,
                        ]}>
                            Venta
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.typeButton,
                            tipo === "Salida" && styles.typeButtonActiveSalida,
                        ]}
                        onPress={() => {
                            setTipo("Salida");
                            setSearch("");
                            setResultados([]);
                        }}
                    >
                        <Ionicons name="log-out-outline" size={20} color={tipo === "Salida" ? "#fff" : "#FF9500"} />
                        <Text style={[
                            styles.typeButtonText,
                            tipo === "Salida" && styles.typeButtonTextActive,
                        ]}>
                            Salida Autorizada
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Búsqueda */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        ref={searchInputRef}
                        placeholder="Buscar producto por nombre o SKU"
                        placeholderTextColor="#999"
                        style={styles.searchInput}
                        value={search}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                            if (resultados.length === 0 && search.trim()) {
                                agregarProductoManual();
                            }
                        }}
                    />
                </View>

                {/* Resultados */}
                {resultados.length > 0 && (
                    <View style={styles.resultadosContainer}>
                        {resultados.map((item, idx) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.result}
                                onPress={() => agregarProducto(item)}
                            >
                                <View style={styles.resultContent}>
                                    <Text style={styles.resultText}>
                                        {item.nombre}
                                    </Text>
                                    <View style={styles.resultDetails}>
                                        <Text style={styles.resultStock}>
                                            Stock: {item.cantidad ?? 0}
                                        </Text>
                                        {tipo === "Venta" && item.precioVenta && (
                                            <Text style={styles.resultPrice}>
                                                ${Number(item.precioVenta).toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <Ionicons name="add-circle" size={24} color="#4a90e2" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Agregar manualmente */}
                {search.trim() !== "" && resultados.length === 0 && (
                    <TouchableOpacity
                        style={styles.manualButton}
                        onPress={agregarProductoManual}
                    >
                        <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.manualButtonText}>
                            Agregar "{search}" manualmente
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Productos agregados */}
                {productos.length > 0 && (
                    <>
                        <View style={styles.subtitleContainer}>
                            <Text style={styles.subtitleText}>
                                {esMultiVenta ? "Productos en multi-venta:" : "Producto a vender:"}
                            </Text>
                            {tipo === 'Venta' && (
                                <View style={styles.totalSummary}>
                                    <Text style={styles.totalSummaryText}>
                                        Total: ${total.toFixed(2)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.mainScroll}>
                            {productos.map((producto, index) => {
                                const isVenta = tipo === "Venta";
                                
                                const handleSubmitCantidad = () => {
                                    if (isVenta && precioInputRefs.current[index]) {
                                        precioInputRefs.current[index].focus();
                                    } else if (index < productos.length - 1 && cantidadInputRefs.current[index + 1]) {
                                        cantidadInputRefs.current[index + 1].focus();
                                    }
                                };
                                
                                const handleSubmitPrecio = () => {
                                    if (index < productos.length - 1 && cantidadInputRefs.current[index + 1]) {
                                        cantidadInputRefs.current[index + 1].focus();
                                    }
                                };
                                
                                return (
                                    <View key={producto.id} style={styles.ventaItem}>
                                        <View style={styles.ventaHeader}>
                                            <View style={styles.ventaNombreContainer}>
                                                <Text style={styles.ventaNombre} numberOfLines={1}>
                                                    {producto.nombre} {producto.productoInventarioId
                                                        ? `(Stock: ${producto.cantidadDisponible})`
                                                        : "(Manual)"}
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => eliminarProducto(index)}
                                                style={styles.deleteButton}
                                            >
                                                <Ionicons name="close-circle-outline" size={22} color="#fff" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.inputRow}>
                                            {/* INPUT CANTIDAD */}
                                            <CantidadInput
                                                value={producto.cantidad}
                                                onChange={(text) => actualizarProducto(index, "cantidad", text)}
                                                onSubmitEditing={handleSubmitCantidad}
                                                returnKeyType={isVenta ? "next" : (index < productos.length - 1 ? "next" : "done")}
                                                placeholder="Cantidad"
                                                inputRef={el => cantidadInputRefs.current[index] = el}
                                            />
                                            
                                            {/* INPUT PRECIO */}
                                            <PrecioInput
                                                value={producto.precio}
                                                onChange={(text) => actualizarProducto(index, "precio", text)}
                                                onSubmitEditing={handleSubmitPrecio}
                                                returnKeyType={index < productos.length - 1 ? "next" : "done"}
                                                placeholder={isVenta ? "Precio" : "N/A"}
                                                editable={isVenta}
                                                inputRef={el => precioInputRefs.current[index] = el}
                                            />
                                        </View>
                                        
                                        {isVenta && producto.cantidad && producto.precio && (
                                            <Text style={styles.itemTotalText}>
                                                Total: ${(Number(producto.cantidad) * Number(producto.precio)).toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* Botón guardar MEJORADO */}
                {productos.length > 0 && (
                    <TouchableOpacity
                        style={[
                            styles.button, 
                            guardando ? styles.buttonProcessing : styles.buttonActive
                        ]}
                        onPress={guardarVenta}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                                <Text style={styles.buttonText}>PROCESANDO...</Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="save-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                                <Text style={styles.buttonText}>
                                    {esMultiVenta 
                                        ? (tipo === "Venta" 
                                            ? `GUARDAR VENTA ($${total.toFixed(2)})`
                                            : "GUARDAR SALIDAS")
                                        : (tipo === "Venta"
                                            ? `GUARDAR VENTA $${total.toFixed(2)}`
                                            : "GUARDAR SALIDA")
                                    }
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Modal del menú */}
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
                            onPress={() => {
                                setMenuVisible(false);
                                router.push("/");
                            }}
                        >
                            <Ionicons name="home-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Volver a inicio</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.menuDivider} />

                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push("/formulario");
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Añadir producto</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push("/inventario");
                            }}
                        >
                            <Ionicons name="cube-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Ver inventario</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push("/reportes");
                            }}
                        >
                            <Ionicons name="stats-chart-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Ver reportes</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.menuDivider} />
                        
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={exportarAPDF}
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

// Estilos
const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingHorizontal: 20,
        marginBottom: 25,
        marginTop: 10,
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
    typeSelectorContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: "#f0f0f0",
        borderRadius: 12,
        overflow: "hidden",
        padding: 3,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10,
    },
    typeButtonActiveVenta: {
        backgroundColor: "#4a90e2",
    },
    typeButtonActiveSalida: {
        backgroundColor: "#FF9500",
    },
    typeButtonText: {
        fontWeight: "600",
        fontSize: 15,
        color: "#4a90e2",
        marginLeft: 8,
    },
    typeButtonTextActive: {
        color: "#fff",
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#fff",
        marginHorizontal: 20,
        marginBottom: 15,
        paddingHorizontal: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
    },
    resultadosContainer: {
        marginHorizontal: 20,
        marginBottom: 15,
    },
    result: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: "#fff",
        borderRadius: 10,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#4a90e2",
    },
    resultContent: {
        flex: 1,
    },
    resultText: {
        fontWeight: "600",
        color: "#000",
        fontSize: 15,
        marginBottom: 4,
    },
    resultDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    resultStock: {
        fontSize: 13,
        color: "#555",
        backgroundColor: "#f0f0f0",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    resultPrice: {
        fontSize: 13,
        color: "#4CAF50",
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    manualButton: {
        flexDirection: 'row', 
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "#34C759", 
        padding: 14,
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    manualButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 15,
    },
    subtitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    subtitleText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1a1a1a",
    },
    totalSummary: {
        backgroundColor: '#E6F0FF',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#4a90e2',
    },
    totalSummaryText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#4a90e2',
    },
    mainScroll: {
        marginHorizontal: 20,
        marginBottom: 10,
    },
    inputRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    inputSmall: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        color: "#333",
        backgroundColor: '#fff',
        minHeight: 48,
    },
    inputDisabled: {
        backgroundColor: "#f8f9fa",
        borderColor: "#e0e0e0",
        color: "#999",
    },
    ventaItem: {
        backgroundColor: "#fff",
        padding: 18,
        borderRadius: 14,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    ventaHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    ventaNombreContainer: {
        flex: 1,
        marginRight: 10,
    },
    ventaNombre: {
        fontWeight: "700",
        color: "#1a1a1a",
        fontSize: 17,
    },
    deleteButton: {
        justifyContent: "center",
        alignItems: "center",
        padding: 5,
        backgroundColor: "#ff3b30",
        borderRadius: 20, 
        width: 36,
        height: 36,
    },
    itemTotalText: {
        marginTop: 10,
        fontSize: 15, 
        fontWeight: '600',
        color: '#4a90e2', 
        textAlign: 'right',
    },
    buttonActive: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#4a90e2",
        padding: 16, 
        borderRadius: 12, 
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
    },
    buttonProcessing: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#FF9500",
        padding: 16, 
        borderRadius: 12, 
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 18,
    },
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
    menuItemHighlight: {
        fontWeight: "600",
        color: "#4a90e2",
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 5,
    }
});