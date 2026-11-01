const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { randomBytes } = require("node:crypto");
const adminTestPassword = randomBytes(24).toString("hex");
const customerTestPassword = randomBytes(24).toString("hex");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "challenge-test-"));
process.env.SQLITE_FILE = path.join(dir, "test.sqlite");
process.env.DB_MODE = process.env.TEST_MYSQL === "1" ? "mysql" : "sqlite";
if (
  process.env.DB_MODE === "mysql" &&
  !/^challenge_test(?:_[a-z0-9]+)?$/.test(process.env.DB_NAME || "")
)
  throw Error(
    "Utilizá una base exclusiva de pruebas llamada challenge_test o challenge_test_...",
  );
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = adminTestPassword;
const request = require("supertest");
const app = require("../src/app");
const { models, initialize, close } = require("../src/models");
const seed = require("../scripts/seed");
const customer = request.agent(app),
  admin = request.agent(app);
const csrf = (r) => r.text.match(/name="_csrf" value="([^"]+)"/)?.[1];
async function login(agent, email, password) {
  const r = await agent.get("/auth/login");
  return agent
    .post("/auth/login")
    .type("form")
    .send({ _csrf: csrf(r), email, password });
}
before(async () => {
  await initialize();
  if (
    (await models.Product.findAll()).length ||
    (await models.User.findAll()).length
  )
    throw Error("La base de pruebas debe estar vacía");
  await seed();
});
after(async () => {
  await close();
  fs.rmSync(dir, { recursive: true, force: true });
});
test("páginas públicas, recursos y filtros", async () => {
  for (const url of [
    "/",
    "/shop",
    "/shop/item/1",
    "/contact",
    "/terms",
    "/auth/login",
    "/auth/register",
  ]) {
    const r = await request(app).get(url);
    assert.equal(r.status, 200, url);
    assert.match(r.text, /lang="es"/);
  }
  const r = await request(app).get("/shop?licence=POK%C3%89MON");
  assert.equal(r.status, 200);
  assert.doesNotMatch(r.text, /Baby Yoda Blueball/);
  assert.equal((await request(app).get("/shop/item/999")).status, 404);
  for (const p of await models.Product.findAll())
    for (const field of ["image", "box"])
      assert.ok(fs.existsSync(path.join(__dirname, "../public/img", p[field])));
});
test("CSRF y autorización", async () => {
  assert.equal(
    (
      await request(app)
        .post("/auth/login")
        .type("form")
        .send({ email: "a", password: "b" })
    ).status,
    403,
  );
  assert.equal((await request(app).get("/admin")).status, 302);
  assert.equal((await request(app).get("/shop/cart")).status, 302);
});
test("registro, login, carrito persistente, stock y aislamiento", async () => {
  let r = await customer.get("/auth/register");
  r = await customer
    .post("/auth/register")
    .type("form")
    .send({
      _csrf: csrf(r),
      name: "Cliente Prueba",
      email: "cliente@test.local",
      password: customerTestPassword,
      confirm: customerTestPassword,
      terms: "on",
      role: "admin",
    });
  assert.equal(r.status, 302);
  assert.equal(
    (await login(customer, "cliente@test.local", customerTestPassword)).status,
    302,
  );
  assert.equal((await customer.get("/admin")).status, 403);
  r = await customer.get("/shop/item/1");
  const token = csrf(r);
  assert.equal(
    (
      await customer
        .post("/shop/cart")
        .type("form")
        .send({ _csrf: token, productId: 1, quantity: 2 })
    ).status,
    302,
  );
  r = await customer.get("/shop/cart");
  assert.match(r.text, /Baby Yoda/);
  assert.match(r.text, /3\.599,98/);
  assert.equal(
    (
      await customer
        .post("/shop/cart")
        .type("form")
        .send({ _csrf: token, productId: 1, quantity: 999 })
    ).status,
    400,
  );
  const row = await models.CartItem.findOne({ where: { productId: 1 } });
  assert.equal(row.quantity, 2);
  assert.equal(
    (
      await customer
        .post(`/shop/cart/${row.id}/update`)
        .type("form")
        .send({ _csrf: token, quantity: 3 })
    ).status,
    302,
  );
  assert.equal((await models.CartItem.findByPk(row.id)).quantity, 3);
  assert.equal(
    (
      await customer
        .post(`/shop/cart/${row.id}/delete`)
        .type("form")
        .send({ _csrf: token })
    ).status,
    302,
  );
  assert.equal((await models.CartItem.findAll()).length, 0);
  const other = request.agent(app);
  r = await other.get("/auth/register");
  await other
    .post("/auth/register")
    .type("form")
    .send({
      _csrf: csrf(r),
      name: "Otra",
      email: "otra@test.local",
      password: customerTestPassword,
      confirm: customerTestPassword,
      terms: "on",
    });
  await login(other, "otra@test.local", customerTestPassword);
  r = await customer.get("/shop/item/2");
  await customer
    .post("/shop/cart")
    .type("form")
    .send({ _csrf: csrf(r), productId: 2, quantity: 1 });
  const line = await models.CartItem.findOne({ where: { productId: 2 } });
  r = await other.get("/shop/cart");
  await other
    .post(`/shop/cart/${line.id}/delete`)
    .type("form")
    .send({ _csrf: csrf(r) });
  assert.ok(await models.CartItem.findByPk(line.id));
});
test("CRUD admin, validaciones, escape HTML y reflejo público", async () => {
  assert.equal(
    (await login(admin, "admin@test.local", adminTestPassword)).status,
    302,
  );
  let r = await admin.get("/admin/create");
  const token = csrf(r);
  const data = {
    _csrf: token,
    name: "Figura <script>alert(1)</script>",
    licence: "POKÉMON",
    category: "Figuras",
    sku: "TEST-001",
    price: 1500,
    stock: 5,
    description: "Figura de prueba",
    image: "pokemon/pikachu-1.webp",
    box: "pokemon/pikachu-box.webp",
    discount: 10,
    installments: 3,
  };
  assert.equal(
    (
      await admin
        .post("/admin/create")
        .type("form")
        .send({ ...data, stock: -1 })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin
        .post("/admin/create")
        .type("form")
        .send({ ...data, image: "../../.env" })
    ).status,
    400,
  );
  assert.equal(
    (await admin.post("/admin/create").type("form").send(data)).status,
    302,
  );
  const product = await models.Product.findOne({ where: { sku: "TEST-001" } });
  r = await request(app).get("/shop/item/" + product.id);
  assert.match(r.text, /&lt;script&gt;/);
  assert.doesNotMatch(r.text, /<script>alert/);
  assert.equal(
    (
      await admin
        .post(`/admin/${product.id}/edit`)
        .type("form")
        .send({ ...data, name: "Figura editada", price: 1600 })
    ).status,
    302,
  );
  assert.match(
    (await request(app).get("/shop/item/" + product.id)).text,
    /Figura editada/,
  );
  assert.equal(
    (await admin.post("/admin/create").type("form").send(data)).status,
    400,
  );
  assert.equal(
    (
      await admin
        .post(`/admin/${product.id}/delete`)
        .type("form")
        .send({ _csrf: token })
    ).status,
    302,
  );
  assert.equal(
    (await request(app).get("/shop/item/" + product.id)).status,
    404,
  );
});
test("contacto y logout", async () => {
  let r = await customer.get("/contact");
  r = await customer
    .post("/contact")
    .type("form")
    .send({
      _csrf: csrf(r),
      name: "Prueba",
      email: "test@example.com",
      message: "Consulta",
    });
  assert.equal(r.status, 200);
  assert.match(r.text, /No se envió ningún correo/);
  r = await customer.get("/");
  await customer
    .post("/auth/logout")
    .type("form")
    .send({ _csrf: csrf(r) });
  assert.equal((await customer.get("/shop/cart")).status, 302);
});

