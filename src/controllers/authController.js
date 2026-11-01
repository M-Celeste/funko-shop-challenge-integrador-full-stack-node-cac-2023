const { models } = require("../models");
const { hash, verify } = require("../middleware/security");
exports.form = (req, res) =>
  res.render("auth", {
    title: req.path.includes("register") ? "Crear cuenta" : "Ingresar",
    register: req.path.includes("register"),
    error: "",
    values: {},
  });
exports.register = async (req, res) => {
  const name = String(req.body.name || "").trim(),
    email = String(req.body.email || "")
      .trim()
      .toLowerCase(),
    password = String(req.body.password || "");
  const error =
    !name || name.length > 100
      ? "Ingresá un nombre de hasta 100 caracteres."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190
        ? "Ingresá un email válido."
        : password.length < 8 || password.length > 128
          ? "La contraseña debe tener entre 8 y 128 caracteres."
          : password !== req.body.confirm
            ? "Las contraseñas no coinciden."
            : !req.body.terms
              ? "Aceptá las condiciones de uso."
              : (await models.User.findOne({ where: { email } }))
                ? "Ese email ya está registrado."
                : "";
  if (error)
    return res
      .status(400)
      .render("auth", {
        title: "Crear cuenta",
        register: true,
        error,
        values: { name, email },
      });
  await models.User.create({
    name,
    email,
    password: await hash(password),
    role: "customer",
  });
  res.redirect("/auth/login?registered=1");
};
exports.login = async (req, res) => {
  const user = await models.User.findOne({
    where: {
      email: String(req.body.email || "")
        .trim()
        .toLowerCase(),
    },
  });
  if (!user || !(await verify(String(req.body.password || ""), user.password)))
    return res
      .status(400)
      .render("auth", {
        title: "Ingresar",
        register: false,
        error: "Email o contraseña incorrectos.",
        values: {},
      });
  req.session.regenerate((err) => {
    if (err) throw err;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    req.session.save(() =>
      res.redirect(user.role === "admin" ? "/admin" : "/shop"),
    );
  });
};
exports.logout = (req, res) =>
  req.session.destroy(() => {
    res.clearCookie("funkoshop.sid");
    res.redirect("/");
  });
