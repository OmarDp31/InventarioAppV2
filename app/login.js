// app/login.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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

export default function Login() {
  const router = useRouter();
  const { user, initializing, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

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

      // 🔽 NUEVO: guardar correo en Firestore
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.appTitle}>Invent-Go</Text>

        <View style={styles.box}>
          <Text style={styles.title}>Iniciar sesión</Text>

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

          <View style={styles.rememberContainer}>
            <Switch value={rememberMe} onValueChange={setRememberMe} />
            <Text style={styles.rememberText}>Recuérdame</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Entrando..." : "ENTRAR"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.link}>¿No tienes cuenta? Crear una</Text>
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
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rememberText: {
    marginLeft: 8,
    fontSize: 14,
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
