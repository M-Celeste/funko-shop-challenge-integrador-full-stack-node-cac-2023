const { models } = require("../models");
const plain = (p) => (p?.toJSON ? p.toJSON() : p);
async function all() {
  return (await models.Product.findAll()).map(plain);
}
exports.home = async (req, res) =>
  res.render("home", { title: "Inicio", products: (await all()).slice(0, 3) });
exports.shop = async (req, res) => {
  let products = await all();
  const q = String(req.query.q || "").slice(0, 100),
    licence = String(req.query.licence || ""),
    category = String(req.query.category || "");
  if (q)
    products = products.filter((p) =>
      (p.name + " " + p.sku).toLowerCase().includes(q.toLowerCase()),
    );
  if (licence) products = products.filter((p) => p.licence === licence);
  if (category) products = products.filter((p) => p.category === category);
  if (req.query.min)
    products = products.filter((p) => p.price >= Number(req.query.min));
  if (req.query.max)
    products = products.filter((p) => p.price <= Number(req.query.max));
  if (req.query.available) products = products.filter((p) => p.stock > 0);
  if (req.query.sale) products = products.filter((p) => p.discount > 0);
  const sort = req.query.sort || "new";
  products.sort(
    sort === "price-asc"
      ? (a, b) => a.price - b.price
      : sort === "price-desc"
        ? (a, b) => b.price - a.price
        : sort === "name"
          ? (a, b) => a.name.localeCompare(b.name)
          : (a, b) => b.id - a.id,
  );
  res.render("shop", {
    title: "Shop",
    products,
    q,
    licence,
    category,
    query: req.query,
  });
};
exports.item = async (req, res) => {
  const product = plain(await models.Product.findByPk(Number(req.params.id)));
  if (!product)
    return res
      .status(404)
      .render("message", {
        title: "Producto no encontrado",
        message: "El producto ya no está disponible.",
      });
  res.render("item", {
    title: product.name,
    product,
    products: (await all())
      .filter((p) => p.id !== product.id && p.licence === product.licence)
      .slice(0, 3),
  });
};
exports.cart = async (req, res) => {
  const rows = await models.CartItem.findAll({
    where: { userId: req.session.user.id },
  });
  const lines = [];
  for (const r of rows) {
    const product = plain(await models.Product.findByPk(r.productId));
    if (product)
      lines.push({
        id: r.id,
        quantity: r.quantity,
        product,
        subtotal:
          Math.round(
            Number(product.price) * (100 - product.discount) * r.quantity,
          ) / 100,
      });
  }
  res.render("cart", {
    title: "Carrito",
    lines,
    total: lines.reduce((s, l) => s + l.subtotal, 0),
  });
};
exports.add = async (req, res) => {
  const product = plain(
    await models.Product.findByPk(Number(req.body.productId)),
  );
  const qty = Number(req.body.quantity);
  if (!product || !Number.isInteger(qty) || qty < 1)
    return res
      .status(400)
      .render("message", {
        title: "Cantidad inválida",
        message: "Indicá una cantidad válida.",
      });
  const existing = await models.CartItem.findOne({
    where: { userId: req.session.user.id, productId: product.id },
  });
  const quantity = qty + (existing?.quantity || 0);
  if (quantity > product.stock)
    return res
      .status(400)
      .render("message", {
        title: "Stock insuficiente",
        message: `Disponibles: ${product.stock}. Revisá la cantidad de tu carrito.`,
      });
  if (existing)
    await models.CartItem.update({ quantity }, { where: { id: existing.id } });
  else
    await models.CartItem.create({
      userId: req.session.user.id,
      productId: product.id,
      quantity,
    });
  res.redirect("/shop/cart");
};
exports.update = async (req, res) => {
  const row = await models.CartItem.findOne({
    where: { id: Number(req.params.id), userId: req.session.user.id },
  });
  if (!row) return res.sendStatus(404);
  const quantity = Number(req.body.quantity);
  const product = plain(await models.Product.findByPk(row.productId));
  if (
    !product ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > product.stock
  )
    return res
      .status(400)
      .render("message", {
        title: "Cantidad inválida",
        message: "La cantidad debe estar entre cero y el stock disponible.",
      });
  if (quantity === 0) await models.CartItem.destroy({ where: { id: row.id } });
  else await models.CartItem.update({ quantity }, { where: { id: row.id } });
  res.redirect("/shop/cart");
};
exports.remove = async (req, res) => {
  await models.CartItem.destroy({
    where: { id: Number(req.params.id), userId: req.session.user.id },
  });
  res.redirect("/shop/cart");
};
