define([
  'dojo/_base/declare',
  'dojox/charting/Chart'
], function(declare, Chart) {
  var myfont = new String("normal normal normal 10pt Arial");
  return declare(null, {
    constructor: function() {
      // Setting up an empty chart.
      this.chart = new Chart("spectra",
                             {title: "Spectrum",
                              titleGap: 12,
                              titleFontColor: "blue",
                              titleFont: myfont,
                             });
      this.chart.addPlot("default", {stroke: {color:"red", width: 1}});
      this.chart.addAxis("x", {includeZero: true, 
                               title: "channel", 
                               titleFont: myfont,
                               titleOrientation: "away" });
      this.chart.addAxis("y", {vertical: true, 
                               minorTicks: false});
      this.chart.addSeries("spectra", []);
      this.chart.render(); // blank plot
    },

    update: function(data) {
      // Nothing to special here, if we have data plot it!
      if (data) {
        this.chart.updateSeries("spectra", data);
        this.chart.render();
      }
    },
  });
});
