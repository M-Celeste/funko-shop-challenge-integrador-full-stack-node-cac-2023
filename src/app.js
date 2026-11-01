require("dotenv").config({ quiet: true });
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const crypto = require("node:crypto");
const path = require("node:path");
const { csrf } = require("./middleware/security");
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(
  session({
    name: "funkoshop.sid",
    secret:
      process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.money = (n) =>
    Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  res.locals.mode = process.env.DB_MODE === "mysql" ? "mysql" : "sqlite";
  res.locals.notice = req.query.registered
    ? "Tu cuenta fue creada. Ya podés ingresar."
    : "";
  next();
});
app.post(
  ["/admin/create", "/admin/:id/edit"],
  require("./middleware/security").admin,
  require("./middleware/upload"),
);
let mutation = Promise.resolve();
app.use(async (req, res, next) => {
  if (req.method !== "POST") return next();
  const prior = mutation;
  let release;
  mutation = new Promise((r) => (release = r));
  await prior;
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      release();
    }
  };
  res.once("finish", finish);
  res.once("close", finish);
  next();
});
app.use(csrf);
app.use(require("./routes"));
app.use((req, res) =>
  res
    .status(404)
    .render("message", {
      title: "Página no encontrada",
      message: "Usá el menú para volver a la tienda.",
    }),
);
app.use((err, req, res, next) => {
  console.error(err.message);
  if (err.code?.startsWith("LIMIT_"))
    return res
      .status(400)
      .render("message", {
        title: "Archivo no admitido",
        message:
          "Podés subir hasta dos imágenes de 3 MB cada una. Volvé al formulario e intentá de nuevo.",
      });
  res
    .status(500)
    .render("message", {
      title: "Ocurrió un problema",
      message: "No se pudo completar la operación. Intentá de nuevo.",
    });
});
module.exports = app;
