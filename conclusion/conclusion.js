import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createEnd() {
    function init(container) {
      const root = d3.select(container);
  
      const stepWrapper = root.append("div")
        .attr("class", "step final-step");
  
      const card = stepWrapper.append("div")
        .attr("class", "step-card final-statement");
  
      card.append("p")
        .html(`The high-water marks of the past are the baselines of our future. When our maps no longer reflect the reality at our doorsteps, the cost is measured in more than just inches. It is measured in homes, communities, and the lives we build within them.`);

      const footer = root.append("footer")
        .attr("class", "data-sources");
  
      footer.append("p").text("Data: Massachusetts Climate Assessment & NOAA | Built with D3.js");
      footer.append("a")
        .attr("href", "https://github.com/isabelpt/MassClimate")
        .attr("target", "_blank")
        .text("View Methodology");
    }
  
    return { init };
  }