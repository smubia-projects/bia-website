const cards = {
  green: {
    src: "assests/green.svg",
    title: "Data Support Analyst card",
  },
  pink: {
    src: "assests/pink.svg",
    title: "Business Analyst card",
  },
  brown: {
    src: "assests/brown.svg",
    title: "Product Strategy Analyst card",
  },
  orange: {
    src: "assests/orange.svg",
    title: "Data Engineer card",
  },
};

const modal = document.querySelector("#card-modal");
const modalTitle = document.querySelector("#modal-title");
const modalImage = document.querySelector(".modal-image");
const modalPanel = document.querySelector(".modal-panel");
const moneyHotspot = document.querySelector(".money-hotspot");
const moneyRain = document.querySelector(".money-rain");
const moneyBillSources = [
  "assests/1.svg",
  "assests/5.svg",
  "assests/10.svg",
  "assests/20.svg",
  "assests/50.svg",
  "assests/100.svg",
];
const rainDurationMs = 5000;
const billSpawnMs = 120;
const billMinFallMs = 1400;
const billMaxFallMs = 2800;
let moneyRainTimer;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createMoneyBill() {
  if (!moneyRain) return;

  const bill = document.createElement("img");
  const billSource =
    moneyBillSources[Math.floor(Math.random() * moneyBillSources.length)];

  bill.className = "money-bill";
  bill.src = billSource;
  bill.alt = "";
  bill.style.setProperty("--start-x", `${randomBetween(-8, 98)}vw`);
  bill.style.setProperty("--drift", `${randomBetween(-54, 54)}px`);
  bill.style.setProperty("--tilt", `${randomBetween(-34, 34)}deg`);
  bill.style.setProperty("--spin", `${randomBetween(-260, 260)}deg`);
  bill.style.setProperty(
    "--duration",
    `${randomBetween(billMinFallMs, billMaxFallMs)}ms`
  );
  bill.addEventListener("animationend", () => bill.remove(), { once: true });
  moneyRain.append(bill);
}

function makeItRain() {
  if (!moneyRain || moneyRainTimer) return;

  createMoneyBill();
  moneyRainTimer = window.setInterval(() => {
    createMoneyBill();
  }, billSpawnMs);

  window.setTimeout(() => {
    window.clearInterval(moneyRainTimer);
    moneyRainTimer = undefined;
  }, rainDurationMs);
}

function openCard(cardName) {
  const card = cards[cardName];
  if (!card || !modal || !modalImage || !modalTitle) return;

  modalTitle.textContent = card.title;
  modalImage.src = card.src;
  modalImage.alt = card.title;
  modal.showModal();
}

document.querySelectorAll("[data-card]").forEach((hotspot) => {
  hotspot.addEventListener("click", (event) => {
    event.preventDefault();
    openCard(hotspot.dataset.card);
  });
});

modalPanel?.addEventListener("click", () => modal?.close());
moneyHotspot?.addEventListener("click", (event) => {
  event.preventDefault();
  makeItRain();
});
