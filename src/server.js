const app = require("./app");
const { initialize } = require("./models");
const seed = require("../scripts/seed");
initialize()
  .then(seed)
  .then(() => {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, "127.0.0.1", () =>
      console.log(`Challenge Integrador: http://localhost:${port}`),
    );
  })
  .catch((e) => {
    console.error("No se pudo iniciar:", e.message);
    process.exitCode = 1;
  });
