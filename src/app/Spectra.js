define([
    'dojo/_base/declare',
    'dojo/query',
    'dojox/charting/Chart',
    'dojox/charting/themes/Claro',
    'dojox/charting/plot2d/Pie',
], function(declare, query, Chart, theme, PiePlot) {
    return declare(null, {
        constructor: function() {
            var me = this;
            require(["dojox/charting/axis2d/Default",
                     "dojox/charting/plot2d/Lines",
                     ], function(Default, Lines){
                         me.chart = new Chart("spectra");
                         me.chart.addPlot("default", {type: Lines});
                         me.chart.addAxis("x");
                         me.chart.addAxis("y", {vertical: true});
                         me.chart.addSeries("spectra", []);
                         me.chart.render();
                     });
        },

        plot: function(data) {
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
