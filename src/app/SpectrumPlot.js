define([
    'dojo/_base/declare',
    'dojox/charting/Chart',
    'dojox/charting/themes/Claro',
    'dojox/charting/plot2d/Pie',
], function(declare, Chart, theme, PiePlot) {
    return declare(null, {
        constructor: function() {
            // Setting up an empty chart.
            var me = this;
            require(["dojox/charting/axis2d/Default",
                     "dojox/charting/plot2d/Lines",
                     ], function(Default, Lines){
                         me.chart = new Chart("spectra");
                         me.chart.addPlot("default", {type: Lines});
                         me.chart.addAxis("x");
                         me.chart.addAxis("y", {vertical: true, minorTicks: false});
                         me.chart.addSeries("spectra", [], {stroke: {color:"red"}});
                         me.chart.render();
                     });
        },

        update: function(data) {
            // Nothing to special here, if we have data plot it!
            if (data) {
                var me = this;
                require(["dojox/charting/axis2d/Default",
                         "dojox/charting/plot2d/Lines"
                        ], function(Default, Lines){
                            me.chart.updateSeries("spectra", data);
                            me.chart.render();
                });
            }
        }
    });
});
