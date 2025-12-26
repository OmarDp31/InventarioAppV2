// app/reportes.js
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    updateDoc
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
    TouchableWithoutFeedback,
    View
} from "react-native";
import { db } from "../firebase";
import { useAuth } from "../utils/AuthProvider";

const { width } = Dimensions.get("window");

export default function ReportesScreen() {
    return <Reportes />;
}

function Reportes() {
    const { user } = useAuth();
    const router = useRouter();

    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalVentas, setTotalVentas] = useState(0);
    const [totalSalidas, setTotalSalidas] = useState(0);
    const [totalProductosVendidos, setTotalProductosVendidos] = useState(0);
    const [filtroActivo, setFiltroActivo] = useState("Venta"); 
    const [menuVisible, setMenuVisible] = useState(false); 
    
    // Estados para edición
    const [editandoId, setEditandoId] = useState(null);
    const [cantidadEdit, setCantidadEdit] = useState("");
    const [precioEdit, setPrecioEdit] = useState("");
    const [productoEditando, setProductoEditando] = useState(null);

    // REF para manejo del teclado
    const scrollViewRef = useRef(null);

    // Estilos para web
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
                
                /* Mejorar la experiencia de scroll con rueda del mouse */
                .scrollable-content {
                scroll-behavior: smooth;
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
        if (user) {
            cargarReportes();
        }
    }, [user]);

    const handleNavigation = (route) => {
        setMenuVisible(false);
        router.push(route);
    };

    const cargarReportes = async () => {
        setLoading(true);
        try {
            if (!user?.uid) return;

            const refVentas = collection(db, "users", user.uid, "ventas");
            const q = query(refVentas, orderBy("fecha", "desc"));
            const snap = await getDocs(q);

            let totalIngresos = 0;
            let totalUnidadesSalida = 0;
            let totalUnidadesVendidas = 0;
            
            const listaTransacciones = snap.docs.map((d) => {
                const data = d.data();
                const tipoTransaccion = data.tipoTransaccion || 'Venta';
                const esMultiVenta = data.esMultiVenta || false;
                const productos = data.productos || [];
                
                let ventaUnificada = {
                    id: d.id, 
                    ...data,
                    esMultiVenta,
                    productos,
                    tipoTransaccion,
                    nombre: null,
                    productoId: null,
                    cantidad: null,
                    precioUnitario: null,
                    total: null,
                    totalVenta: data.totalVenta || 0,
                };
                
                if (!esMultiVenta && productos.length > 0) {
                    const primerProducto = productos[0];
                    ventaUnificada = {
                        ...ventaUnificada,
                        nombre: primerProducto.nombre || data.nombre || "Producto sin nombre",
                        productoId: primerProducto.productoId || data.productoId,
                        cantidad: primerProducto.cantidad || data.cantidad || 0,
                        precioUnitario: primerProducto.precioUnitario || data.precioUnitario || 0,
                        total: primerProducto.total || 
                               ((primerProducto.precioUnitario || 0) * (primerProducto.cantidad || 0)) || 
                               data.total || 0,
                    };
                }
                
                if (tipoTransaccion === 'Venta') {
                    if (esMultiVenta) {
                        totalIngresos += ventaUnificada.totalVenta || 0;
                        productos.forEach(p => {
                            totalUnidadesVendidas += p.cantidad || 0;
                        });
                    } else {
                        totalIngresos += ventaUnificada.total || ventaUnificada.totalVenta || 0;
                        totalUnidadesVendidas += ventaUnificada.cantidad || 0;
                    }
                } else if (tipoTransaccion === 'Salida Autorizada') {
                    if (esMultiVenta) {
                        totalUnidadesSalida += productos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
                    } else {
                        totalUnidadesSalida += ventaUnificada.cantidad || 0;
                    }
                }
                
                ventaUnificada.fechaFormateada = new Date(data.fecha).toLocaleString('es-ES', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                return ventaUnificada;
            });

            setVentas(listaTransacciones);
            setTotalVentas(totalIngresos);
            setTotalSalidas(totalUnidadesSalida);
            setTotalProductosVendidos(totalUnidadesVendidas);
        } catch (err) {
            console.error("Error al cargar reportes:", err);
            Alert.alert("Error", "No se pudieron cargar los reportes de transacciones.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async (item) => {
        const esMultiVenta = item.esMultiVenta;
        const nombreProducto = item.nombre || item.productos?.[0]?.nombre || "producto";
        const mensaje = esMultiVenta 
            ? `¿Estás seguro de que deseas eliminar esta ${item.tipoTransaccion.toLowerCase()} múltiple con ${item.cantidadProductos} productos?\nEsto también devolverá todo el stock al inventario.`
            : `¿Estás seguro de que deseas eliminar la transacción de "${nombreProducto}"?\nEsto también devolverá el stock al inventario.`;

        const ejecutarEliminacion = async () => {
            try {
                setLoading(true);

                if (esMultiVenta) {
                    for (const producto of item.productos) {
                        if (producto.productoId) {
                            const inventarioRef = doc(db, "users", user.uid, "inventario", producto.productoId);
                            const inventarioSnap = await getDoc(inventarioRef);
                            if (inventarioSnap.exists()) {
                                const stockActual = inventarioSnap.data().cantidad || 0;
                                await updateDoc(inventarioRef, {
                                    cantidad: stockActual + (producto.cantidad || 0),
                                });
                            }
                        }
                    }
                } else {
                    const producto = item.productos?.[0] || item;
                    if (producto.productoId) {
                        const inventarioRef = doc(db, "users", user.uid, "inventario", producto.productoId);
                        const inventarioSnap = await getDoc(inventarioRef);
                        if (inventarioSnap.exists()) {
                            const stockActual = inventarioSnap.data().cantidad || 0;
                            await updateDoc(inventarioRef, {
                                cantidad: stockActual + (producto.cantidad || 0),
                            });
                        }
                    }
                }
                
                await deleteDoc(doc(db, "users", user.uid, "ventas", item.id));

                Alert.alert("Éxito", "Transacción eliminada y stock revertido correctamente.");
                cargarReportes();
            } catch (error) {
                console.error("Error al eliminar la transacción:", error);
                Alert.alert("Error", "No se pudo eliminar la transacción ni revertir el stock. Intenta de nuevo.");
            } finally {
                setLoading(false);
            }
        };

        if (Platform.OS === "web") {
            if (typeof window !== 'undefined' && window.confirm(mensaje)) {
                ejecutarEliminacion();
            }
            return;
        }

        Alert.alert(
            "Confirmar Eliminación",
            mensaje,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: ejecutarEliminacion,
                },
            ]
        );
    };

    const handleEdit = (item, productoIndex = null) => {
        if (item.esMultiVenta && productoIndex !== null) {
            const producto = item.productos[productoIndex];
            setEditandoId(`${item.id}-${productoIndex}`);
            setProductoEditando({ ventaId: item.id, productoIndex, venta: item });
            setCantidadEdit(producto.cantidad?.toString() || "");
            setPrecioEdit(producto.precioUnitario?.toString() || "");
        } else if (!item.esMultiVenta) {
            const producto = item.productos?.[0] || item;
            setEditandoId(item.id);
            setProductoEditando(null);
            setCantidadEdit(producto.cantidad?.toString() || "");
            setPrecioEdit(producto.precioUnitario?.toString() || "");
        }
        
        if (Platform.OS === 'web' && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current.scrollTo({ y: 0, animated: true });
            }, 100);
        }
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setProductoEditando(null);
        setCantidadEdit("");
        setPrecioEdit("");
    };

    const guardarEdicion = async () => {
        if (!cantidadEdit || isNaN(parseFloat(cantidadEdit)) || parseFloat(cantidadEdit) <= 0) {
            Alert.alert("Error", "Ingresa una cantidad válida");
            return;
        }

        const nuevaCantidad = parseFloat(cantidadEdit);
        
        let nuevoPrecio = null;
        let nuevoTotal = null;
        
        const esVenta = productoEditando 
            ? productoEditando.venta.tipoTransaccion === 'Venta'
            : ventas.find(v => v.id === editandoId)?.tipoTransaccion === 'Venta';
        
        if (esVenta) {
            if (!precioEdit || isNaN(parseFloat(precioEdit)) || parseFloat(precioEdit) < 0) {
                Alert.alert("Error", "Ingresa un precio válido");
                return;
            }
            nuevoPrecio = parseFloat(precioEdit);
            nuevoTotal = nuevaCantidad * nuevoPrecio;
        }

        try {
            setLoading(true);

            if (productoEditando) {
                const { ventaId, productoIndex, venta } = productoEditando;
                const producto = venta.productos[productoIndex];
                const viejaCantidad = producto.cantidad || 0;

                if (producto.productoId && nuevaCantidad !== viejaCantidad) {
                    const inventarioRef = doc(db, "users", user.uid, "inventario", producto.productoId);
                    const inventarioSnap = await getDoc(inventarioRef);
                    
                    if (inventarioSnap.exists()) {
                        const stockActual = inventarioSnap.data().cantidad || 0;
                        const diferenciaCantidad = viejaCantidad - nuevaCantidad;
                        
                        await updateDoc(inventarioRef, {
                            cantidad: stockActual + diferenciaCantidad,
                        });
                    }
                }

                const productosActualizados = [...venta.productos];
                productosActualizados[productoIndex] = {
                    ...producto,
                    cantidad: nuevaCantidad,
                    ...(venta.tipoTransaccion === 'Venta' && {
                        precioUnitario: nuevoPrecio,
                        total: nuevoTotal
                    })
                };

                const totalVentaActualizado = venta.tipoTransaccion === 'Venta' 
                    ? productosActualizados.reduce((sum, p) => sum + (p.total || 0), 0)
                    : 0;

                const ventaRef = doc(db, "users", user.uid, "ventas", ventaId);
                await updateDoc(ventaRef, {
                    productos: productosActualizados,
                    ...(venta.tipoTransaccion === 'Venta' && { totalVenta: totalVentaActualizado })
                });

            } else {
                const venta = ventas.find(v => v.id === editandoId);
                if (!venta) return;

                const productoActual = venta.productos?.[0];
                if (!productoActual) return;

                const viejaCantidad = productoActual.cantidad || 0;

                if (productoActual.productoId && nuevaCantidad !== viejaCantidad) {
                    const inventarioRef = doc(db, "users", user.uid, "inventario", productoActual.productoId);
                    const inventarioSnap = await getDoc(inventarioRef);
                    
                    if (inventarioSnap.exists()) {
                        const stockActual = inventarioSnap.data().cantidad || 0;
                        const diferenciaCantidad = viejaCantidad - nuevaCantidad;
                        
                        await updateDoc(inventarioRef, {
                            cantidad: stockActual + diferenciaCantidad,
                        });
                    }
                }

                const productoActualizado = {
                    ...productoActual,
                    cantidad: nuevaCantidad,
                    ...(venta.tipoTransaccion === 'Venta' && {
                        precioUnitario: nuevoPrecio,
                        total: nuevoTotal
                    })
                };

                const productosActualizados = [productoActualizado];
                
                const totalVentaActualizado = venta.tipoTransaccion === 'Venta' ? nuevoTotal : 0;

                const ventaRef = doc(db, "users", user.uid, "ventas", venta.id);
                await updateDoc(ventaRef, {
                    productos: productosActualizados,
                    ...(venta.tipoTransaccion === 'Venta' && { totalVenta: totalVentaActualizado })
                });
            }

            Alert.alert("Éxito", "Transacción actualizada correctamente");
            cancelarEdicion();
            cargarReportes();
        } catch (error) {
            console.error("Error al editar la transacción:", error);
            Alert.alert("Error", "No se pudo actualizar la transacción. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };
    
    const VentaItem = ({ item }) => {
        const isVenta = item.tipoTransaccion === 'Venta';
        const colorTotal = isVenta ? "#4CAF50" : "#F44336";
        const esMultiVenta = item.esMultiVenta;
        
        const obtenerNombreProducto = () => {
            if (esMultiVenta) return null;
            return item.nombre || item.productos?.[0]?.nombre || "Producto no disponible";
        };
        
        const obtenerDetallesProducto = () => {
            if (esMultiVenta) return null;
            if (item.cantidad !== null || item.precioUnitario !== null) {
                return {
                    cantidad: item.cantidad || 0,
                    precioUnitario: item.precioUnitario || 0,
                    total: item.total || 0,
                    productoId: item.productoId
                };
            } else {
                const producto = item.productos?.[0] || item;
                return {
                    cantidad: producto.cantidad || 0,
                    precioUnitario: producto.precioUnitario || 0,
                    total: producto.total || 0,
                    productoId: producto.productoId
                };
            }
        };
        
        const renderProductos = () => {
            if (!esMultiVenta) {
                const nombreProducto = obtenerNombreProducto();
                const detalles = obtenerDetallesProducto();
                const estaEditando = editandoId === item.id;
                
                let totalCalculado = detalles?.total || 0;
                if (isVenta && totalCalculado === 0 && detalles?.cantidad && detalles?.precioUnitario) {
                    totalCalculado = detalles.cantidad * detalles.precioUnitario;
                }
                
                const totalDisplay = isVenta ? `$${totalCalculado.toFixed(2)}` : 'N/A';
                const precioDisplay = isVenta ? `$${detalles?.precioUnitario?.toFixed(2) || '0.00'}` : 'N/A';

                return (
                    <View style={styles.productoContainer}>
                        <View style={styles.productoHeader}>
                            <View style={styles.productoInfo}>
                                <Text style={styles.productoNombre}>{nombreProducto}</Text>
                                <Text style={styles.productoTipo}>{isVenta ? "Venta Individual" : "Salida Individual"}</Text>
                            </View>
                            <View style={styles.actionsContainer}>
                                {!estaEditando ? (
                                    <>
                                        <TouchableOpacity 
                                            onPress={() => handleEdit(item)} 
                                            style={styles.actionButton}
                                        >
                                            <Ionicons name="pencil" size={18} color="#4a90e2" />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => handleDelete(item)} 
                                            style={styles.actionButton}
                                        >
                                            <Ionicons name="trash" size={18} color="#ff3b30" />
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <TouchableOpacity 
                                            onPress={guardarEdicion} 
                                            style={[styles.actionButton, styles.saveButton]}
                                        >
                                            <Ionicons name="checkmark" size={18} color="#4CAF50" />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={cancelarEdicion} 
                                            style={[styles.actionButton, styles.cancelButton]}
                                        >
                                            <Ionicons name="close" size={18} color="#ff3b30" />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                        
                        {estaEditando ? (
                            <View style={styles.editContainer}>
                                <Text style={[styles.editLabel, { marginBottom: 10 }]}>
                                    Editando: {nombreProducto}
                                </Text>
                                
                                <View style={styles.editRow}>
                                    <View style={styles.editField}>
                                        <Text style={styles.editLabel}>Cantidad:</Text>
                                        <TextInput
                                            style={styles.editInput}
                                            value={cantidadEdit}
                                            onChangeText={setCantidadEdit}
                                            keyboardType="numeric"
                                            placeholder="Cantidad"
                                            // SOLUCIÓN: Solo estas propiedades
                                            blurOnSubmit={false}
                                            returnKeyType="done"
                                            onSubmitEditing={() => {}}
                                        />
                                    </View>
                                    
                                    {isVenta && (
                                        <View style={styles.editField}>
                                            <Text style={styles.editLabel}>Precio Unitario:</Text>
                                            <TextInput
                                                style={styles.editInput}
                                                value={precioEdit}
                                                onChangeText={setPrecioEdit}
                                                keyboardType="numeric"
                                                placeholder="Precio"
                                                // SOLUCIÓN: Solo estas propiedades
                                                blurOnSubmit={false}
                                                returnKeyType="done"
                                                onSubmitEditing={() => {}}
                                            />
                                        </View>
                                    )}
                                </View>
                                
                                {isVenta && precioEdit && cantidadEdit && (
                                    <Text style={styles.previewTotal}>
                                        Nuevo total: ${(parseFloat(cantidadEdit) * parseFloat(precioEdit)).toFixed(2)}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.productoDetalles}>
                                <View style={styles.detalleRow}>
                                    <Text style={styles.detalleLabel}>Cantidad:</Text>
                                    <Text style={styles.detalleValue}>{detalles?.cantidad || 0}</Text>
                                </View>
                                {isVenta && (
                                    <>
                                        <View style={styles.detalleRow}>
                                            <Text style={styles.detalleLabel}>Precio Unitario:</Text>
                                            <Text style={styles.detalleValue}>{precioDisplay}</Text>
                                        </View>
                                        <View style={[styles.detalleRow, styles.totalRow]}>
                                            <Text style={styles.detalleLabel}>Total:</Text>
                                            <Text style={[styles.detalleValue, { color: colorTotal }]}>{totalDisplay}</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                );
            } else {
                return (
                    <View style={styles.multiVentaContainer}>
                        <View style={styles.multiVentaHeader}>
                            <View style={styles.multiVentaInfo}>
                                <Text style={styles.multiVentaTitle}>
                                    {isVenta ? "Venta Múltiple" : "Salida Múltiple"}
                                </Text>
                                <Text style={styles.multiVentaSubtitle}>
                                    {item.cantidadProductos || item.productos?.length || 0} productos
                                </Text>
                            </View>
                            <View style={styles.actionsContainer}>
                                <TouchableOpacity 
                                    onPress={() => handleDelete(item)} 
                                    style={styles.actionButton}
                                >
                                    <Ionicons name="trash" size={18} color="#ff3b30" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {isVenta && item.totalVenta && (
                            <View style={styles.multiVentaTotal}>
                                <Text style={styles.multiVentaTotalLabel}>Total Venta:</Text>
                                <Text style={styles.multiVentaTotalValue}>${item.totalVenta.toFixed(2)}</Text>
                            </View>
                        )}
                        
                        <View style={styles.productosList}>
                            {item.productos?.map((producto, index) => {
                                const productoEditandoId = `${item.id}-${index}`;
                                const estaEditandoProducto = editandoId === productoEditandoId;
                                
                                return (
                                    <View key={index} style={styles.productoMultiContainer}>
                                        <View style={styles.productoMultiHeader}>
                                            <Text style={styles.productoMultiNombre}>{producto.nombre}</Text>
                                            <View style={styles.actionsContainer}>
                                                {!estaEditandoProducto ? (
                                                    <TouchableOpacity 
                                                        onPress={() => handleEdit(item, index)} 
                                                        style={styles.actionButton}
                                                    >
                                                        <Ionicons name="pencil" size={16} color="#4a90e2" />
                                                    </TouchableOpacity>
                                                ) : (
                                                    <>
                                                        <TouchableOpacity 
                                                            onPress={guardarEdicion} 
                                                            style={[styles.actionButton, styles.saveButton]}
                                                        >
                                                            <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity 
                                                            onPress={cancelarEdicion} 
                                                            style={[styles.actionButton, styles.cancelButton]}
                                                        >
                                                            <Ionicons name="close" size={16} color="#ff3b30" />
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                        
                                        {estaEditandoProducto ? (
                                            <View style={styles.editContainer}>
                                                <View style={styles.editRow}>
                                                    <View style={styles.editField}>
                                                        <Text style={styles.editLabel}>Cantidad:</Text>
                                                        <TextInput
                                                            style={styles.editInput}
                                                            value={cantidadEdit}
                                                            onChangeText={setCantidadEdit}
                                                            keyboardType="numeric"
                                                            placeholder="Cantidad"
                                                            // SOLUCIÓN: Solo estas propiedades
                                                            blurOnSubmit={false}
                                                            returnKeyType="done"
                                                            onSubmitEditing={() => {}}
                                                        />
                                                    </View>
                                                    
                                                    {isVenta && (
                                                        <View style={styles.editField}>
                                                            <Text style={styles.editLabel}>Precio:</Text>
                                                            <TextInput
                                                                style={styles.editInput}
                                                                value={precioEdit}
                                                                onChangeText={setPrecioEdit}
                                                                keyboardType="numeric"
                                                                placeholder="Precio"
                                                                // SOLUCIÓN: Solo estas propiedades
                                                                blurOnSubmit={false}
                                                                returnKeyType="done"
                                                                onSubmitEditing={() => {}}
                                                            />
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={styles.productoMultiDetalles}>
                                                <View style={styles.detalleRow}>
                                                    <Text style={styles.detalleLabel}>Cantidad:</Text>
                                                    <Text style={styles.detalleValue}>{producto.cantidad || 0}</Text>
                                                </View>
                                                {isVenta && producto.precioUnitario && (
                                                    <View style={styles.detalleRow}>
                                                        <Text style={styles.detalleLabel}>Precio:</Text>
                                                        <Text style={styles.detalleValue}>${producto.precioUnitario.toFixed(2)}</Text>
                                                    </View>
                                                )}
                                                {isVenta && producto.total && (
                                                    <View style={[styles.detalleRow, styles.totalRow]}>
                                                        <Text style={styles.detalleLabel}>Total:</Text>
                                                        <Text style={[styles.detalleValue, { color: "#4CAF50" }]}>${producto.total.toFixed(2)}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                );
            }
        };

        return (
            <View style={[styles.ventaItem, { borderLeftColor: isVenta ? '#4a90e2' : '#FF9500' }]}>
                {renderProductos()}
                
                <View style={styles.fechaContainer}>
                    <Ionicons name="time-outline" size={14} color="#888" />
                    <Text style={styles.fechaText}>{item.fechaFormateada}</Text>
                </View>
            </View>
        );
    };

    const datosFiltrados = ventas.filter(item => 
        filtroActivo === 'Venta' ? item.tipoTransaccion === 'Venta' : item.tipoTransaccion === 'Salida Autorizada'
    );
    
    const sectionTitle = filtroActivo === 'Venta' ? 
        `Ventas Completadas (${datosFiltrados.length})` : 
        `Salidas Autorizadas (${datosFiltrados.length})`;
    
    const sectionColor = filtroActivo === 'Venta' ? '#4a90e2' : '#FF9500';
    
    const exportarAPDF = () => {
        setMenuVisible(false);
        router.push("/exportar");
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.loadingText}>Cargando reportes...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <ScrollView 
                    ref={scrollViewRef}
                    style={{ flex: 1, backgroundColor: "#f5f7fa" }}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>Reportes de Transacciones</Text>
                                <Text style={styles.subtitle}>Historial de ventas y salidas</Text>
                            </View>
                            
                            <TouchableOpacity 
                                onPress={() => setMenuVisible(true)}
                                style={styles.menuButton}
                            >
                                <Ionicons name="menu" size={30} color="#4a90e2" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.summaryContainer}>
                            <View style={styles.summaryCard}>
                                <Ionicons name="cash-outline" size={24} color="#4a90e2" style={styles.summaryIcon} />
                                <View style={styles.summaryContent}>
                                    <Text style={styles.summaryLabel}>Ingresos Totales</Text>
                                    <Text style={styles.summaryValue}>${totalVentas.toFixed(2)}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.summaryCard}>
                                <Ionicons name="cube-outline" size={24} color="#FF9500" style={styles.summaryIcon} />
                                <View style={styles.summaryContent}>
                                    <Text style={styles.summaryLabel}>Salidas Totales</Text>
                                    <Text style={styles.summaryValue}>{totalSalidas} unidades</Text>
                                </View>
                            </View>
                            
                            <View style={styles.summaryCard}>
                                <Ionicons name="stats-chart-outline" size={24} color="#34C759" style={styles.summaryIcon} />
                                <View style={styles.summaryContent}>
                                    <Text style={styles.summaryLabel}>Unidades Vendidas</Text>
                                    <Text style={styles.summaryValue}>{totalProductosVendidos}</Text>
                                </View>
                            </View>
                        </View>
                        
                        <View style={styles.filterSelectorContainer}>
                            <TouchableOpacity
                                style={[styles.filterButton, filtroActivo === 'Venta' && styles.filterButtonActiveVenta]}
                                onPress={() => setFiltroActivo('Venta')}
                            >
                                <Ionicons name="cart-outline" size={18} color={filtroActivo === 'Venta' ? "#fff" : "#4a90e2"} />
                                <Text style={[styles.filterButtonText, filtroActivo === 'Venta' && styles.filterButtonTextActive]}>Ventas</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterButton, filtroActivo === 'Salida' && styles.filterButtonActiveSalida]}
                                onPress={() => setFiltroActivo('Salida')}
                            >
                                <Ionicons name="log-out-outline" size={18} color={filtroActivo === 'Salida' ? "#fff" : "#FF9500"} />
                                <Text style={[styles.filterButtonText, filtroActivo === 'Salida' && styles.filterButtonTextActive]}>Salidas Autorizadas</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { borderLeftColor: sectionColor }]}>{sectionTitle}</Text>
                            <Text style={styles.sectionSubtitle}>
                                {datosFiltrados.length} transacciones encontradas
                            </Text>
                        </View>

                        {ventas.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="stats-chart-outline" size={80} color="#e0e0e0" />
                                <Text style={styles.emptyTitle}>No hay transacciones registradas aún</Text>
                                <Text style={styles.emptyText}>
                                    Comienza registrando tu primera venta o salida autorizada
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.transactionsContainer}>
                                {datosFiltrados.length > 0 ? (
                                    datosFiltrados.map(item => <VentaItem key={item.id} item={item} />)
                                ) : (
                                    <View style={styles.emptyFilterContainer}>
                                        <Ionicons name="search-outline" size={60} color="#ccc" />
                                        <Text style={styles.noTransactionsText}>
                                            {filtroActivo === 'Venta' ? 'No hay ventas para mostrar.' : 'No hay salidas autorizadas para mostrar.'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>

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
                        
                        <TouchableOpacity 
                            style={styles.menuRow}
                            onPress={() => handleNavigation("/ventas")}
                        >
                            <Ionicons name="cash-outline" size={22} color="#333" />
                            <Text style={styles.menuItem}>Registrar venta/salida</Text>
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

const styles = StyleSheet.create({
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
    
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
    
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        minWidth: width > 600 ? '30%' : '48%',
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#f0f0f0",
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryIcon: {
        marginRight: 12,
    },
    summaryContent: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#666",
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1a1a1a",
    },
    
    filterSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        backgroundColor: '#f0f0f0', 
        overflow: 'hidden',
        padding: 3, 
    },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10, 
    },
    filterButtonActiveVenta: {
        backgroundColor: '#4a90e2', 
        shadowColor: '#4a90e2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    filterButtonActiveSalida: {
        backgroundColor: '#FF9500', 
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    filterButtonText: {
        fontWeight: '600',
        fontSize: 15,
        color: '#666',
        marginLeft: 8,
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    
    sectionHeader: {
        marginHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        paddingLeft: 10,
        borderLeftWidth: 4,
        marginBottom: 5,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: "#666",
        marginLeft: 14,
    },
    
    transactionsContainer: {
        marginHorizontal: 20,
        marginBottom: 30,
    },
    
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#333",
        marginTop: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: "#888",
        textAlign: "center",
        lineHeight: 22,
    },
    emptyFilterContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
    },
    
    ventaItem: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#f0f0f0",
        borderLeftWidth: 5, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    
    productoContainer: {
        marginBottom: 15,
    },
    productoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    productoInfo: {
        flex: 1,
        marginRight: 10,
    },
    productoNombre: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    productoTipo: {
        fontSize: 12,
        color: "#666",
        backgroundColor: "#f0f0f0",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    
    multiVentaContainer: {
        marginBottom: 15,
    },
    multiVentaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    multiVentaInfo: {
        flex: 1,
        marginRight: 10,
    },
    multiVentaTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: 4,
    },
    multiVentaSubtitle: {
        fontSize: 14,
        color: "#666",
    },
    multiVentaTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: "#E8F5E9",
        padding: 12,
        borderRadius: 10,
        marginBottom: 15,
    },
    multiVentaTotalLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1a1a1a",
    },
    multiVentaTotalValue: {
        fontSize: 20,
        fontWeight: "800",
        color: "#4CAF50",
    },
    productosList: {
        marginBottom: 15,
    },
    
    productoMultiContainer: {
        backgroundColor: "#f8f9fa",
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#e8e8e8",
    },
    productoMultiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    productoMultiNombre: {
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
        flex: 1,
        marginRight: 10,
    },
    productoMultiDetalles: {
        marginTop: 5,
    },
    
    productoDetalles: {
        marginTop: 8,
    },
    detalleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    totalRow: {
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
    },
    detalleLabel: {
        fontSize: 14,
        color: "#666",
    },
    detalleValue: {
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
    },
    
    actionsContainer: {
        flexDirection: 'row',
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f0f0f0",
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    saveButton: {
        backgroundColor: "#E8F5E9",
    },
    cancelButton: {
        backgroundColor: "#FFEBEE",
    },
    
    editContainer: {
        backgroundColor: "#f8f9fa",
        padding: 12,
        borderRadius: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    editRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    editField: {
        flex: 1,
        marginHorizontal: 5,
    },
    editLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#666",
        marginBottom: 5,
    },
    editInput: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#4a90e2",
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: "#333",
        minHeight: 44,
    },
    previewTotal: {
        fontSize: 14,
        fontWeight: "700",
        color: "#4CAF50",
        textAlign: 'center',
        marginTop: 8,
        backgroundColor: "#E8F5E9",
        padding: 8,
        borderRadius: 6,
    },
    
    fechaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    fechaText: {
        fontSize: 13,
        color: "#888",
        marginLeft: 6,
        fontStyle: 'italic',
    },
    
    noTransactionsText: {
        fontSize: 16,
        color: "#999",
        textAlign: 'center',
        marginTop: 10,
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