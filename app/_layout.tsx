// app/_layout.js
import { Stack } from "expo-router";
import React from "react";
import { AuthProvider } from "../utils/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack initialRouteName="index" />
    </AuthProvider>
  );
}
