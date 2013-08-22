// This file defines a Display object, which is the main part of the
// client program.  It controls the content and position of the
// canvases.
//
define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/dom-attr',
  'dojo/query',
  'app/SpectrumPlot',  // spectrum plot below the waterfall plot
  'app/TimeSeries',    // time series plot next to waterfall plot
], function(declare, array, domAttr, query, SpectrumPlot, TimeSeries) {
  'use strict';  // opt-in to strict mode
  return declare(null, {
    constructor: function(){
      this.currentBank = null;
      this.specData = {
        A: [], // "[]" is the same as "new Array()"
        B: [],
        C: [],
        D: [],
        E: [],
        F: [],
        G: [],
        H: [],
      };
      
      this.width         = 512; // canvas width, in pixels
      this.height        = 500; // canvas height, in pixels
      this.nSpectra      = 100; // number of spectra in waterfall plot
      
      // datapoint height and width, in pixels
      this.pointHeight   = this.height / this.nSpectra;
      this.pointWidth    = undefined;  // calculated later

      // offsets from left and top of window; needed to translate
      // click events to positions on the waterfall plot
      this.horzOffset    = 150;
      this.vertOffset    = 60;
      
      this.rowCounter    = 0; // keeps track of the current row position

      this.timeseries    = new TimeSeries(this.nSpectra);
      // waterfall index of time series to display in the spectrum plot
      this.channel_index = 0;
      
      this.spectrumPlot  = new SpectrumPlot();
      // waterfall index of spectrum to display in the spectrum plot
      this.spectrum_index = 0;

      // these will switch as each canvas slides below the viewable area
      this.primaryCanvas = "#waterfall1";
      this.secondaryCanvas = "#waterfall2";
      this.colormax = null;  // for color normalization
      this.colormin = null;  // for color normalization
      this.updateID = null;  // for waterfall update interval

      // get ready for click events, etc.
      this.initListeners();

      // the tornado server port
      var port = 8889;

      // Creating/opening the web socket.
      this.ws = new WebSocket("ws://localhost:" + port + "/websocket");

      var me = this;
      // The following function handles data sent from the write_message
      // server code in websocket.py
      this.ws.onmessage = function (evt) {
        if (evt.data === 'close'){
          console.log('Closing WebSocket.');
          this.ws.close();
        } else {
          var msg = eval(evt.data);
          console.log(msg[0]);
          if ('bank_config' === msg[0]) {
            // set the radio button properties depending on what banks
            // are available
            var bank_arr = msg[1];
            array.forEach(bank_arr, function(bank, index) {
              console.log('bank', bank);
              domAttr.has('bank' + bank, 'disabled');

              console.log('enabling bank',bank);

              domAttr.remove('bank' + bank, 'disabled');
              domAttr.remove('submitBank', 'disabled');
              domAttr.set('bank' + bank + '-txt', 'style',
                          {'color': 'black', 'fontWeight': 'bold'});
            });

            me.currentBank = bank_arr[0];
            domAttr.set('bank' + me.currentBank, 'checked', 'checked');

            query('#header')[0].innerHTML = 'Bank ' + me.currentBank;

            // send msg to server with default bank to display
            // request data every 1 second
            me.updateID = setInterval( function () {
              me.ws.send(bank_arr[0]);
            }, 1000 ); // 1000 milliseconds

          } else if ('data' === msg[0]) {
            var data = msg[1];
            me.colormin = msg[2];
            me.colormax = msg[3];
            console.log('color min:',me.colormin);
            console.log('color max:',me.colormax);
            console.log('received message',data.length);
            me.pointWidth = me.width / data.length;
            me.updateDisplay(me.currentBank, data);
          } else {
            console.log('ERROR: do not understand message', msg);
          }
        }
      };
    },

    // Sets listeners and associated event handlers.
    initListeners: function() {
      var me = this;  // convention for local use of self

      // listen for Submit button click
      query('#submitBank').on('click', function(e){

        var frzVal = document.getElementById("submitFreeze").value;
        if (frzVal === "Unfreeze") {
          document.getElementById("submitFreeze").value = "Freeze";
        }

        // clear previous interval data update
        clearTimeout(me.updateID);

        me.resetDisplay();  // clear the plot display

        // get value of new bank (radio button selection)
        me.currentBank = query('#controls input:checked')[0].value;
        console.log('BANK = ', me.currentBank);
        // update the display header
        query('#header')[0].innerHTML = 'Bank ' + me.currentBank;

        // request data every 1 second for new bank
        me.updateID = setInterval( function () {
          me.ws.send(me.currentBank);
        }, 1000 ); // 1000 milliseconds
      });

      // listen for Freeze button click
      query('#submitFreeze').on('click', function(e){
        var frzVal = document.getElementById("submitFreeze").value;
        if (frzVal === "Freeze") {
          clearTimeout(me.updateID);
          document.getElementById("submitFreeze").value = "Unfreeze";
        } else {
          // request data every 1 second for new bank
          me.updateID = setInterval( function () {
            me.ws.send(me.currentBank);
          }, 1000 ); // 1000 milliseconds
          document.getElementById("submitFreeze").value = "Freeze";
        }
      });

      // Registering click event for the plot.
      // On click, get the position of the click and draw cross
      // hairs to highlight the row and column clicked.  Then update
      // the timeseries and spectral plots to show the selected row
      // and column (channel).
      query('#axis').on('click', function(e){
        console.log(e);
        var canvas = query("#axis")[0];
        var context = canvas.getContext("2d");
        me.clearCanvas("#axis");

        // draw crosshairs
        context.beginPath();
        context.moveTo(e.clientX-me.horzOffset-1, 0);
        context.lineTo(e.clientX-me.horzOffset-1, me.height);
        context.moveTo(0, e.clientY-me.vertOffset-1);
        context.lineTo(me.width, e.clientY-me.vertOffset-1);
        context.strokeStyle = 'yellow';  // make the crosshairs red
        context.stroke();
        query('#position')[0].innerHTML = "Channel " + (e.clientX-me.horzOffset) + ", Time Interval " + (e.clientY-me.vertOffset);
        me.updateNeighboringPlots(e.clientX-me.horzOffset-1, e.clientY-me.vertOffset-1);});
    },

    // call after click on plot for crosshairs
    updateNeighboringPlots: function(x, y) {

      // Convert the (x, y) position for the mouse click to the right indices.
      this.channel_index = Math.floor(x / this.pointWidth);
      this.spectrum_index = Math.floor(y / this.pointHeight);

      // Useful log for debugging
      // console.log("spactra at: " + this.spectrum_index + "[" + this.channel_index + "]");

      // If we clicked where there is data plot, tell the spectra plot to plot that
      // row.  Otherwise, we plot clear the plot.
      if (this.spectrum_index < this.specData[this.currentBank].length && this.spectrum_index >= 0) {
        // console.log('updating specplot with ',this.specData[this.currentBank][this.spectrum_index]);
        this.spectrumPlot.update(this.specData[this.currentBank][this.spectrum_index]);
      } else {
        this.spectrumPlot.update([]);
      }

      // The timeseries object keeps a running buffer of all the values plotted.
      // When a new column is selected that buffer needs to be flushed and
      // updated with all the values for the select channel.
      this.timeseries.newChannelBuffer(this.specData[this.currentBank], this.channel_index);
      // Just plotting the timeseries here.
      this.timeseries.plot(this.specData[this.currentBank][this.specData[this.currentBank].length - 1], this.channel_index);
    },

    clearCanvas: function(id){
      var canvas = query(id)[0];
      canvas.width = canvas.width;
      canvas.height = canvas.height;
    },

    drawDisplay: function(data){
      // First a few words about how the waterfall plot is done.
      // In order to avoid redrawing every rectangle each time
      // we get a new sample, I'm stacking each sample on top of
      // the previous ones and moving the canvas down.  That way
      // we only plot the latest sample (row).  We keep track of
      // how many rows we have plotted and use it to find the
      // new position for the canvas.  Now, there are actually 3
      // total canvases we draw on.  One for the axis and two
      // for the waterfall.  There are two for the waterfall so
      // we can continuiously plot the data.  When the primary
      // canvas fills up, we swap it with the secondary one.
      var canvas = query(this.primaryCanvas)[0];
      var canvas2 = query(this.secondaryCanvas)[0];
      var context = canvas.getContext("2d");

      // Calculate the height and width of each point in the
      // waterfall plot.  The height is based off the number of
      // channels and how much room we have horizontally.  The
      // width is based on a height scaling factor and how much
      // room we have vertically.
      this.pointWidth  = this.width / data.length;

      // Given the number of rows we have plotted, what should the position be?
      this.rowCounter += 1;
      var top_pos = -Math.round(this.height-this.vertOffset-(this.pointHeight* this.rowCounter));

      // Set the canvases top position accordingly.
      canvas.style.top = top_pos + "px";
      canvas2.style.top = Math.round(top_pos+this.height) + "px";

      // Draw the new spectrum as rectangles
      for(var chan = 0; chan < data.length; chan++){
        context.fillStyle = this.getFillColor(data[chan]);
        context.fillRect(this.pointWidth * chan,
                         this.height - (this.pointHeight * this.rowCounter),
                         this.pointWidth, this.pointHeight);
      }

      // Clip the bottom of the secondary canvas
      var context2 = canvas2.getContext("2d");
      var clipPos = Math.round(canvas2.height - (this.pointHeight * this.rowCounter));
      context2.clearRect(0, clipPos, this.width, (this.pointHeight * this.rowCounter));

      // Update the spectra and timeseries plots with the new data we just got.
      if (this.spectrum_index < this.specData[this.currentBank].length) {
        this.spectrumPlot.update(this.specData[this.currentBank][this.spectrum_index]);
      }
      // The timeseries object keeps a running buffer of all the values plotted.
      // When a new column is selected that buffer needs to be flushed and
      // updated with all the values for the select channel.
      this.timeseries.newChannelBuffer(this.specData[this.currentBank], this.channel_index);
      this.timeseries.plot(data, this.channel_index);
    },

    getFillColor: function(value){
      var colorIdx =  Math.floor(((value-this.colormin)/(this.colormax-this.colormin))*255);
      return 'rgb('+colorIdx+',0,0)';
    },

    addData: function(bank, data){
      // If we have reached the max amount of data to keep in
      // the buffer, pop off the end.
      if (this.specData[this.currentBank].length >= this.nSpectra){
        this.specData[this.currentBank].pop();
      }

      // If we have plotted the max amount of data, swap the
      // canvases and reset the count.
      if (this.rowCounter === this.nSpectra) {

        // Also, if we've been plotting on the second cavnas,
        // clear the secondary before the swap.
        if (this.primaryCanvas === '#waterfall2'){
          this.clearCanvas(this.secondaryCanvas);
        }
        var temp = this.primaryCanvas;
        this.primaryCanvas = this.secondaryCanvas;
        this.secondaryCanvas = temp;
        this.rowCounter = 0;
      }

      // Finally, insert the new data to the beginning of the
      // buffer.
      this.specData[this.currentBank].unshift(data);
    },

    updateDisplay: function(bank, data){
      // Utility method for tying everything together when
      // updating the display.  This method is called when we
      // get a new WS message from the server.
      this.addData(bank, data);
      this.drawDisplay(data);
    },

    // when we want to switch to displaying a different bank we
    // need to clear the plot and axes
    resetDisplay: function() {

      // clear each of the two plot canvases
      this.clearCanvas(this.primaryCanvas);
      this.clearCanvas(this.secondaryCanvas);

      // get each of the two plot canvases
      var canvas = query(this.primaryCanvas)[0];
      var canvas2 = query(this.secondaryCanvas)[0];

      // reset the canvas top positions
      canvas.style.top = "-500px";
      canvas2.style.top = "50px";

      this.timeseries.empty();
      delete this.specData[this.currentBank];
      this.specData[this.currentBank] = []; // a buffer of all data
      this.timeseries.plot(this.specData[this.currentBank], 0);
    },
  });
});

