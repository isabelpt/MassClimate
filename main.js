import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

/**
 * Hero & conclusion init
 */
async function initHero() {
  const root = d3.select("#scrolly-root");
  const heroSection = root.append("section").attr("class", "hero").attr("id", "hero");
  const mount = heroSection.append("div").attr("class", "hero-mount").node();
  const mod = await import("./hero/hero.js");
  const hero = mod.createHero();
  hero.init(mount);
  window.addEventListener("resize", () => hero.resize?.(mount.clientWidth, mount.clientHeight));
}

async function initConclusion() {
  const root = d3.select("#scrolly-root");
  const endSection = root.append("section").attr("class", "end").attr("id", "end");
  const mount = endSection.append("div").attr("class", "end-mount").node();
  const mod = await import("./conclusion/conclusion.js");
  const end = mod.createEnd();
  end.init(mount);
  window.addEventListener("resize", () => end.resize?.(mount.clientWidth, mount.clientHeight));
}

/**
 * Load chapters
 */
const CHAPTERS_DIR = "./chapters";
const scroller = scrollama();

const state = {
  shared: {},
  stepToChapterId: new Map(),
  chapters: new Map(), 
};

async function loadShared() {
  return { config: { defaultVisHeight: 520 } };
}

async function loadChapterFolderList() {
  const idx = await d3.json(`${CHAPTERS_DIR}/index.json`);
  return idx.chapters;
}

async function loadManifests(folders) {
  const ms = await Promise.all(
    folders.map(async (folder) => {
      const manifest = await d3.json(`${CHAPTERS_DIR}/${folder}/manifest.json`);
      return { folder, manifest };
    })
  );
  ms.sort((a, b) => a.manifest.order - b.manifest.order);
  return ms;
}

function injectChapterCSS(folder, manifest) {
  const id = `css-${manifest.id}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `${CHAPTERS_DIR}/${folder}/chapter.css`;
  document.head.appendChild(link);
}

/**
 * Scaffolding
 */
function buildPageScaffold(loaded) {
  const root = d3.select("#scrolly-root");
  
  // Hidden default for hero pg
  d3.selectAll(".water-sidebar").classed("water-hidden", true);

  for (const { folder, manifest } of loaded) {
    const section = root.append("section")
      .attr("class", `chapter ${manifest.namespace}`)
      .attr("data-chapter", manifest.namespace)
      .attr("id", manifest.id);

    const visCol = section.append("div").attr("class", "chapter-vis");
    const visMount = visCol.append("div").attr("class", "vis-mount").node();
    const overlay = section.append("div").attr("class", "chapter-overlay");

    const stepSel = overlay.selectAll("div.step")
      .data(manifest.steps).join("div")
      .attr("class", "step")
      .attr("data-step", d => d.id);

    const card = stepSel.append("div").attr("class", "step-card");
    card.append("h3").text(d => d.label ?? d.id);
    card.append("p").html(d => d.text ?? "");

    manifest.steps.forEach(s => state.stepToChapterId.set(s.id, manifest.id));
    state.chapters.set(manifest.id, { folder, manifest, api: null, visNode: visMount });
    injectChapterCSS(folder, manifest);
  }
}

/**
 * Load chapter data
 */
async function loadChapterData(folder, manifest) {
  const files = Array.isArray(manifest.dataFiles) ? manifest.dataFiles : [];
  const out = {};
  for (const relPath of files) {
    const full = `${CHAPTERS_DIR}/${folder}/${relPath}`;
    if (relPath.toLowerCase().endsWith(".csv")) out[relPath] = await d3.csv(full, d3.autoType);
    else if (relPath.toLowerCase().endsWith(".json")) out[relPath] = await d3.json(full);
  }
  return out;
}

// Init chapters
async function initChapters() {
  for (const ch of state.chapters.values()) {
    const mod = await import(`${CHAPTERS_DIR}/${ch.folder}/chapter.js`);
    const api = mod.createChapter();
    const chapterData = await loadChapterData(ch.folder, ch.manifest);
    api.init(ch.visNode, { shared: state.shared, manifest: ch.manifest, chapterData });
    ch.api = api;
  }
}

// Controls flooding animation
function setupGlobalFlood() {
  const fills = d3.selectAll(".water-fill");
  const sidebars = d3.selectAll(".water-sidebar");

  window.addEventListener("scroll", () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Hide at the top
    if (scrollTop < 850) {
      sidebars.classed("water-hidden", true);
      return; 
    } else {
      // once moved off hero show
      sidebars.classed("water-hidden", false);
    }

    const winHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const distanceToBottom = docHeight - (scrollTop + winHeight);

    if (distanceToBottom < 50) {
      fills.interrupt().style("height", "95%");
      
      // ewmoved transition animation
      d3.select(".final-statement").classed("is-visible", true);
          
      return; 
  } else {
    d3.select(".final-statement").classed("is-visible", true);
  }

    if (sidebars.classed("water-flooding")) return;

    const scrollableDistance = docHeight - winHeight;
    const progress = Math.min(scrollTop / scrollableDistance, 1);
    fills.style("height", (progress * 95) + "%");
  });
}

/**
 * Scrollama setup
 */
function setupScrollama() {
  scroller
    .setup({ step: ".step", offset: 0.65, debug: false })
    .onStepEnter(({ element, direction }) => {
      const stepId = element.getAttribute("data-step");
      const chapterId = state.stepToChapterId.get(stepId);
      const ch = state.chapters.get(chapterId);
      if (!ch?.api) return;

      const fills = d3.selectAll(".water-fill");
      const sidebars = d3.selectAll(".water-sidebar");

      // double check unhidden
      sidebars.classed("water-hidden", false);

      // once flooded, control height
      const manualHeights = {
        "c05-step-05": "23%",
        "c05-step-06": "27%",
        "c05-step-07": "40%",
        "c05-step-08": "40%",
        "c05-step-09": "95%"
      };

      if (manualHeights[stepId]) {
        sidebars.classed("water-flooding", true);
        fills.interrupt()
          .transition()
          .duration(1000)
          .style("height", manualHeights[stepId]);
      } else {
        sidebars.classed("water-flooding", false);
      }

      // resize
      ch.api.resize(ch.visNode.clientWidth, ch.visNode.clientHeight || 600);
      
      ch.api.onStepEnter(stepId, direction);
      d3.select(element).classed("is-active", true);
    })
    .onStepExit(({ element }) => d3.select(element).classed("is-active", false));

  window.addEventListener("resize", () => {
    scroller.resize();
    for (const ch of state.chapters.values()) {
      ch.api?.resize(ch.visNode.clientWidth, ch.visNode.clientHeight || 600);
    }
  });
}

async function main() {
  state.shared = await loadShared();
  await initHero(); 
  const folders = await loadChapterFolderList();
  const loaded = await loadManifests(folders);
  buildPageScaffold(loaded);
  await initChapters();
  await initConclusion();
  setupGlobalFlood();
  setupScrollama();
}

main().catch(err => console.error(err));