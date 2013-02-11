define([
    'dojo/_base/declare',
    'dojo/query',
    'dojox/charting/Chart',
    'dojox/charting/themes/Claro',
    'dojox/charting/plot2d/Pie',
], function(declare, query, Chart, theme, PiePlot) {
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
                         me.chart.addAxis("y", {vertical: true});
                         me.chart.addSeries("spectra", [], {stroke: {color:"blue"}});
                         me.chart.render();
                     });
        },

        plot: function(data) {
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
