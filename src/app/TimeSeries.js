define([
  'dojo/_base/declare',
  "dojo/_base/array",
  'dojox/charting/Chart',
  'dojox/charting/axis2d/Default',
  'dojox/charting/plot2d/Lines'],
       function(declare, array, Chart, Default, Lines) {
         'use strict'; // opt-in to strict mode
         var myfont = "normal normal normal 10pt Arial";
         return declare(null, {
           constructor: function(bufferSize) {
             // the size of the data buffer for plotting
             //   it's the same as the number of spectra (nSpectra)
             //   defined in Display.js
             this.bufferSize = bufferSize; // plot buffer size (= nSpectra)
             this.ts_data = []; // the data to plot
             this.chart = new Chart("timeseries",
                                    {title: "Time Series",
                                     titleGap: 12,
                                     titleFont: myfont,
                                     titleFontColor: "blue",
                                    });
             this.chart.addPlot("default", {stroke: {color:"red", width: 1}});
             this.chart.addAxis("x", {min: 1,
                                      max: bufferSize,
                                      minorTicks: false});
             this.chart.addAxis("y", {vertical: true, minorTicks: false});
             this.chart.addSeries("ts", []);
             this.chart.render(); // blank plot
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
               if (typeof(this.chart) === 'undefined') {
                 console.log('chart undefined');
               } else {
                 console.log('updating timeseries');
               }
               this.chart.updateSeries("ts", this.ts_data);
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
             array.forEach(spectraldata,
                           function(item, index) {
                             me.ts_data.push(item[channel]);
                           });
           },
         });
       });
