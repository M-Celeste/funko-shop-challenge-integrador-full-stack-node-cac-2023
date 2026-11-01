# Arquitectura

El navegador solicita una ruta a Express. La ruta aplica controles de acceso y llama al controlador. Este consulta los modelos y renderiza una plantilla EJS con valores escapados y componentes compartidos.

User almacena nombre, email único, contraseña derivada y rol. Product contiene atributos del catálogo, precio, stock e imágenes. CartItem relaciona usuario y producto con una cantidad y un índice único por par. El carrito no reserva ni consume stock porque no existe confirmación de compra en el alcance.

En MySQL se usa Sequelize con mysql2. Para revisión se incluye un adaptador SQLite con la misma interfaz. Sus consultas usan parámetros y listas permitidas de columnas.

Las contraseñas usan scrypt y sal aleatoria. Las sesiones se regeneran al ingresar. Las cookies son HttpOnly y SameSite=Lax. Las escrituras usan POST y CSRF. Las rutas administrativas verifican roles en el servidor. El registro siempre crea clientes. Se limitan las solicitudes de login y registro; Helmet agrega cabeceras de seguridad.

Multer recibe imágenes en memoria con límites de tamaño y cantidad. Se verifican firmas PNG/JPG/WebP, se generan nombres aleatorios y se comprueba que las rutas permanezcan dentro de public/img. Los archivos no se ejecutan como código del servidor.

Las mutaciones se serializan dentro del proceso local para evitar carreras de cantidades en el carrito. Los cambios administrativos emiten una señal que la ruta SSE transmite a las páginas de tienda, que recargan los datos.

Referencias técnicas: [seguridad de Express](https://expressjs.com/advanced/best-practice-security/) y [dialecto MySQL de Sequelize v6](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/).
