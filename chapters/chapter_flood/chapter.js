import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson@3/+esm";
import L from "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm";

export function createChapter() {
  let root, mapDiv, mapInstance;
  let width = 900, height = 560;
  let currentStepId = null;

  const visMargin = { top: 150, right: 100, bottom: 150, left: 225};
  const gridDim = 500; 
  
  const houseSpacing = 45;
  const centeringOffset = (gridDim - (10 * houseSpacing)) / 2 + 10; // center the grid

  let gridContainer = null;
  let houses = null;
  let houseSVG = null; 
  
  const housePath = "M0,10 L10,0 L20,10 L20,30 L0,30 Z M4,12 L16,12 M4,18 L16,18 M4,24 L16,18";

  function step01() {
    d3.select(".map-slider-controls").style("display", "none");
    d3.select("#house-cross-section").remove();
    houseSVG = null;

    // Create the grid
    if (!gridContainer) {
        gridContainer = root.append("div")
            .attr("class", "dice-roll-overlay")
            .style("position", "absolute")
            .style("top", `${visMargin.top}px`)
            .style("left", `${visMargin.left}px`)
            .style("width", `${gridDim}px`)
            .style("z-index", "2000")
            .style("text-align", "center");

        gridContainer.append("h2").attr("id", "grid-title");
        gridContainer.append("p").attr("id", "grid-subtitle");

        const svg = gridContainer.append("svg")
            .attr("width", gridDim)
            .attr("height", gridDim);

        const houseData = d3.range(100).map(i => ({ id: i }));

        houses = svg.selectAll(".house")
            .data(houseData).enter()
            .append("path")
            .attr("class", "house")
            .attr("d", housePath)
            // 10 x 10 grid <- finally works?
            .attr("transform", (d, i) => {
                const x = (i % 10) * houseSpacing + centeringOffset;
                const y = Math.floor(i / 10) * houseSpacing + centeringOffset;
                return `translate(${x}, ${y}) scale(1.3)`;
            })
            .attr("fill", "#e0e0e0");
    }

  
    d3.select("#grid-title").text("1970 Baseline");
    d3.select("#grid-subtitle").text("1 out of 100 houses at risk annually (1% chance)");
 
    if (houseSVG) d3.select("#house-cross-section").style("opacity", 0);
    
    houses.transition().duration(500)
        .attr("fill", (d, i) => i === 0 ? "#05668D" : "#e0e0e0") // Only house 0 is blue
        .style("opacity", 1);
  }

  function step02() {
    if (!gridContainer) step01();
    d3.select("#house-cross-section").remove();
    houseSVG = null;

    d3.select("#grid-title").text("Today");
    d3.select("#grid-subtitle").text("5 out of 100 houses at risk annually (5% chance)");

    houses.transition().duration(800)
        .attr("fill", (d, i) => i < 5 ? "#d62728" : "#e0e0e0") 
        .style("opacity", 1);
  }

  function step03() {
    if (!gridContainer) step01();
    d3.select("#house-cross-section").remove();
    houseSVG = null;

    d3.select("#grid-title").text("The New Normal");
    d3.select("#grid-subtitle").html("What was once a 100-year flood... <br>is now a <b>20-year flood.</b>");

 
    houses.filter((d, i) => i < 20).transition().duration(1000).style("opacity", 1);

    houses.filter((d, i) => i >= 20)
        .transition().duration(1000)
        .style("opacity", 0);

    houses.filter((d, i) => i < 20)
        .transition().duration(1000)
        .attr("fill", (d, i) => i === 0 ? "#d62728" : "#e0e0e0");
  }

  function step04() {
      if (!gridContainer) step01();
      d3.select("#house-cross-section").remove();
      houseSVG = null;

      d3.select("#grid-title").text("The Mapping Gap");
      d3.select("#grid-subtitle").html(
          "Official FEMA maps often protect for the <b>1% risk</b> (1 in 100),<br/>" +
          "even though <b>5%</b> (5 in 100) are now being affected."
      );

      houses.transition().duration(800)
          .style("opacity", 1)
          .attr("fill", (d, i) => i < 5 ? "#d62728" : "#e0e0e0");

      // 4. Highlight the "Unprotected" Houses
      houses.filter((d, i) => i == 0)
          .transition()
          .delay(1000)
          .duration(500)
          .style("opacity", 1)
          .attr("fill", "#05668D");
  }

  function step05() {
      if (!gridContainer) step01();

    houses.transition()
      .duration(800)
      .style("opacity", 0);

      d3.select("#grid-title").text("The Stakes: Inside the Home");
      d3.select("#grid-subtitle").html(
          "A few inches of water is the difference between <br/>" +
          "a damp basement and a total structural loss."
      );

      const svg = d3.select(".dice-roll-overlay svg");

      if (!houseSVG || d3.select("#house-cross-section").empty()) {
          d3.xml("chapters/chapter_flood/house.svg").then(xml => {
              const importedNode = document.importNode(xml.documentElement, true);
              houseSVG = svg.append(() => importedNode)
                  .attr("id", "house-cross-section")
                  .attr("width", gridDim - 100)
                  .attr("height", gridDim - 100)
                  .attr("x", 50)
                  .attr("y", 0)
                  .style("opacity", 0)
                  .transition().duration(800)
                  .style("opacity", 1);
          });
      } else {
          d3.select("#house-cross-section").transition().duration(800).style("opacity", 1);
      }
  }

  function step07() {
    const house = d3.select("#house-cross-section");      
    d3.select("#grid-title")
      .transition().duration(800)
      .text("The Stakes: Inside the Home");
}

function step08() {
  const house = d3.select("#house-cross-section");

  // float away
  house.transition()
    .duration(2500) 
    .ease(d3.easeQuadIn) 
    .attr("x", width + 500)
    .attr("y", -100)    
    .style("opacity", 0)
    .remove();         
  d3.select("#grid-title")
    .transition().duration(800)
    .text("The Aftermath");
}

  function applyStep(stepId) {
    currentStepId = stepId;

    if (stepId === "c05-step-01") return step01();
    if (stepId === "c05-step-02") return step02();
    if (stepId === "c05-step-03") return step03();
    if (stepId === "c05-step-04") return step04();
    if (stepId === "c05-step-05") return step05();
    if (stepId === "c05-step-06") return step05();
    if (stepId === "c05-step-07") return step07();
    if (stepId === "c05-step-08") return step08();
    //step01();
  }

  function resize(w, h) {
    width = w ?? width;
    height = h ?? height;
    if (gridContainer) {
        gridContainer
          .style("top", `${visMargin.top}px`)
          .style("left", `${visMargin.left}px`);
    }
  }

  function init(container, ctx) {
    root = d3.select(container);

    mapDiv = root.append("div")
      .attr("id", "map")
      .style("width", "100%")
      .style("height", "100%")
      .style("position", "absolute");

    const svg = root.append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("position", "absolute")
      .style("top", 0)
      .style("left", 0)
      .style("pointer-events", "none") 
      .style("z-index", 1);

    applyStep("c05-step-01");
  }

  return { init, resize, onStepEnter: applyStep };
}