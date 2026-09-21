# SGB · Sistema de Gestión de Beneficiarios — Maquetación web (EV04)

**Evidencia de aprendizaje GA5-220501095-AA1-EV04** — Programa de formación SENA.
Maquetación de la interfaz gráfica en HTML/CSS/JavaScript (React + TypeScript + Tailwind CSS).

> ⚠️ **Versión académica con datos ficticios.** Este repositorio se creó para entregar la evidencia
> de maquetación web. **No contiene información real de beneficiarios**: todos los nombres, documentos,
> teléfonos y direcciones que se ven al abrir la demo son inventados para fines demostrativos.

## 🔗 Demo en línea (GitHub Pages)

**https://edguz753.github.io/sgb-maquetacion-ev04/**

Abre el link y entra con cualquiera de estas credenciales de prueba:

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | Admin123! | Administrador |
| secretaria | Secre123! | Secretaría |
| gestor | Gestor123! | Gestor de casos |
| coordinador | Coord123! | Coordinador de área |
| ps.maria | Prof123! | Profesional (Psicología) |
| ts.carlos | Prof123! | Profesional (Trabajo Social) |
| pd.ana | Prof123! | Profesional (Pedagogía) |
| nt.luis | Prof123! | Profesional (Nutrición) |

La demo corre **100% en el navegador** (modo demo con datos en memoria): no necesita backend ni base de datos.
Todo lo que crees o edites vive hasta recargar la página.

## 🧭 Qué recorrer en la demo (mapa de navegación)

1. **Login** → ingresa (ej. `secretaria`).
2. **Dashboard** → KPIs del club: beneficiarios activos, casos, actividades de hoy, atrasadas, alertas.
3. **Beneficiarios** → listado con búsqueda; haz clic en una fila para abrir la **ficha completa**
   (datos, asignación profesional, actividades del caso, documentos, controles de salud y nutrición,
   redes de apoyo, escolaridad, familia/acudientes, atenciones y condiciones).
4. **Registro** (`+ Nuevo beneficiario`) → formulario completo con validaciones.
5. **Pre-ingresos** → citaciones con flujo de estados (PENDIENTE → CITADO → CONFIRMADO → INGRESADO).
6. **Egresados** → consultas de beneficiarios retirados.
7. **Actividades** → tabla con filtros por estado; "marcar realizada" funciona.
8. **Alertas** → pulsa **"Escanear alertas"**: el motor genera alertas desde las actividades atrasadas.
9. **Documentos / Controles / Nutrición / Redes / Escolaridad** → módulos por beneficiario.
10. **Reportes** → filtros + exportación CSV y vista de impresión PDF (generados en el cliente).
11. **Usuarios / Auditoría / Catálogos / Carga operativa** → según el rol (entra como `admin`).

## 🛠️ Tecnologías (fundamentos de la maquetación)

- **HTML5** semántico (estructura de vistas en React TSX).
- **CSS** con **Tailwind CSS** (sistema de diseño: color, tipografía, espaciado, estados).
- **JavaScript/TypeScript** (React 18 + React Router, estado y consum… de API simulada).
- **Diseño responsive** (menú lateral en escritorio, menú hamburguesa en móvil).
- **Accesibilidad**: etiquetas de formulario, focus visible, contraste, atributos ARIA donde aplica.

## 📁 Estructura del proyecto

```
frontend/
├── index.html                  # documento HTML principal
├── vite.config.ts              # build (base para GitHub Pages)
├── src/
│   ├── main.tsx                # entrada (React + Router)
│   ├── app.tsx                 # rutas de la aplicación
│   ├── auth/authcontext.tsx    # sesión (contexto React)
│   ├── components/             # layout, UI kit y módulos de la ficha
│   ├── pages/                  # las 19 pantallas de la aplicación
│   └── lib/                    # cliente API, tipos, utilidades
│       ├── demo-api.ts         # modo demo: API simulada en el navegador
│       ├── demo-data.ts        # catálogos ficticios
│       └── demo-store.ts       # beneficiarios/casos/actividades ficticios
└── scripts/smoke-demo.mjs      # prueba automática del modo demo
```

> El proyecto real también incluye `backend/` (Node.js + Express + Prisma + PostgreSQL) que se
> mantiene en un repositorio privado con datos reales. Para esta evidencia se entrega la
> **maquetación del frontend** funcionando en modo demo autónomo.

## 🚀 Ejecución local

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (modo demo)
```

Build para GitHub Pages:

```bash
npm run build:demo   # genera frontend/dist con base /sgb-maquetacion-ev04/
```

## 📝 Notas de la evidencia

- La aplicación respeta la secuencia pedagógica: requerimientos → usabilidad/accesibilidad (EV02) →
  prototipo (EV03) → **maquetación HTML (esta evidencia)**.
- El menú lateral cambia según el rol (RBAC): ADMIN ve Usuarios/Auditoría/Catálogos, etc.
- Estados vacíos, de carga y de error están cubiertos en los módulos.
- `scripts/smoke-demo.mjs` ejecuta una prueba automática de los flujos principales de la demo.

## 📄 Licencia

Uso académico (SENA). Datos ficticios sin correspondencia con personas reales.
