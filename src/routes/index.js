const router = require("express").Router();
const shop = require("../controllers/shopController");
const auth = require("../controllers/authController");
const admin = require("../controllers/adminController");
const security = require("../middleware/security");
const { rateLimit } = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
router.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  const update = () => res.write("data: catalog\n\n");
  require("../events").on("catalog", update);
  const timer = setInterval(() => res.write(": heartbeat\n\n"), 25000);
  req.on("close", () => {
    clearInterval(timer);
    require("../events").off("catalog", update);
  });
});
router.get("/", shop.home);
router.get("/shop", shop.shop);
router.get("/shop/cart", security.login, shop.cart);
router.post("/shop/cart", security.login, shop.add);
router.post("/shop/cart/:id/update", security.login, shop.update);
router.post("/shop/cart/:id/delete", security.login, shop.remove);
router.get("/shop/item/:id", shop.item);
router.get(["/auth/login", "/auth/register"], auth.form);
router.post("/auth/login", limiter, auth.login);
router.post("/auth/register", limiter, auth.register);
router.post("/auth/logout", auth.logout);
router.get("/admin", security.admin, admin.list);
router.get("/admin/create", security.admin, admin.form);
router.post("/admin/create", security.admin, admin.save);
router.get("/admin/:id/edit", security.admin, admin.form);
router.post("/admin/:id/edit", security.admin, admin.save);
router.post("/admin/:id/delete", security.admin, admin.remove);
router.get("/contact", (req, res) =>
  res.render("contact", { title: "Contacto", sent: false, error: "" }),
);
router.post("/contact", (req, res) => {
  const valid =
    String(req.body.name || "").trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(req.body.email || "")) &&
    String(req.body.message || "").trim();
  res
    .status(valid ? 200 : 400)
    .render("contact", {
      title: "Contacto",
      sent: Boolean(valid),
      error: valid ? "" : "Completá nombre, email válido y mensaje.",
    });
});
router.get("/terms", (req, res) =>
  res.render("message", {
    title: "Condiciones de uso",
    message:
      "Proyecto educativo de Codo a Codo. Los precios, productos y cuentas se usan para demostración. No se realizan cobros ni envíos. Los datos se guardan localmente para permitir la prueba del proyecto.",
  }),
);
module.exports = router;
