const { models } = require("../models");
const fs = require("node:fs");
const path = require("node:path");
const fields = [
  "name",
  "licence",
  "category",
  "sku",
  "price",
  "stock",
  "description",
  "image",
  "box",
  "discount",
  "installments",
];
const plain = (p) => (p?.toJSON ? p.toJSON() : p);
exports.list = async (req, res) => {
  let products = (await models.Product.findAll()).map(plain);
  const q = String(req.query.q || "");
  products = products.filter((p) =>
    (p.name + " " + p.sku + " " + p.licence)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  res.render("admin", { title: "Administración", products, q });
};
exports.form = async (req, res) => {
  const product = req.params.id
    ? plain(await models.Product.findByPk(Number(req.params.id)))
    : {};
  if (!product) return res.sendStatus(404);
  res.render("product-form", {
    title: product.id ? "Editar producto" : "Crear producto",
    product,
    error: "",
  });
};
exports.save = async (req, res) => {
  let product = Object.fromEntries(
    fields.map((k) => [k, String(req.body[k] || "").trim()]),
  );
  for (const f of ["price", "stock", "discount", "installments"])
    product[f] = Number(product[f]);
  let error = "";
  const uploads = [];
  for (const [key, field] of [
    ["image", "frontFile"],
    ["box", "boxFile"],
  ]) {
    const file = req.files?.[field]?.[0];
    if (file) {
      const b = file.buffer;
      const ext = b
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "png"
        : b[0] === 255 && b[1] === 216 && b[2] === 255
          ? "jpg"
          : b.toString("ascii", 0, 4) === "RIFF" &&
              b.toString("ascii", 8, 12) === "WEBP"
            ? "webp"
            : null;
      if (!ext) {
        error = "Subí imágenes PNG, JPG o WebP válidas (máximo 3 MB).";
        continue;
      }
      product[key] =
        "uploads/" + require("node:crypto").randomUUID() + "." + ext;
      uploads.push({ key, buffer: b });
    }
  }
  if (
    !product.name ||
    product.name.length > 100 ||
    !product.sku ||
    !product.licence ||
    !product.description ||
    !["Figuras", "Remeras", "Llaveros"].includes(product.category)
  )
    error = "Completá los campos y elegí una categoría válida.";
  if (
    !Number.isFinite(product.price) ||
    product.price <= 0 ||
    product.price > 99999999 ||
    !Number.isInteger(product.stock) ||
    product.stock < 0 ||
    product.stock > 100000 ||
    !Number.isInteger(product.discount) ||
    product.discount < 0 ||
    product.discount > 90 ||
    !Number.isInteger(product.installments) ||
    product.installments < 1 ||
    product.installments > 24
  )
    error = "Revisá precio, stock, descuento (0–90) y cuotas (1–24).";
  for (const key of ["image", "box"]) {
    const root = path.resolve(__dirname, "../../public/img");
    const image = path.resolve(root, product[key]);
    if (
      !product[key] ||
      !image.startsWith(root + path.sep) ||
      (!uploads.some((u) => u.key === key) && !fs.existsSync(image)) ||
      !/\.(webp|png|jpg|jpeg)$/i.test(image)
    )
      error = "Indicá rutas de imágenes existentes dentro de public/img.";
  }
  const duplicate = await models.Product.findOne({
    where: { sku: product.sku },
  });
  if (duplicate && duplicate.id !== Number(req.params.id))
    error = "El SKU ya existe.";
  if (req.params.id && !(await models.Product.findByPk(Number(req.params.id))))
    return res.sendStatus(404);
  if (error)
    return res
      .status(400)
      .render("product-form", {
        title: "Revisar producto",
        product: { ...product, id: req.params.id },
        error,
      });
  for (const u of uploads) {
    const target = path.join(__dirname, "../../public/img", product[u.key]);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, u.buffer, { flag: "wx" });
  }
  if (req.params.id)
    await models.Product.update(product, {
      where: { id: Number(req.params.id) },
    });
  else await models.Product.create(product);
  require("../events").emit("catalog");
  res.redirect("/admin");
};
exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await models.CartItem.destroy({ where: { productId: id } });
  await models.Product.destroy({ where: { id } });
  require("../events").emit("catalog");
  res.redirect("/admin");
};
