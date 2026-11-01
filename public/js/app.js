const menu = document.querySelector(".menu-toggle");
menu?.addEventListener("click", () => {
  const expanded = menu.getAttribute("aria-expanded") === "true";
  menu.setAttribute("aria-expanded", String(!expanded));
  document.querySelector("#nav-links").classList.toggle("open", !expanded);
});
for (const button of document.querySelectorAll("[data-image]"))
  button.addEventListener("click", () => {
    document.querySelector("#main-product").src = button.dataset.image;
  });
for (const form of document.querySelectorAll(".confirm-delete"))
  form.addEventListener("submit", (event) => {
    if (
      !confirm("¿Eliminar este producto? También se quitará de los carritos.")
    )
      event.preventDefault();
  });

if (location.pathname === "/" || location.pathname.startsWith("/shop")) {
  const events = new EventSource("/events");
  events.onmessage = () => location.reload();
}
