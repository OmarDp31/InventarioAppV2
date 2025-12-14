// app/signup.js
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { useAuth } from "./utils/AuthProvider";

// 🔽 NUEVO: importar Firestore y Auth
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const { width } = Dimensions.get("window");

export default function Signup() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

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

      // 🔽 NUEVO: guardar correo en Firestore
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
        "Cuenta creada",
        "Registro exitoso. Ahora inicia sesión",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Error",
        "El correo ya está registrado o ocurrió un problema"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.appTitle}>Invent-Go</Text>

        <View style={styles.box}>
          <Text style={styles.title}>Crear cuenta</Text>

          <TextInput
            placeholder="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Contraseña"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            placeholder="Confirmar contraseña"
            secureTextEntry
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creando..." : "CREAR CUENTA"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={styles.link}>
              ¿Ya tienes cuenta? Iniciar sesión
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e0f2f1" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  box: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: width > 600 ? 500 : "100%",
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#007aff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  link: {
    color: "#007aff",
    marginTop: 12,
    textAlign: "center",
  },
});
