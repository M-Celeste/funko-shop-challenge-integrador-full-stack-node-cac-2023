require("dotenv").config({ quiet: true });
const { models, initialize, close } = require("../src/models");
const { hash } = require("../src/middleware/security");
const crypto = require("node:crypto");
async function seed() {
  if (!(await models.Product.findAll()).length)
    for (const p of require("../database/products.json")) {
      const { id, ...data } = p;
      await models.Product.create(data);
    }
  const email = process.env.ADMIN_EMAIL || "admin@funkoshop.local";
  if (!(await models.User.findOne({ where: { email } }))) {
    const password =
      process.env.ADMIN_PASSWORD ||
      crypto.randomBytes(12).toString("base64url");
    await models.User.create({
      name: "Administración",
      email,
      password: await hash(password),
      role: "admin",
    });
    console.log(
      `Cuenta administradora local: ${email}\nContraseña inicial: ${password}\nGuardala: no volverá a mostrarse.`,
    );
  }
}
if (require.main === module)
  initialize()
    .then(seed)
    .then(close)
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
module.exports = seed;
