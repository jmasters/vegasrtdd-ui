define([
    'dojo/_base/declare',
    'dojox/charting/Chart',
    'dojox/charting/themes/Claro',
    'dojox/charting/axis2d/Default',
    'dojox/charting/plot2d/Lines',
    'dojo/ready'],
    function(declare, Chart, theme, Default, Lines, ready) {
    return declare(null, {
        constructor: function(bufferSize) {
            // the size of the data buffer for plotting
            //   it's the same as the number of spectra (nSpectra)
            //   defined in Display.js
            this.bufferSize = bufferSize; // plot buffer size (= nSpectra)
            this.ts_data = []; // the data to plot
            this.chart = new Chart("timeseries");
            this.chart.addPlot("default", {type: Lines});
            this.chart.addAxis("x", {min: 1, max: bufferSize, minorTicks: false});
            this.chart.addAxis("y", {vertical: true, minorTicks: false});
            this.chart.addSeries("y", [], {stroke: {color:"red", width:1}});
            this.chart.render();
            console.log('constructed a timeseries', typeof(this.chart));
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

                // console.log('time series data',this.ts_data);
                if (typeof(this.chart) == 'undefined') {
                    console.log('chart undefined');
                } else {
                    console.log('updating timeseries');
                }
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
