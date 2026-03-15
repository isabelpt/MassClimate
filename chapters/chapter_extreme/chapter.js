import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createChapter() {
  let root, svg, g; 
  let width = 900, height = 560;
  let currentStepId = null;
  let lastStepId = null; 
  let yearlyData = null; 
  let movingData = null; 
  
  const margin = { top: 150, right: 100, bottom: 150, left: 100 };
  const colorPalette = {darkblue: "#05668D", medblue: "#427AA1", light: "#EBF2FA", green:"#679436", lime: "#A5BE00"}
  
  let yScaleEP = null;
  let xScale = null;

  function step01() {
    if (!yearlyData || !width || !height) return;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    g.selectAll("*").interrupt().remove();

    xScale = d3.scaleLinear()
      .domain(d3.extent(yearlyData, d => d.Year))
      .range([0, innerWidth]);

    yScaleEP = d3.scaleLinear()
      .domain([0, d3.max(yearlyData, d => d.Extreme)])
      .range([innerHeight, 0]);

    const lineGenerator = d3.line()
      .x(d => xScale(d.Year))
      .y(d => yScaleEP(d.Extreme))
      .curve(d3.curveMonotoneX);

    // draw axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    g.append("g")
      .call(d3.axisLeft(yScaleEP));

    // Labels
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", innerWidth/2)
      .attr("y", innerHeight+45)
      .text("Year");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -60)
      .attr("x", -innerHeight/2)
      .attr("transform", "rotate(-90)")
      .text("Spatially-Averaged Extreme Precipitation (in)");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -30)
      .attr("x", innerWidth/2)
      .text("Average Yearly Extreme Precipitation and Changepoint Analysis (1901-2024)")
      .style("font-weight", "bold");
  
    // avg line
    const line = g.append("line")
      .attr("class", "avg-line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScaleEP(3.26))
      .attr("y2", yScaleEP(3.26))
      .attr("stroke", "#333")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");

    g.append("text")
      .attr("class", "divider-line-label")
      .attr("x", innerWidth - 25)
      .attr("y", yScaleEP(3.35) + 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#333")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text("Avg: 3.26")
      .style("opacity", 0)
      .transition()
      .delay(800)
      .style("opacity", 1);

    // main path -> animate
    const path = g.append("path")
      .datum(yearlyData)
      .attr("fill", "none")
      .attr("stroke", "#4287f5")
      .attr("stroke-width", 2.5)
      .attr("d", lineGenerator);

    const totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);
  }
  
  function step02() {
    if (!movingData || !width || !height) return;
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const movingLine = d3.line()
      .x(d => xScale(d.Year))
      .y(d => yScaleEP(d.Extreme))
      .curve(d3.curveBasis);

    g.append("path")
      .datum(movingData)
      .attr("class", "moving-line-path")
      .attr("fill", "none")
      .attr("stroke", "#000000")
      .attr("stroke-width", 1)
      .attr("d", movingLine)
      .style("opacity", 0)
      .transition().duration(1000).style("opacity", 1);

    g.selectAll(".sig-dot")
      .data(movingData)
      .enter().append("circle")
      .attr("class", "sig-dot")
      .attr("cx", d => xScale(d.Year))
      .attr("cy", d => yScaleEP(d.Extreme))
      .attr("r", 3.5)
      .attr("fill", d => d.sig === 1 ? "#d62728" : "#b8b8b8")
      .attr("opacity", 0)
      .transition()
      .delay((d, i) => i * 15)
      .attr("opacity", 1);
  }

  function step03() {
    if (!yearlyData) return;
    const innerHeight = height - margin.top - margin.bottom;

    // vertical line
    const line = g.append("line")
      .attr("class", "divider-line")
      .attr("x1", xScale(1991.5))
      .attr("x2", xScale(1991.5))
      .attr("y1", innerHeight)
      .attr("y2", innerHeight) 
      .attr("stroke", "#333")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");

    line.transition()
      .duration(1000)
      .attr("y2", 0);

    g.append("text")
      .attr("class", "divider-line-label")
      .attr("x", xScale(1991.5))
      .attr("y", -8)
      .attr("text-anchor", "middle")
      .attr("fill", "#333")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text("1992")
      .style("opacity", 0)
      .transition()
      .delay(800)
      .style("opacity", 1);
  }

  function init(container, ctx) {
    root = d3.select(container).style("position", "relative");

    svg = root.append("svg")
        .attr("id", "extreme-plot-svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("overflow", "visible");

    g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    Promise.all([
        d3.csv("chapters/chapter_extreme/data/extreme_yearly.csv"),
        d3.csv("chapters/chapter_extreme/data/moving.csv")
    ]).then(([yearlyRaw, movingRaw]) => {
        yearlyData = yearlyRaw.map(d => ({ Year: +d.Year, Extreme: +d.Extreme }));
        movingData = movingRaw.map(d => ({
            Year: +d.Year,
            Extreme: +d.Extreme,
            sig: +d.sig
        }));
    }).catch(err => console.error("Chapter data failed to load:", err));
  }

  // fixed some weird issues from scrolling too quickly
  function applyStep(stepId, direction) {
    if (stepId === lastStepId) return;
    if (stepId === "c01-step-01") { step01(); } 
    else if (stepId === "c01-step-02") {
        if (lastStepId === "c01-step-03") step01();
        step02();
    } 
    else if (stepId === "c01-step-03") {
        if (lastStepId === "c01-step-01") step02();
        step03();
    }

    lastStepId = stepId;
  }

  function resize(w, h) {
    width = w;
    height = h;
    svg.attr("viewBox", `0 0 ${width} ${height}`);
  }

  return { init, resize, onStepEnter: applyStep};
}