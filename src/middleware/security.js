const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);
async function hash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + (await scrypt(password, salt, 64)).toString("hex");
}
async function verify(password, stored) {
  try {
    const [salt, key] = stored.split(":");
    const actual = await scrypt(password, salt, 64);
    const expected = Buffer.from(key, "hex");
    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
function csrf(req, res, next) {
  req.session.csrf ||= crypto.randomBytes(32).toString("hex");
  res.locals.csrf = req.session.csrf;
  if (req.method === "POST" && req.body._csrf !== req.session.csrf)
    return res
      .status(403)
      .render("message", {
        title: "Formulario vencido",
        message: "Volvé a cargar la página e intentá de nuevo.",
      });
  next();
}
function login(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}
function admin(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  if (req.session.user.role !== "admin")
    return res
      .status(403)
      .render("message", {
        title: "Acceso restringido",
        message: "Esta sección requiere una cuenta administradora.",
      });
  next();
}
module.exports = { hash, verify, csrf, login, admin };
