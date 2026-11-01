const path = require("node:path");
const fs = require("node:fs");
const { Sequelize, DataTypes } = require("sequelize");
const definitions = {
  Product: {
    name: DataTypes.STRING,
    licence: DataTypes.STRING,
    category: DataTypes.STRING,
    sku: { type: DataTypes.STRING, unique: true },
    price: DataTypes.DECIMAL(12, 2),
    stock: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    image: DataTypes.STRING,
    box: DataTypes.STRING,
    discount: DataTypes.INTEGER,
    installments: DataTypes.INTEGER,
  },
  User: {
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    role: DataTypes.STRING,
  },
  CartItem: {
    userId: DataTypes.INTEGER,
    productId: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
  },
};
let sequelize, sqlite;
const models = {};
function initialize() {
  if (process.env.DB_MODE === "mysql") {
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        dialect: "mysql",
        logging: false,
      },
    );
    for (const [name, fields] of Object.entries(definitions))
      models[name] = sequelize.define(
        name,
        Object.fromEntries(
          Object.entries(fields).map(([k, v]) => [
            k,
            v.type ? { ...v, allowNull: false } : { type: v, allowNull: false },
          ]),
        ),
        {
          timestamps: false,
          ...(name === "CartItem"
            ? { indexes: [{ unique: true, fields: ["userId", "productId"] }] }
            : {}),
        },
      );
    models.User.hasMany(models.CartItem, {
      foreignKey: "userId",
      onDelete: "CASCADE",
    });
    models.Product.hasMany(models.CartItem, {
      foreignKey: "productId",
      onDelete: "CASCADE",
    });
    models.CartItem.belongsTo(models.User, { foreignKey: "userId" });
    models.CartItem.belongsTo(models.Product, { foreignKey: "productId" });

    return sequelize.sync();
  }
  const { DatabaseSync } = require("node:sqlite");
  const file =
    process.env.SQLITE_FILE || path.join(__dirname, "../../data/review.sqlite");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  sqlite = new DatabaseSync(file);
  sqlite.exec("PRAGMA foreign_keys=ON;");
  for (const [name, fields] of Object.entries(definitions)) {
    const cols = Object.keys(fields).map(
      (k) =>
        `"${k}" ${["stock", "discount", "installments", "userId", "productId", "quantity"].includes(k) ? "INTEGER" : k === "price" ? "REAL" : "TEXT"} NOT NULL ${["email", "sku"].includes(k) ? "UNIQUE" : ""} ${k === "userId" ? "REFERENCES User(id) ON DELETE CASCADE" : k === "productId" ? "REFERENCES Product(id) ON DELETE CASCADE" : ""}`,
    );
    sqlite.exec(
      `CREATE TABLE IF NOT EXISTS "${name}" (id INTEGER PRIMARY KEY AUTOINCREMENT,${cols.join(",")})`,
    );
    const allowed = Object.keys(fields);
    models[name] = {
      async findAll({ where = {} } = {}) {
        const keys = Object.keys(where).filter(
          (k) => allowed.includes(k) || k === "id",
        );
        return sqlite
          .prepare(
            `SELECT * FROM "${name}" ${keys.length ? "WHERE " + keys.map((k) => `"${k}" = ?`).join(" AND ") : ""}`,
          )
          .all(...keys.map((k) => where[k]));
      },
      async findByPk(id) {
        return sqlite.prepare(`SELECT * FROM "${name}" WHERE id=?`).get(id);
      },
      async findOne(opts) {
        return (await this.findAll(opts))[0];
      },
      async create(data) {
        const keys = allowed.filter((k) => data[k] !== undefined);
        const r = sqlite
          .prepare(
            `INSERT INTO "${name}" (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
          )
          .run(...keys.map((k) => data[k]));
        return this.findByPk(Number(r.lastInsertRowid));
      },
      async update(data, { where }) {
        const keys = allowed.filter((k) => data[k] !== undefined);
        const wk = Object.keys(where).filter(
          (k) => allowed.includes(k) || k === "id",
        );
        if (!keys.length || !wk.length) throw Error("Actualización inválida");
        return sqlite
          .prepare(
            `UPDATE "${name}" SET ${keys.map((k) => `"${k}"=?`).join(",")} WHERE ${wk.map((k) => `"${k}"=?`).join(" AND ")}`,
          )
          .run(...keys.map((k) => data[k]), ...wk.map((k) => where[k]));
      },
      async destroy({ where }) {
        const keys = Object.keys(where).filter(
          (k) => allowed.includes(k) || k === "id",
        );
        if (!keys.length) throw Error("Borrado inválido");
        return sqlite
          .prepare(
            `DELETE FROM "${name}" WHERE ${keys.map((k) => `"${k}"=?`).join(" AND ")}`,
          )
          .run(...keys.map((k) => where[k]));
      },
    };
  }
  sqlite.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS cart_user_product ON CartItem(userId,productId)",
  );
  return Promise.resolve();
}
async function close() {
  if (sequelize) await sequelize.close();
  if (sqlite) sqlite.close();
}
module.exports = { models, initialize, close };
