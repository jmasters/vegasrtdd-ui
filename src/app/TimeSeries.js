define([
    'dojo/_base/declare',
    'dojo/query',
    'dojox/charting/Chart',
    'dojox/charting/themes/Claro',
], function(declare, query, Chart, theme) {
    return declare(null, {
        constructor: function(bufferSize) {
            // the size of the data buffer for plotting
            //   it's the same as the number of spectra (nSpectra)
            //   defined in Display.js
            this.bufferSize = bufferSize; // plot buffer size (= nSpectra)
            this.ts_data = []; // the data to plot
            var me = this;
            require(['dojox/charting/axis2d/Default',
                     'dojox/charting/plot2d/Lines',
                    ], function(Default, Lines) {
                        me.chart = new Chart("timeseries");
                        me.chart.addPlot("default", {type: Lines});
                        me.chart.addAxis("x", {min: 1, max: bufferSize});
                        me.chart.addAxis("y", {vertical: true, min: 5, max: 10});
                        me.chart.addSeries("y", [], {stroke: {color:"blue"}});
                        me.chart.render();
                    });
        },

        plot: function(data, channel) {
            // Check to make sure that there is data in the selected channel
            if (data[channel]) {
                // Insert data to the beginning of the buffer and honor
                // the maximum buffer size.
                if (this.ts_data.length >= this.bufferSize) {
                    this.ts_data.pop();
                    this.ts_data.unshift(data[channel]);
                }

//                 console.log('time series data',this.ts_data);
                this.chart.updateSeries("y", this.ts_data);
                this.chart.render();
            }
        },

        empty: function() {
            this.ts_data = [];
        },

        newChannelBuffer: function(spectraldata, channel) {
            // Flush buffer first.
            this.empty();

            // If the select channel is out of range (i.e. the user
            // clicked outside of the waterfall plot), plot the empty
            // buffer.
//             if (channel > spectraldata[0].length || channel < 0) {
//                 this.chart.updateSeries("y", this.ts_data);
//                 this.chart.render();
//                 return;
//             }

            // Scan the given spectral data (which is the buffer from
            // Display) and add the data from the selected channel to
            // our internal buffer.
            var me = this;
            require(["dojo/_base/array",
            ], function(array) {
                array.forEach(spectraldata, function(item, index) {
                    me.ts_data.push(item[channel]);
                });
            });
        },
        
    });
});
