# Funko Shop · Challenge Integrador

**Full Stack Node · Codo a Codo 2023**

Versión propia completa de un proyecto colaborativo en equipo realizado en 2023.

Aplicación web de comercio electrónico de figuras coleccionables y merchandising. Integra una tienda para clientes y un panel administrativo, con un backend desarrollado en **Node.js y Express**, vistas renderizadas con EJS y persistencia en MySQL mediante Sequelize.

## Funcionalidades

- Catálogo con búsqueda, filtros por colección, categoría y precio, y ordenamiento.
- Fichas de producto con descripción, precio, stock y galería de imágenes.
- Registro e inicio de sesión con roles de cliente y administrador.
- Carrito persistente por usuario con edición de cantidades y cálculo de subtotales.
- Panel administrativo con creación, consulta, edición y eliminación de productos.
- Carga de imágenes PNG, JPG y WebP de hasta 3 MB por archivo.
- Actualización de las vistas abiertas mediante Server-Sent Events.
- Interfaz adaptable a escritorio y dispositivos móviles.

## Tecnologías

| Tecnología | Uso en el proyecto |
| --- | --- |
| HTML5 | Estructura semántica de páginas, formularios, tablas y navegación. |
| CSS3 | Diseño adaptable con Grid, Flexbox, media queries y estados de interacción. |
| JavaScript | Lógica del servidor y eventos del DOM para menú móvil, galería y confirmaciones. |
| Node.js | Entorno de ejecución del backend y de las herramientas del proyecto. |
| Express | Servidor HTTP, rutas, middleware y gestión de solicitudes y respuestas. |
| EJS | Renderizado de páginas en el servidor y reutilización de parciales. |
| MySQL y SQL | Persistencia relacional de usuarios, productos y carritos; claves, índices y restricciones. |
| Sequelize | Modelos, asociaciones y acceso a MySQL mediante un ORM. |
| mysql2 | Conector entre la aplicación Node.js y MySQL. |
| SQLite y node:sqlite | Persistencia alternativa local sin un servidor de base de datos independiente. |
| express-session | Sesiones de acceso y contexto del usuario autenticado. |
| node:crypto | Derivación de contraseñas con scrypt, sal aleatoria, comparación segura y generación de identificadores y tokens. |
| Helmet | Cabeceras HTTP de seguridad. |
| express-rate-limit | Límites de solicitudes para registro e inicio de sesión. |
| Tokens CSRF | Validación de formularios que modifican datos mediante middleware propio. |
| Multer | Recepción de imágenes mediante formularios multipart, con límites de tamaño y cantidad. |
| dotenv | Lectura de variables de configuración del entorno. |
| Server-Sent Events y EventSource | Notificación de cambios del catálogo a las vistas abiertas. |
| node:events | Comunicación interna de los cambios administrativos. |
| Node Test Runner y node:assert | Ejecución de pruebas y comprobación de resultados. |
| Supertest | Pruebas de integración de rutas, formularios y sesiones HTTP. |
| Prettier | Formato del código y los archivos de configuración. |
| npm y pnpm | Gestión de dependencias y ejecución de scripts; pnpm-lock.yaml fija las versiones resueltas. |
| Git y GitHub | Control de versiones y alojamiento del código fuente. |
| Figma | Referencia visual de las pantallas de tienda y administración. |

El proyecto utiliza una arquitectura **Modelo Vista Controlador (MVC)**. El frontend se sirve con HTML generado por EJS y JavaScript del navegador; el backend se ejecuta en Node.js. Las imágenes utilizan recursos WebP, PNG y SVG. El catálogo inicial se define en JSON, el esquema relacional en SQL.

También se emplean módulos nativos de Node.js para acceso al sistema de archivos (`node:fs`), resolución de rutas (`node:path`), utilidades asíncronas (`node:util`) y archivos temporales de pruebas (`node:os`).

## Arquitectura y datos

Las rutas de Express reciben las solicitudes y aplican los controles de acceso. Los controladores coordinan las operaciones de tienda, autenticación y administración; los modelos consultan la base de datos y las vistas EJS presentan la información.

El modelo de datos se organiza en tres entidades:

