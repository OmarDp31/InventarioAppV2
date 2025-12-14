import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  card: {
    backgroundColor: "#f6f6f6",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardSub: { fontSize: 13, color: "#555", marginTop: 4 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#fc0d05ff",
    width: 65,
    height: 65,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    zIndex: 9999,
  },
  fabText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "bold",
    marginTop: -3,
  },
});