test("subida multipart y rechazo de archivos inválidos", async () => {
  let r = await admin.get("/admin/create");
  const token = csrf(r);
  const fields = {
    _csrf: token,
    name: "Imagen subida",
    licence: "POKÉMON",
    category: "Figuras",
    sku: "UPLOAD-TEST",
    price: "100",
    stock: "3",
    description: "Imagen de prueba",
    discount: "0",
    installments: "3",
  };
  let operation = admin.post("/admin/create");
  for (const [k, v] of Object.entries(fields))
    operation = operation.field(k, v);
  r = await operation
    .attach("frontFile", Buffer.from("archivo de texto"), "fake.png")
    .attach(
      "boxFile",
      path.join(__dirname, "../public/img/pokemon/pikachu-box.webp"),
    );
  assert.equal(r.status, 400);
  operation = admin.post("/admin/create");
  for (const [k, v] of Object.entries(fields))
    operation = operation.field(k, v);
  r = await operation
    .attach(
      "frontFile",
      path.join(__dirname, "../public/img/pokemon/pikachu-1.webp"),
    )
    .attach(
      "boxFile",
      path.join(__dirname, "../public/img/pokemon/pikachu-box.webp"),
    );
  assert.equal(r.status, 302);
  const product = await models.Product.findOne({
    where: { sku: "UPLOAD-TEST" },
  });
  assert.match(product.image, /^uploads\//);
  assert.equal((await request(app).get("/img/" + product.image)).status, 200);
  await admin
    .post(`/admin/${product.id}/delete`)
    .type("form")
    .send({ _csrf: token });
  for (const field of ["image", "box"])
    fs.unlinkSync(path.join(__dirname, "../public/img", product[field]));
});
