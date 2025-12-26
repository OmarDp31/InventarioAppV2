// app/login.js
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "../firebase";
import { useAuth } from "../utils/AuthProvider";

const { width, height } = Dimensions.get("window");

export default function Login() {
  const router = useRouter();
  const { user, initializing, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isWebHovered, setIsWebHovered] = useState(false);
  const [isRegisterHovered, setIsRegisterHovered] = useState(false);

  // Estilos para web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        /* Estilos para mejorar la barra de scroll en navegadores web */
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        *::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 4px;
        }
        
        *::-webkit-scrollbar-thumb {
          background: #4a90e2;
          border-radius: 4px;
          border: 2px solid #f0f0f0;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background: #3a80d2;
        }
        
        /* Mejorar la experiencia de scroll */
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
    const loadRemembered = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("rememberedEmail");
        const savedPassword = await AsyncStorage.getItem("rememberedPassword");
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (err) {
        console.error("Error cargando datos guardados:", err);
      }
    };
    loadRemembered();
  }, []);

  useEffect(() => {
    if (!initializing && user) {
      router.replace("/");
    }
  }, [user, initializing]);

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validación", "Completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);

      const currentUser = auth.currentUser;
      if (currentUser) {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            email: currentUser.email,
            ultimoLogin: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      if (rememberMe) {
        await AsyncStorage.setItem("rememberedEmail", email.trim());
        await AsyncStorage.setItem("rememberedPassword", password);
      } else {
        await AsyncStorage.removeItem("rememberedEmail");
        await AsyncStorage.removeItem("rememberedPassword");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error de inicio de sesión", "Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Cargando aplicación...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con logo y título */}
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>IG</Text>
            </View>
            <Text style={styles.appTitle}>Invent-Go</Text>
          </View>
          <Text style={styles.appSubtitle}>Gestión de Inventario</Text>
        </View>

        {/* Tarjeta de login */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>¡Bienvenido de nuevo!</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

          {/* Campo de email */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" />
            </View>
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
            />
          </View>

          {/* Campo de contraseña */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
            </View>
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* Recordarme */}
          <View style={styles.rememberContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Recordar mis datos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          {/* Botón de login */}
          <TouchableOpacity
            style={[
              styles.loginButton, 
              loading && styles.loginButtonDisabled,
              Platform.OS === 'web' && isWebHovered && styles.loginButtonHover
            ]}
            onPress={onLogin}
            disabled={loading}
            onMouseEnter={() => Platform.OS === 'web' && setIsWebHovered(true)}
            onMouseLeave={() => Platform.OS === 'web' && setIsWebHovered(false)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.loginButtonText}>INICIAR SESIÓN</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Línea divisora */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Registro */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes una cuenta?</Text>
            <TouchableOpacity 
              style={[
                styles.registerButton,
                Platform.OS === 'web' && isRegisterHovered && styles.registerButtonHover
              ]}
              onPress={() => router.push("/signup")}
              onMouseEnter={() => Platform.OS === 'web' && setIsRegisterHovered(true)}
              onMouseLeave={() => Platform.OS === 'web' && setIsRegisterHovered(false)}
            >
              <Ionicons name="person-add-outline" size={18} color="#4a90e2" style={{ marginRight: 8 }} />
              <Text style={[
                styles.registerButtonText,
                Platform.OS === 'web' && isRegisterHovered && styles.registerButtonTextHover
              ]}>
                Crear cuenta
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Decoración */}
        <View style={styles.decorationCircle1} />
        <View style={styles.decorationCircle2} />
        <View style={styles.decorationCircle3} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f7fa",
  },
  scroll: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Header
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4a90e2",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  appTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: 'center',
  },
  
  // Card
  card: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 24,
    width: width > 600 ? 500 : "100%",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  
  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: "#fafafa",
  },
  inputIconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333",
  },
  eyeButton: {
    padding: 10,
  },
  
  // Remember Me & Forgot Password
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: "#4a90e2",
    borderColor: "#4a90e2",
  },
  rememberText: {
    fontSize: 14,
    color: "#666",
  },
  forgotPassword: {
    fontSize: 14,
    color: "#4a90e2",
    fontWeight: '500',
  },
  
  // Login Button
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#4a90e2",
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: "#a0c8f0",
  },
  loginButtonHover: {
    transform: [{ translateY: -2 }],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#eee",
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: "#999",
  },
  
  // Register
  registerContainer: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 15,
    color: "#666",
    marginBottom: 15,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4a90e2",
  },
  registerButtonHover: {
    backgroundColor: "#4a90e2",
  },
  registerButtonText: {
    color: "#4a90e2",
    fontSize: 16,
    fontWeight: "600",
  },
  registerButtonTextHover: {
    color: "#fff",
  },
  
  // Loading
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
  
  // Decoration
  decorationCircle1: {
    position: 'absolute',
    top: height * 0.1,
    left: width * 0.1,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(74, 144, 226, 0.05)',
    zIndex: -1,
  },
  decorationCircle2: {
    position: 'absolute',
    bottom: height * 0.1,
    right: width * 0.1,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(74, 144, 226, 0.03)',
    zIndex: -1,
  },
  decorationCircle3: {
    position: 'absolute',
    top: height * 0.4,
    right: width * 0.2,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(74, 144, 226, 0.02)',
    zIndex: -1,
  },
});