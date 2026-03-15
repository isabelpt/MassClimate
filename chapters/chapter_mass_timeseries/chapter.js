import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createChapter() {
  let root, svg, g, hopsLayer; 
  let width = 900, height = 800;
  let currentStepId = null;
  let timeseriesData = null;
  const margin = { top: 150, right: 100, bottom: 100, left: 100};
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  let step02Drawn = false;
  let tooltip;

  // Scales
  const xScale = d3.scaleLinear()
  .domain([1970, 2090])
  .range([0, innerWidth]);

  const yScale = d3.scaleLinear()
    .domain([40, 65])
    .range([innerHeight, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(["SSP2-4.5", "SSP3-7.0", "SSP5-8.5", "Baseline"])
    .range(["#3498db", "#2ecc71", "#e74c3c", "#8a8a8a"]);


  function step01() {
    if (!timeseriesData || !width || !height) return;
    step02Drawn = false;
    g.selectAll("*").remove();

    g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
    .attr("font-family", "sans-serif");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .attr("font-family", "sans-serif");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", innerWidth/2)
      .attr("y", innerHeight+45)
      .text("Year");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -30)
      .attr("x", -innerHeight/2)
      .attr("transform", "rotate(-90)")
      .text("Total precipitation (in)");

      // Chart Title
      g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -30)
      .attr("x", innerWidth/2)
      .text("Massachusetts Projected Future Total Precipitation")
      .style("font-weight", "bold");
  }

  function step02() {
    if (!timeseriesData || !width || !height) return;
    if (step02Drawn) return;

    if (g.select(".hops-layer").empty()) {
      hopsLayer = g.append("g").attr("class", "hops-layer");
    } else {
      hopsLayer = g.select(".hops-layer");
    }
  
    const periodOrder = { "Baseline": 0, "2030s": 1, "2050s": 2, "2070s": 3, "2090s": 4 };
    const baselineData = timeseriesData.filter(d => d.Scenario === "Baseline");
    const futureData = timeseriesData.filter(d => d.Scenario !== "Baseline");
  
    // Baseline
    if (baselineData.length > 0) {
      const bMedian = baselineData.find(d => d.Value === "Median");
      const bLower = baselineData.find(d => d.Value === "10th percentile");
      const bUpper = baselineData.find(d => d.Value === "90th percentile");
  
      g.append("path")
        .attr("fill", colorScale("Baseline"))
        .attr("opacity", 0.35)
        .attr("d", `
          M ${xScale(1971)},${yScale(+bUpper.Precipitation)}
          L ${xScale(2001)},${yScale(+bUpper.Precipitation)}
          L ${xScale(2001)},${yScale(+bLower.Precipitation)}
          L ${xScale(1971)},${yScale(+bLower.Precipitation)}
          Z
        `);
  
      g.append("line")
        .attr("x1", xScale(1971)).attr("x2", xScale(2001))
        .attr("y1", yScale(+bMedian.Precipitation)).attr("y2", yScale(+bMedian.Precipitation))
        .attr("stroke", colorScale("Baseline"))
        .attr("stroke-width", 2.5)
        .attr("opacity", 0.8);
    }
  
    // no-data gap area
    const gapGroup = g.append("g").attr("class", "data-gap");
    
    gapGroup.append("rect")
      .attr("x", xScale(2001))
      .attr("y", 0)
      .attr("width", xScale(2015) - xScale(2001))
      .attr("height", innerHeight)
      .attr("fill", "#f7f7f7") 
      .attr("opacity", 0.8);
  
    gapGroup.append("line")
      .attr("x1", xScale(2001)).attr("x2", xScale(2001))
      .attr("y1", 0).attr("y2", innerHeight)
      .attr("stroke", "#ddd").attr("stroke-dasharray", "4,4");
  
    gapGroup.append("line")
      .attr("x1", xScale(2015)).attr("x2", xScale(2015))
      .attr("y1", 0).attr("y2", innerHeight)
      .attr("stroke", "#ddd").attr("stroke-dasharray", "4,4");
  
    gapGroup.append("text")
      .attr("x", xScale(2008))
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#bbb")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .style("pointer-events", "none")
      .text("NO DATA");
  
    // Draw scenarios
    const scenarios = d3.group(futureData, d => d.Scenario);
    let animationDelay = 800;
    let hopInterval; 
    let stopTimeout; 
  
    scenarios.forEach((data, scenarioName) => {
      const medianRows = data.filter(d => d.Value === "Median")
        .sort((a, b) => periodOrder[a.Year] - periodOrder[b.Year]);
      const getX = (d, i) => (i === 0) ? xScale(+d.xstart) : xScale((+d.xstart + +d.xend) / 2);
  
      const areaGenerator = d3.area()
        .x((d, i) => getX(d, i))
        .y0(d => yScale(+d.ymin))
        .y1(d => yScale(+d.ymax))
        .curve(d3.curveMonotoneX);
  
      const lineGenerator = d3.line()
        .x((d, i) => getX(d, i))
        .y(d => yScale(+d.Precipitation))
        .curve(d3.curveMonotoneX);
  
      const hopGenerator = d3.line()
        .x((d, i) => getX(d, i))
        .y(d => yScale(d.yVal))
        .curve(d3.curveMonotoneX);
  
      // Main Uncertainty Ribbon
      const ribbon = g.append("path")
        .datum(medianRows)
        .attr("class", `ribbon ribbon-${scenarioName}`)
        .attr("fill", colorScale(scenarioName))
        .attr("opacity", 0)
        .attr("d", areaGenerator);
  
      ribbon.transition().delay(animationDelay).duration(800).attr("opacity", 0.3);
  
      // Median Trend Line
      const centerline = g.append("path")
        .datum(medianRows)
        .attr("class", "ribbon-mean")
        .attr("fill", "none")
        .attr("stroke", colorScale(scenarioName))
        .attr("stroke-width", 2.5)
        .attr("opacity", 0)
        .attr("d", lineGenerator);
  
      centerline.transition().delay(animationDelay).duration(800).attr("opacity", 0.85);
  
      // Draw other paths to show the confidence interval
      function renderHopPaths() {
        hopsLayer.selectAll(".hop-path").remove();
        
        for (let i = 0; i < 15; i++) {
          const pathPercentile = Math.random();
          const pathData = medianRows.map(d => {
            const range = +d.ymax - +d.ymin;
            const jitter = (Math.random() - 0.5) * (range * 0.1);
            let rawY = +d.ymin + (pathPercentile * range) + jitter;
            const clampedY = Math.max(+d.ymin, Math.min(+d.ymax, rawY));
            
            return { ...d, yVal: clampedY };
          });
  
          hopsLayer.append("path")
            .datum(pathData)
            .attr("class", "hop-path")
            .attr("fill", "none")
            .attr("stroke", colorScale(scenarioName))
            .attr("stroke-width", 1)
            .attr("opacity", 0.45)
            .attr("d", hopGenerator);
        }
      }
  
      // On hover
      ribbon.on("mouseover", function(event) {
        g.selectAll(".ribbon").transition().duration(200).attr("opacity", 0.05);
        g.selectAll(".ribbon-mean").transition().duration(200).attr("opacity", 0.15);
        ribbon.transition().duration(200).attr("opacity", 0.45);
        centerline.transition().duration(200).attr("opacity", 1).attr("stroke-width", 4);
        pointsGroup.selectAll("circle").transition().duration(200).attr("r", 5).attr("opacity", 1);
        
        renderHopPaths();
        hopInterval = setInterval(renderHopPaths, 130);
        
        tooltip.style("visibility", "visible")
            .html(`
                <strong style="color:${colorScale(scenarioName)}">${scenarioName}</strong><br/>
                Scenario Risk Level: ${scenarioName === 'SSP5-8.5' ? 'High' : scenarioName === 'SSP3-7.0' ? 'Medium-High' : 'Moderate'}<br/>
                <small>90% Confidence Interval Shown</small>
            `);
      })
      .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, root.node());
        tooltip.style("top", (y - 15) + "px")
              .style("left", (x + 20) + "px");
      })
      .on("mouseout", function() {
        g.selectAll(".ribbon").transition().duration(200).attr("opacity", 0.3);
        g.selectAll(".ribbon-mean").transition().duration(200).attr("opacity", 0.85).attr("stroke-width", 2.5);
        pointsGroup.selectAll(".median-dot").transition().duration(200).attr("r", 3);
        
        clearInterval(hopInterval);
        clearTimeout(stopTimeout);
        hopsLayer.selectAll(".hop-path").remove();
        tooltip.style("visibility", "hidden");
      });


      const pointsGroup = g.append("g").attr("class", `points-${scenarioName}`);

      // Add Median points
      pointsGroup.selectAll(".median-dot")
        .data(medianRows)
        .enter().append("circle")
        .attr("class", "median-dot")
        .attr("cx", (d, i) => getX(d, i))
        .attr("cy", d => yScale(+d.Precipitation))
        .attr("r", 3)
        .attr("fill", colorScale(scenarioName))
        .attr("opacity", 0)
        .transition().delay(animationDelay + 200).duration(500)
        .attr("opacity", 1);
  
      animationDelay += 200;
    });
  
    // Legend
    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth + 20}, 20)`);
  
    colorScale.domain().forEach((scenario, i) => {
      const item = legend.append("g").attr("transform", `translate(0, ${i * 25})`);
      item.append("rect").attr("width", 15).attr("height", 15).attr("fill", colorScale(scenario));
      item.append("text").attr("x", 22).attr("y", 12).text(scenario).style("font-size", "12px").attr("font-family", "sans-serif");
    });

    step02Drawn = true;
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

    tooltip = root.append("div")
        .attr("class", "chart-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(255, 255, 255, 0.95)")
        .style("padding", "10px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1002")
        .style("box-shadow", "0 4px 10px rgba(0,0,0,0.1)");    

    Promise.all([
        d3.csv("chapters/chapter_mass_timeseries/data/timeseries.csv")
    ]).then(([timeseriesRaw]) => {
        timeseriesData = timeseriesRaw.map(d => ({
          Category: d.Category,
          Value: d.Value,
          Scenario: d.Scenario,
          Year: d.Year,
          Precipitation: +d.Precipitation,
          xstart: +d.xstart,
          xend: +d.xend,
          ymin: +d.ymin,
          ymax: +d.ymax
        }));

        if (currentStepId) {
            applyStep(currentStepId);
        }

        console.log(timeseriesData);
    }).catch(err => console.error("Chapter data failed to load:", err));
}

  function applyStep(stepId) {
    currentStepId = stepId;
    if (!timeseriesData) return;

    if (stepId === "c03-step-01") step01();
    if (stepId === "c03-step-02") step02();
  }

  function resize(w, h) {
    width = w;
    height = h;
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    if (timeseriesData) step01();
}

  return { init, resize, onStepEnter: applyStep};
}