- **User:** nombre, email único, contraseña derivada y rol.
- **Product:** nombre, licencia, categoría, SKU único, descripción, precio, stock, descuento, cuotas e imágenes.
- **CartItem:** relación entre usuario y producto con su cantidad e índice único por par.

El modo principal utiliza MySQL mediante Sequelize y mysql2. Un adaptador SQLite comparte la interfaz de acceso a datos para facilitar la ejecución local. Los cambios del administrador se comunican mediante eventos del servidor y una conexión SSE; las páginas de la tienda recuperan el catálogo actualizado.

## Autenticación y controles de acceso

El registro crea cuentas con rol de cliente y las operaciones administrativas requieren un rol autorizado en el servidor. Las contraseñas se derivan con scrypt y una sal aleatoria; la sesión se regenera al ingresar.

Los formularios de escritura incluyen tokens CSRF. Las sesiones utilizan cookies HttpOnly y SameSite=Lax, y las vistas escapan los valores dinámicos de forma predeterminada. La carga de imágenes verifica tamaño, firmas de archivo y rutas de almacenamiento. El catálogo inicial y las credenciales se gestionan por separado; los secretos del entorno y las bases locales no forman parte del código versionado.

## Rutas principales

| Ruta | Función |
| --- | --- |
| `/` | Inicio y colecciones |
| `/shop` | Catálogo y filtros |
| `/shop/item/:id` | Ficha de producto |
| `/auth/register` | Registro de clientes |
| `/auth/login` | Inicio de sesión |
| `/shop/cart` | Carrito del usuario autenticado |
| `/admin` | Administración protegida por rol |

## Validación funcional

El proyecto cuenta con seis pruebas de integración ejecutadas satisfactoriamente tanto con SQLite como con MySQL. Cubren páginas y recursos, filtros, autenticación, autorización, protección CSRF, aislamiento de carritos, cantidades, stock, subtotales, operaciones administrativas, SKU duplicado, escape de HTML y carga de imágenes.

El esquema SQL también fue verificado mediante su importación en una base MySQL vacía. Los resultados y límites de la validación se documentan en [Validación funcional](docs/VALIDACION.md).

## Estructura

- `src/models`: Sequelize y repositorio SQLite de revisión.
- `src/controllers`: tienda, autenticación y administración.
- `src/routes`: rutas HTTP y controles de acceso.
- `src/middleware`: contraseñas, autorización, CSRF y archivos.
- `src/views`: EJS y parciales compartidos.
- `public`: CSS, JavaScript e imágenes.
- `database`: esquema SQL y catálogo inicial.
- `tests`: pruebas de integración.
- `docs`: arquitectura y validación.

## Alcance

El carrito llega al subtotal; no procesa pagos. El contacto demuestra validación local sin enviar emails. Los importes y cuotas son datos educativos.

Se admiten imágenes PNG, JPG y WebP de hasta 3 MB. Los nombres de archivos subidos son aleatorios. El borrado de productos no elimina imágenes del disco para evitar perder recursos compartidos.

El servidor educativo escucha únicamente en `127.0.0.1` y funciona en un proceso. Las sesiones viven en memoria. Para alojamiento público se necesitará HTTPS, almacenamiento persistente de sesiones y secretos del entorno. Una instalación con varios procesos requeriría transacciones y coordinación de escrituras en la base.

## Referencia y recursos

La interfaz toma como referencia el [diseño de Figma](https://www.figma.com/design/IjTSeE2BpRd5Gk9VakNIhC/Challenge-Integrador---Funkoshop?node-id=19905-435). Se mantuvieron composición, marca, colores, colecciones y tipos de vista, con ajustes adaptables y controles funcionales. Se usan fuentes de sistema para evitar dependencias externas. Bootstrap es opcional en la consigna; se eligió CSS propio.

Las imágenes y marcas corresponden a los recursos del proyecto educativo original. El proyecto no representa una tienda oficial de las marcas ilustradas. Los recursos de terceros conservan los derechos de sus respectivos titulares.

Repositorio: [Funko Shop - Challenge Integrador - Full Stack Node CAC 2023](https://github.com/M-Celeste/funko-shop-challenge-integrador-full-stack-node-cac-2023).



Documentación técnica: [Arquitectura](docs/ARQUITECTURA.md) y [Validación](docs/VALIDACION.md).
