export function initProjectFilters() {
  const buttons = Array.from(document.querySelectorAll("[data-project-filter]"));
  const cards = Array.from(document.querySelectorAll(".project-card[data-category]"));
  if (!buttons.length || !cards.length) return;

  const total = document.querySelector('[data-project-filter="all"] span');
  if (total) total.textContent = String(cards.length).padStart(2, "0");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-project-filter") || "all";

      buttons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });

      cards.forEach((card) => {
        const matches = filter === "all" || card.getAttribute("data-category") === filter;
        card.hidden = !matches;
      });
    });
  });
}
