export default function scrollToSection(sectionId, options = {}) {
  if (!sectionId) return;

  const el = document.getElementById(sectionId);
  if (!el) return;

  const header = document.querySelector("header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;

  const extraOffset = typeof options.extraOffset === "number" ? options.extraOffset : 12;

  const top = el.getBoundingClientRect().top + window.pageYOffset - headerHeight - extraOffset;

  window.scrollTo({ top: Math.max(0, Math.floor(top)), behavior: options.behavior || "smooth" });
}
