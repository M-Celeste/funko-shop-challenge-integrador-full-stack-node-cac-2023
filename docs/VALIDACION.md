# Validación

Comprobaciones del 1 de noviembre de 2026.

## Pruebas de integración

Seis pruebas con Node Test y Supertest, todas aprobadas en SQLite y MySQL:

1. Páginas públicas, producto inexistente, filtros e imágenes.
2. CSRF y restricciones sin sesión.
3. Registro, login, rol cliente, stock, subtotal, actualización y eliminación del carrito, aislamiento entre usuarios.
4. CRUD administrativo, campos inválidos, SKU duplicado, escape HTML y reflejo público.
5. Contacto y logout.
6. Subida multipart, rechazo de texto disfrazado de imagen y disponibilidad del recurso guardado.

La integración se comprobó con MySQL 8.0.43, con tablas creadas mediante Sequelize y con el esquema SQL importado en una base vacía.

## Revisión visual

Se inspeccionaron las páginas Tienda y Admin del Figma suministrado. En el proyecto local se revisaron Inicio, Shop y Administración en escritorio, y Shop a 390 × 844. El login administrativo se comprobó desde el formulario del navegador. Los demás flujos se cubrieron con pruebas de integración; no se afirma una auditoría visual exhaustiva de todos los estados ni navegadores.

## Límites

Las sesiones caducan al reiniciar; usuarios, productos y carrito persisten. La actualización en vivo requiere una conexión SSE activa. Una pestaña suspendida recupera los datos al recargar. No se verificó carga masiva ni varios procesos. No hay cobros ni correos reales.
