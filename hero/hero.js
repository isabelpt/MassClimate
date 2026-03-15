// hero/hero.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createHero() {
  let root, svg, w, h;
  let treeImage;

  function init(container) {
    root = d3.select(container);
    w = window.innerWidth;
    h = window.innerHeight;

    svg = root.append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("viewBox", `0 0 ${w} ${h}`)
      .attr("preserveAspectRatio", "xMidYMid slice") 
      .style("display", "block");

    // Animation img
    treeImage = svg.append("image")
      .attr("class", "hero-img")
      .attr("href", "./hero/Raining.svg")
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Title
    svg.append("text")
      .attr("class", "hero-title")
      .attr("x", w / 2)
      .attr("y", h * 0.15) 
      .attr("text-anchor", "middle")
      .text("Heavy Rain & High Water")
      .style("font-family", "Playfair Display") 
      .style("font-weight", "bold")
      .style("fill", "#1a1a1a");

    // Subtitle
    const subtitle = svg.append("text")
      .attr("class", "hero-subtitle")
      .attr("x", w / 2)
      .attr("y", h * 0.32)
      .attr("text-anchor", "middle")
      .style("font-family", "Radio Canada")
      .style("fill", "#05668D");

    subtitle.append("tspan")
      .text("A story of extreme weather and flooding in the Northeast.");

    // Attribution and scroll prompt
    svg.append("text")
      .attr("class", "hero-attribution")
      .attr("x", w / 2)
      .attr("y", h - 110)
      .attr("text-anchor", "middle")
      .text("Created by Isabel Prado-Tucker for QSS 19")
      .style("font-size", "14px")
      .style("font-family", "Radio Canada")
      .style("fill", "#000");

    svg.append("text")
      .attr("class", "hero-scroll-prompt")
      .attr("x", w / 2)
      .attr("y", h - 80)
      .attr("text-anchor", "middle")
      .text("↓ Scroll to begin ↓")
      .style("font-size", "14px")
      .style("font-family", "Radio Canada")
      .style("fill", "#000");

    updateLayout();
  }

  function updateLayout() {
    if (!svg) return;

    const titleSize = Math.max(28, w * 0.035); 
    const subSize = Math.max(14, w * 0.0155);

    svg.select(".hero-title")
      .attr("y", h * 0.17)
      .style("font-size", `${titleSize}px`);

    svg.select(".hero-subtitle")
      .attr("y", h * 0.17 + titleSize * 1.2)
      .style("font-size", `${subSize}px`);

    // Center!
    treeImage
      .attr("x", w * 0.1)
      .attr("y", h * 0.30)
      .attr("width", w * 0.8)
      .attr("height", h * 0.65);
  }

  function resize(width, height) {
    w = width;
    h = height;

    svg.attr("width", w)
       .attr("height", h)
       .attr("viewBox", `0 0 ${w} ${h}`);


    svg.selectAll("text").attr("x", w / 2);
    svg.select(".hero-title").attr("y", h * 0.25);
    svg.select(".hero-subtitle").attr("y", h * 0.32);
    svg.select(".hero-attribution").attr("y", h - 80);
    svg.select(".hero-scroll-prompt").attr("y", h - 40);

    updateLayout();
  }

  return { init, resize };
}