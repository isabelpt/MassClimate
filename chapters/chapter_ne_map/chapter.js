import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson@3/+esm";
import L from "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm";

export function createChapter() {
  let root, mapDiv, mapInstance; 
  let width = 900, height = 560;
  let currentStepId = null;
  let statesData = null;
  let stationData = null; 
  let stationLayer = null; 
  let highlightLayer = null;
  const colorScale = d3.scaleSequential(d3.interpolateBlues) 
  .domain([1.45, 2.80]);
  const colorScale2 = d3.scaleDiverging()
    .domain([-25, 0, 125]) // [min, 0, max]
    .interpolator(d3.interpolateBrBG);
  let legend = null;

  function initMap() {
    mapInstance = L.map(mapDiv.node(), {
      scrollWheelZoom: false,
      tap: true
    }).setView([42.5, -73], 6);


    // Changed map but it lags a lot
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	    subdomains: 'abcd',
	    maxZoom: 20
    }).addTo(mapInstance);

    // Load TopoJSON
    d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then(us => {
      statesData = topojson.feature(us, us.objects.states).features;
      const northeastFIPS = new Set(['09', '23', '25', '33', '34', '36', '42', '44', '50', '10', '11', '54', '24']);
      
      L.geoJSON(statesData, {
        style: { color: '#ccc', weight: 1, fillOpacity: 0 }
      }).addTo(mapInstance);

      const neFeatures = statesData.filter(d => northeastFIPS.has(d.id));
      L.geoJSON(neFeatures, {
        style: { color: '#39435c', weight: 1, fillOpacity: 0 }
      }).addTo(mapInstance);
    });

    // Load and parse CSV
    d3.csv('chapters/chapter_ne_map/data/station.csv').then(data => {
      stationData = data.map(d => {
        const coords = d.geometry.replace('c(', '').replace(')', '').split(',');
        return {
          lon: +coords[0],
          lat: +coords[1],
          cutoffs: +d.cutoffs,
          pct_chg: +d.pct_chg
        };
      });
    });
  }  
  
  function step01() {
    if (!mapInstance) {
      initMap();
    }
    // Cleanup other steps
    if (stationLayer) mapInstance.removeLayer(stationLayer);
    if (highlightLayer) mapInstance.removeLayer(highlightLayer);

    if (legend) {
      mapInstance.removeControl(legend);
      legend = null;
    }

    mapInstance.flyTo([42.5, -73], 6, { duration: 1.5 });
}

function step02() {
  if (!mapInstance) step01();
  if (highlightLayer) mapInstance.removeLayer(highlightLayer);
  if (stationLayer) mapInstance.removeLayer(stationLayer);

  if (!stationData) {
    setTimeout(step02, 100);
    return;
  }

  //if (!stationLayer) {
    stationLayer = L.layerGroup();
    stationData.forEach(d => {
      L.circleMarker([d.lat, d.lon], {
        radius: 5,
        // Use the color scale here
        fillColor: colorScale(d.cutoffs), 
        color: "#333", // Dark border for contrast
        weight: 0.2,
        opacity: 1,
        fillOpacity: 0.75
      })
      .bindTooltip(`Station Value: ${d.cutoffs.toFixed(2)} in`)
      .addTo(stationLayer);
    });
  //}

  updateLegend("Cutoff Values (in)", colorScale, 1.45, 2.80);
  mapInstance.flyTo([42.5, -73], 6, { duration: 1.5 });

  stationLayer.addTo(mapInstance);

  // TODO: make a legend
}

function step03() {
  if (!mapInstance) step01();
  if (stationLayer) mapInstance.removeLayer(stationLayer);

  if (!stationData) {
    setTimeout(step02, 100);
    return;
  }

  //if (!stationLayer) {
    stationLayer = L.layerGroup();
    stationData.forEach(d => {
      L.circleMarker([d.lat, d.lon], {
        radius: 5,
        // Use the color scale here
        fillColor: colorScale2(d.pct_chg), 
        color: "#333", // Dark border for contrast
        weight: 0.2,
        opacity: 1,
        fillOpacity: 0.75
      })
      .bindTooltip(`Station Value: ${d.pct_chg.toFixed(2)}%`)
      .addTo(stationLayer);
    });
  //}
  mapInstance.flyTo([42.5, -73], 6, { duration: 1.5 });

  stationLayer.addTo(mapInstance);

  updateLegend("Percent Change (%)", colorScale2, -25, 125);
}

function step04() {
  if (!mapInstance) step01();
  if (highlightLayer) mapInstance.removeLayer(highlightLayer);
  if (stationLayer) mapInstance.removeLayer(stationLayer);
  if (legend) mapInstance.removeLayer(legend); // fix this

  mapInstance.flyTo([42.3601, -71.5], 8.45, { duration: 1.5 });

}

// Make and reset legend
// https://www.visualcinnamon.com/2016/05/smooth-color-legend-d3-svg-gradient/
function updateLegend(title, scale, min, max) {
  if (!legend) {
    legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      return L.DomUtil.create('div', 'info legend');
    };
    legend.addTo(mapInstance);
  }

  const div = legend.getContainer();
  
  // Style the container
  div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  div.style.padding = '10px';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  div.style.width = '150px';

  // Create the CSS gradient string
  const colors = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const val = min + (max - min) * t;
    return scale(val);
  });

  const gradientStr = `linear-gradient(to right, ${colors.join(', ')})`;

  div.innerHTML = `
    <strong style="display: block; margin-bottom: 8px;">${title}</strong>
    <div style="
      background: ${gradientStr};
      height: 15px;
      width: 100%;
      border-radius: 2px;
      margin-bottom: 4px;
    "></div>
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #444;">
      <span>${min}</span>
      <span>${(min + max) / 2}</span>
      <span>${max}</span>
    </div>
  `;
}

  function resize(w, h) {
    width = w ?? width;
    height = h ?? height;

    // FIX: Update the map size during window resizing
    if (mapInstance) {
      mapInstance.invalidateSize();
    }
  }

  function applyStep(stepId) {
    currentStepId = stepId;

    // You can match on exact ids from your manifest:
    // c02-step-01 ... c02-step-04
    // To add a new step, you must add it to the manifest, add it here, and then make the function
    if (stepId === "c02-step-01") return step01();
    if (stepId === "c02-step-02") return step02();
    if (stepId === "c02-step-03") return step03();
  }
  // --- Required chapter API ---
  function init(container, ctx) {
    root = d3.select(container);

    mapDiv = root.append("div")
      .attr("id", "map-ne")
      .style("width", "100%")
      .style("height", "100%");
    
    const svg = root.append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("position", "absolute")
      .style("top", 0)
      .style("left", 0)
      .style("pointer-events", "none") 
      .style("z-index", 1);
  }


  return { init, resize, onStepEnter: applyStep };
}