# Welcome
 Invent-Go
Aplicación móvil (Android/iOS) y web de control de salida/ventas y  gestión de inventario desarrollada como proyecto académico para la materia Diseño de Sistemas.

Permite registrar productos, consultar el inventario, buscar por criterios avanzados, generar reportes y exportar información en PDF, todo con un sistema de autenticación multiusuario robusto basado en Firebase.

Autor
Nombre: Omar Daniel Pérez
Proyecto: Trabajo académico (Materia Diseño de Sistemas)
GitHub: @OmarDp31

Objetivo y Descripción del proyecto
El objetivo principal fue diseñar e implementar una aplicación CRUD (Crear, Leer, Actualizar, Eliminar) funcional que permitiera gestionar inventarios de forma sencilla y eficiente, enfocándose en los siguientes puntos clave:
Módulo de Ventas: Registro de transacciones con actualización automática de stock.
Autenticación Segura: Implementación de Login y Registro de usuarios (Firebase Auth).
Aislamiento de Datos: Separación estricta de la información por usuario (cada usuario solo ve su inventario).
Reportes: Capacidad de exportar el inventario en formato PDF, sus otras exportaciones siguen en desarrollo.
Multiplataforma: Funcionamiento en Expo Go (Móvil) y Web.

## Tecnologías Utilizadas
Frontend: React Native con Expo (ES6+).
Backend: Firebase (Firestore & Authentication).
Navegación: Expo Router.
Utilidades: Expo Print & Sharing (PDF).

## Instalación y Ejecución
Clonar e Instalar:
git clone https://github.com/OmarDp31/InventarioAppV2.git
npm install
npx expo start

## Estado del Proyecto
Módulo de Inventario: 100% Funcional.
Módulo de Ventas: Operativo (Registro y descuento de stock).
Reportes PDF: Disponibles para móviles un 60% y en la web sigue en desarrollo.
