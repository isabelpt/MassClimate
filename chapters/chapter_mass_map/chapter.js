import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson@3/+esm";
import L from "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm";

export function createChapter() {
  let root, mapDiv, mapInstance, legendContainer;
  let basinTopoData = null; 
  let townTopoData = null; 
  let basinLayer = null;
  let townFloodLayer = null;

  let activeVariable = "Total precipitation"; 
  let activeIndex = 0;
  const periods = ["Baseline", "2030s", "2050s", "2070s", "2090s"];

  const scales = {
    "Total precipitation": {
      base: d3.scaleSequential([40, 50], d3.interpolateBlues),
      pct: d3.scaleSequential([0, 20], d3.interpolateReds)
    },
    "Days above 2 inches": {
      base: d3.scaleSequential([0, 2], d3.interpolateBlues),
      pct: d3.scaleSequential([0, 5], d3.interpolateReds)
    },
    "Days above 4 inches": {
      base: d3.scaleSequential([0, 0.15], d3.interpolateBlues),
      pct: d3.scaleSequential([0, 5], d3.interpolateReds)
    },
    "99th percentile precipitation": {
      base: d3.scaleSequential([0, 2], d3.interpolateBlues),
      pct: d3.scaleSequential([0, 20], d3.interpolateReds)
    }
  };

  function loadAllData() {
    return Promise.all([
      d3.json("chapters/chapter_mass_map/data/mass_basins.json"),
      d3.json("chapters/chapter_mass_map/data/100-year.json")
    ]).then(([basinData, townData]) => {
      basinTopoData = basinData;
      townTopoData = townData;
    });
  }

  function initMap() {
    const initialCenter = [42.0, -71.5]; 
    mapInstance = L.map(mapDiv.node(), {
      // Disable all zooming panning etc
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      zoomControl: false,
      touchZoom: false,
      dragging: false,
      tap: false,
      keyboard: false,
      attributionControl: false,
      zoomSnap: 0.1,    
      zoomDelta: 0.1 // smaller for more precision
    }).setView(initialCenter, 8.45); 

    // replace ne map with the one with no label version
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstance);

    setTimeout(() => mapInstance.invalidateSize(), 10);
    loadAllData();
  }  

  // Update legend
  function updateLegend(title, scale, unit = "") {
    if (!legendContainer) return;
    const domain = scale.domain();
    const min = domain[0];
    const max = domain[domain.length - 1];
    const colors = [0, 0.25, 0.5, 0.75, 1].map(t => scale(min + (max - min) * t));
    const gradientStr = `linear-gradient(to right, ${colors.join(', ')})`;

    legendContainer
      .style("display", "block")
      .html(`
        <strong style="display: block; margin-bottom: 8px; font-size: 13px; color: #333;">${title}</strong>
        <div style="background: ${gradientStr}; height: 12px; width: 100%; border-radius: 2px; margin-bottom: 4px; border: 1px solid #ddd;"></div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666;">
          <span>${min}${unit}</span>
          <span>${((min + max) / 2).toFixed(1)}${unit}</span>
          <span>${max}${unit}</span>
        </div>
      `);
  }

  function updateMapStyles() {
    if (!basinLayer) return;
    const selectedPeriod = periods[activeIndex];
    const isBaseline = activeIndex === 0;
    const propName = `${activeVariable}_${selectedPeriod}`;
    const currentScales = scales[activeVariable];
    const activeScale = isBaseline ? currentScales.base : currentScales.pct;
    const unit = isBaseline ? " in" : "%";

    basinLayer.eachLayer(layer => {
      const val = layer.feature.properties[propName];
      layer.setStyle({
        fillColor: (val !== undefined && val !== null) ? activeScale(val) : "#dfe6e9",
        fillOpacity: 0.8
      });
      layer.setTooltipContent(`<strong>${layer.feature.properties.NAME}</strong><br/>${val ? val.toFixed(2) : 'N/A'}${unit}`);
    });

    d3.select("#slider-label").text(`Time Period: ${selectedPeriod}`);
    
    d3.selectAll(".var-toggle-btn")
      .style("background", d => d.id === activeVariable ? "#3498db" : "#f8f8f8")
      .style("color", d => d.id === activeVariable ? "white" : "black");

    updateLegend(`${activeVariable} (${selectedPeriod})`, activeScale, unit);
  }
  
  function step01() {
    if (townFloodLayer) { mapInstance.removeLayer(townFloodLayer); townFloodLayer = null; }
    
    d3.select(".map-slider-controls").style("display", "block");
    d3.select(".flood-toggle-container").style("display", "none");

    if (!basinLayer && basinTopoData) {
      const mainKey = Object.keys(basinTopoData.objects)[0];
      const geojson = topojson.feature(basinTopoData, basinTopoData.objects[mainKey]);
      basinLayer = L.geoJSON(geojson, {
        style: { weight: 1, color: 'white', fillOpacity: 0.8 },
        onEachFeature: (f, l) => { l.bindTooltip("", { sticky: true }); }
      }).addTo(mapInstance);
    }

    mapInstance.invalidateSize();
    if (basinLayer) updateMapStyles();
  }

  function step02() {
    if (basinLayer) { mapInstance.removeLayer(basinLayer); basinLayer = null; }
    
    d3.select(".map-slider-controls").style("display", "none");
    d3.select(".flood-toggle-container").style("display", "block");

    if (!townTopoData) return;

    if (d3.select(".flood-toggle-container").empty()) {
        const floodControls = root.append("div")
            .attr("class", "flood-toggle-container")
            .style("position", "absolute").style("bottom", "40px").style("left", "50%")
            .style("transform", "translateX(-50%)").style("z-index", "1001")
            .style("background", "white").style("padding", "10px").style("border-radius", "8px")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.2)");

        const floodVars = [{ id: "f100yrfld", label: "100-Year" }, { id: "f500yrfld", label: "500-Year" }];

        floodControls.selectAll("button")
            .data(floodVars).enter().append("button")
            .attr("class", "flood-toggle-btn")
            .text(d => d.label)
            .style("padding", "8px 12px").style("cursor", "pointer").style("margin", "0 5px")
            .style("border", "none").style("border-radius", "4px")
            .on("click", (e, d) => updateFloodMap(d.id));
    }

    const updateFloodMap = (propId) => {
        if (townFloodLayer) mapInstance.removeLayer(townFloodLayer);
        const floodScale = d3.scaleSequential([0, 52], d3.interpolateReds);
        const geojson = topojson.feature(townTopoData, townTopoData.objects['100-year']);

        townFloodLayer = L.geoJSON(geojson, {
            style: (f) => ({
                fillColor: f.properties[propId] > 0 ? floodScale(f.properties[propId]) : "#f0f0f0",
                fillOpacity: 0.8, weight: 0.5, color: 'white'
            }),
            onEachFeature: (f, l) => {
                l.bindTooltip(`<strong>${f.properties.town}</strong>: ${f.properties[propId].toFixed(1)}%`, { sticky: true });
            }
        }).addTo(mapInstance);

        updateLegend(propId === "f100yrfld" ? "100-Year Flood Risk" : "500-Year Flood Risk", floodScale, "%");
        
        d3.selectAll(".flood-toggle-btn")
          .style("background", d => d.id === propId ? "#e74c3c" : "#eee")
          .style("color", d => d.id === propId ? "white" : "black");
    };

    updateFloodMap("f100yrfld");
  }

  function applyStep(stepId) {
    if (stepId === "c04-step-01") return step01();
    if (stepId === "c04-step-02") return step02();
  }

  function init(container, ctx) {
    root = d3.select(container);
    mapDiv = root.append("div").attr("id", "map-basin-container").style("width", "100%").style("height", "100%");

    legendContainer = root.append("div")
      .attr("class", "shared-map-legend")
      .style("position", "absolute").style("bottom", "30px").style("right", "30px").style("z-index", "2000")
      .style("background", "white").style("padding", "12px").style("border-radius", "8px").style("width", "200px")
      .style("box-shadow", "0 2px 10px rgba(0,0,0,0.15)").style("display", "none"); 

    initMap();

    const controls = root.append("div")
      .attr("class", "map-slider-controls")
      .style("position", "absolute").style("bottom", "30px").style("left", "50%")
      .style("transform", "translateX(-50%)").style("z-index", "1000")
      .style("background", "rgba(255,255,255,0.9)").style("padding", "15px")
      .style("border-radius", "8px").style("display", "none"); 

    controls.append("label").attr("id", "slider-label").style("display", "block").style("font-weight", "bold").text("Time Period: Baseline");

    const slider = controls.append("input").attr("type", "range").attr("min", 0).attr("max", 4).attr("step", 1).attr("value", 0).style("width", "350px");

    const toggle = controls.append("div").style("display", "flex").style("gap", "5px").style("margin-bottom", "10px");
    const vars = [
      { id: "Total precipitation", label: "Precip" },
      { id: "99th percentile precipitation", label: "Extreme Precip"},
      { id: "Days above 2 inches", label: "Heavy Rain" },
      { id: "Days above 4 inches", label: "Extreme Rain"}
    ];

    toggle.selectAll("button")
      .data(vars).enter().append("button")
      .attr("class", "var-toggle-btn") 
      .text(d => d.label)
      .style("flex", "1").style("padding", "5px").style("cursor", "pointer")
      .style("border", "1px solid #ccc").style("border-radius", "4px")
      .on("click", function(e, d) {
        activeVariable = d.id;
        updateMapStyles();
      });

    slider.on("input", function() { activeIndex = +this.value; updateMapStyles(); });
  }

  function resize(w, h) {
    if (mapInstance) mapInstance.invalidateSize();
  }

  return { init, resize, onStepEnter: applyStep };
}