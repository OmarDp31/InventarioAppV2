// app/signup.js
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebase";
import { useAuth } from "../utils/AuthProvider";

const { width, height } = Dimensions.get("window");

export default function Signup() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
        
        /* Animaciones suaves */
        * {
          transition: all 0.2s ease;
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

  const onSignUp = async () => {
    if (!email || !password || !confirm) {
      Alert.alert("Validación", "Completa todos los campos");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Validación", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirm) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password);

      const currentUser = auth.currentUser;
      if (currentUser) {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            email: currentUser.email,
            creado: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      Alert.alert(
        "¡Cuenta creada con éxito!",
        "Tu registro se ha completado exitosamente. Ahora puedes iniciar sesión con tus credenciales.",
        [{ text: "Continuar", onPress: () => router.replace("/login") }]
      );
    } catch (err) {
      console.error(err);
      let errorMessage = "Ocurrió un problema al crear la cuenta";
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "El correo electrónico ya está registrado";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "El correo electrónico no es válido";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "La contraseña es demasiado débil";
      }
      
      Alert.alert("Error de registro", errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.appSubtitle}>Crear Nueva Cuenta</Text>
        </View>

        {/* Tarjeta de registro */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>¡Comienza tu experiencia!</Text>
          <Text style={styles.subtitle}>Crea tu cuenta para gestionar inventarios</Text>

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
              autoComplete="password-new"
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

          {/* Campo de confirmar contraseña */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
            </View>
            <TextInput
              placeholder="Confirmar contraseña"
              placeholderTextColor="#999"
              secureTextEntry={!showConfirm}
              style={[styles.input, { flex: 1 }]}
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="password-new"
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowConfirm(!showConfirm)}
            >
              <Ionicons 
                name={showConfirm ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* Requisitos de contraseña */}
          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>La contraseña debe tener:</Text>
            <View style={styles.requirementItem}>
              <Ionicons 
                name={password.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                size={14} 
                color={password.length >= 6 ? "#4CAF50" : "#999"} 
              />
              <Text style={[styles.requirementText, password.length >= 6 && styles.requirementMet]}>
                Al menos 6 caracteres
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons 
                name={password === confirm && password.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                size={14} 
                color={password === confirm && password.length > 0 ? "#4CAF50" : "#999"} 
              />
              <Text style={[styles.requirementText, password === confirm && password.length > 0 && styles.requirementMet]}>
                Ambas contraseñas coinciden
              </Text>
            </View>
          </View>

          {/* Botón de registro */}
          <TouchableOpacity
            style={[
              styles.signupButton, 
              loading && styles.signupButtonDisabled,
              Platform.OS === 'web' && isHovered && styles.signupButtonHover
            ]}
            onPress={onSignUp}
            disabled={loading}
            onMouseEnter={() => Platform.OS === 'web' && setIsHovered(true)}
            onMouseLeave={() => Platform.OS === 'web' && setIsHovered(false)}
          >
            {loading ? (
              <Ionicons name="refresh-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
            ) : (
              <Ionicons name="person-add-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
            )}
            <Text style={styles.signupButtonText}>
              {loading ? "CREANDO CUENTA..." : "CREAR CUENTA"}
            </Text>
          </TouchableOpacity>

          {/* Línea divisora */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>¿Ya tienes cuenta?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botón para ir a login */}
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Ionicons name="log-in-outline" size={18} color="#4a90e2" style={{ marginRight: 8 }} />
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
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
  },
  
  // Header
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    marginTop: 5,
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
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
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
  
  // Password Requirements
  passwordRequirements: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 10,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: "#777",
    marginLeft: 8,
  },
  requirementMet: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  
  // Signup Button
  signupButton: {
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
  signupButtonDisabled: {
    backgroundColor: "#a0c8f0",
  },
  signupButtonHover: {
    transform: [{ translateY: -2 }],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  signupButtonText: {
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
    fontWeight: "500",
  },
  
  // Login Button
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4a90e2",
  },
  loginButtonText: {
    color: "#4a90e2",
    fontSize: 16,
    fontWeight: "600",
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