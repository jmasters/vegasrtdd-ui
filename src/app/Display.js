define([
    'dojo/_base/declare',
    'dojo/query',
    'app/Spectra',
    'app/TimeSeries',
], function(declare, query, Spectra, TimeSeries) {
    return declare(null, {
        constructor: function(){
            this.spectra       = new Spectra(),
            this.spectralData  = new Array(),
            this.spectra_index = 0,
            this.channel_index = 0,
            this.width         = 800,
            this.height        = 600,
            this.vertMargin    = 50,
            this.hortMargin    = 50,
            this.heightScale   = .005,
            this.rowCounter    = 0,
            this.bufferSize    = Math.floor(1 / this.heightScale),
            this.timeseries    = new TimeSeries(this.bufferSize);
            this.primaryCanvas = "#waterfall1";
            this.secondaryCanvas = "#waterfall2";

            this.drawAxis();
            this.initListeners();

            // Change this to your own tornado server port
            var port = 8889;

            // Opening the web socket.
            // var ws = new WebSocket("ws://colossus.gb.nrao.edu:" + port + "/websocket");
            var ws = new WebSocket("ws://localhost:" + port + "/websocket");

            var me = this;

            // The following function handles data sent from the write_message
            // server code in websocket.py
            ws.onmessage = function (evt) {
                if (evt.data == 'close'){
                    console.log('Closing WebSocket.');
                    ws.close();
                } else {
                    var data = eval(evt.data);
                    me.updateDisplay(data[1]);
                    // Debug log to see if we were getting data to the browser.
                    //console.log(data[0], data[1].length);

                    // Send the id of the data back to the server for timing.
                    // This could be removed later.
                    ws.send(data[0]);
                }
            };
        },
        
        initListeners: function() {
            // Sets listeners associated event handlers.
            var me = this;
            // Registering click event for the plot.  Basically,
            // on click, get the position of the click and draw cross
            // hairs to highlight the row and column clicked.  Then update
            // the timeseries and spectral plots to show the selected row
            // and column (channel).
            query('#axis').on('click', function(e){
                // console.log(e);
                var canvas = query("#axis")[0];
                var context = canvas.getContext("2d");
                me.clearCanvas("#axis");
                me.drawAxis();

                // draw crosshairs
                context.beginPath();
                context.moveTo(e.clientX, 0);
                context.lineTo(e.clientX, me.height);
                context.moveTo(0, e.clientY);
                context.lineTo(me.width, e.clientY);
                context.strokeStyle = 'red';  // make the crosshairs red
                context.stroke();
                me.updateNeighboringPlots(e.clientX, e.clientY);
            });
        },

        updateNeighboringPlots: function(x, y) {
            // Converting the (x, y) position for the mouse click to the right indices.
            this.channel_index = Math.floor((x - this.hortMargin) / this.pointWidth);
            this.spectra_index = Math.floor((y - this.vertMargin) / this.pointHeight) + 1;
            // Useful log for debugging
            //console.log("spactra at: " + this.channel_index + ", " + this.spectra_index);

            // If we clicked where there is data plot, tell the spectra plot to plot that
            // row.  Otherwise, we plot clear the plot.
            if (this.spectra_index < this.spectralData.length && this.spectra_index >= 0) {
                this.spectra.plot(this.spectralData[this.spectra_index]);
            } else {
                this.spectra.plot([]);
            }

            // The timeseries objects keeps a running buffer of all the values plotted.
            // When a new column is selected that buffer needs to be flushed and
            // updated with all the values for the select channel.
            this.timeseries.newChannelBuffer(this.spectralData, this.channel_index);
            // Just plotting the timeseries here.
            this.timeseries.plot(this.spectralData[this.spectralData.length - 1], this.channel_index);
        },
            
        clearCanvas: function(id){
            var canvas = query(id)[0];
            //var context = canvas.getContext("2d");
            //context.clearRect(0, 0, c.width, c.height);
            // clearRect doesn't always work for some reason.  Found this trick.
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
 
            var numChannels = data.length;
            
            // Calculate the height and width of each point in the
            // waterfall plot.  The height is based off the number of
            // channels and how much room we have horizontally.  The
            // width is based on a height scalling factor and how much
            // room we have vertically.
            this.pointWidth  = (this.width - this.vertMargin) / numChannels;
            this.pointHeight = this.heightScale * (this.height - this.hortMargin);
            var xStart      = this.hortMargin;
            var yStart      = this.height;
            var value;
            var ii = this.rowCounter; // just some short hand
            this.rowCounter += 1;
            // Given the number of rows we have plotted, what should the position be?
            var pos = Math.round(this.height - this.vertMargin - (this.pointHeight * ii + 1));

            // Set the canvases top position accordingly.
            canvas.style.top = "-" + pos + "px";
            canvas2.style.top = Math.round(this.pointHeight * ii - 2) + "px";
            // Draw some rectangles
            // Here we draw the new spectrum
            for(var jj = 0; jj < numChannels; jj++){
                value = data[jj];
                context.fillStyle = this.getFillColor(value);
                context.fillRect(xStart + (this.pointWidth * jj),
	                     yStart - (this.pointHeight * ii),
               	             this.pointWidth,
		             this.pointHeight);
            }
            // Clip the bottom of the secondary canvas
            var context2 = canvas2.getContext("2d");
            var clipPos = Math.round(canvas2.height - (this.pointHeight * ii - 2));
            context2.clearRect(0, clipPos, this.width, this.pointHeight + 2);

            // Update the spectra and timeseries plots with the new data we just got.
            if (this.spectra_index < this.spectralData.length) {
                this.spectra.plot(this.spectralData[this.spectra_index]);
            }
            this.timeseries.plot(data, this.channel_index);
        },
        
        drawAxis: function() {
            // Nothing special.  Just drawing some lines for the axis.
            var canvas = query('#axis')[0];
            var context = canvas.getContext("2d");
            context.beginPath();
            context.moveTo(this.hortMargin, this.vertMargin); // upper left
            context.lineTo(this.hortMargin, this.height);     // lower left
            context.moveTo(this.hortMargin, this.vertMargin); // upper left
            context.lineTo(this.width, this.vertMargin);  // upper right
            context.strokeStyle = 'black';
            context.stroke();

            context.font = "20px Arial";
            context.fillStyle = '#000000';
            context.fillText("channels", this.width / 2.0, this.vertMargin - 10)
        },
    
        getFillColor: function(value){
            // Dumb coloring algorithm. ;)
            var colors = ['#FF0000',
             	          '#00FF00',
		          '#0000FF',
                          '#800080',
                          '#FFFF00',
                          '#FFA500'];
            return colors[value - 5];
        },

        addData: function(data){
            // If we have reached the max amount of data to keep in
            // the buffer, pop off the end.
            var maxSize = Math.floor(1 / this.heightScale);
            if (this.spectralData.length >= maxSize){
                this.spectralData.pop();
            }

            // A slightly different question.  If we have plotted the
            // max amount of data, swap the canvases and reset the
            // count.
            if (this.rowCounter == maxSize) {
                // Also, if we've been plotting on the second cavnas,
                // clear the secondary before the swap.
                if (this.primaryCanvas == '#waterfall2'){
                    this.clearCanvas(this.secondaryCanvas);
                }
                var temp = this.primaryCanvas;
                this.primaryCanvas = this.secondaryCanvas;
                this.secondaryCanvas = temp;
                this.rowCounter = 0;
            }

            // Finally, insert the new data to the beginning of the
            // buffer.
            this.spectralData.unshift(data);
        },

        updateDisplay: function(data){
            // Utility method for tying everything together when
            // updating the display.  This method is called when we
            // get a new WS message from the server.
            this.addData(data);
            this.drawDisplay(data);
        },

    });
});

