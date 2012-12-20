define([
    'dojo/_base/declare',
    'dojo/query',
    'app/Spectra',
    'app/TimeSeries',
], function(declare, query, Spectra, TimeSeries) {
    return declare(null, {
        init: function(){
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
            var ws = new WebSocket("ws://colossus.gb.nrao.edu:8888/websocket");
            //var ws = new WebSocket("ws://192.168.28.128:8888/websocket");
            ws.onopen = function() {
                //ws.send("Hello, world");
            };
            var me = this;
            ws.onmessage = function (evt) {
                if (evt.data == 'close'){
                    console.log('Closing WebSocket.');
                    ws.close();
                } else {
                    var data = eval(evt.data);
                    me.updateDisplay(data[1]);
                    //console.log(data[0], data[1].length);
                    ws.send(data[0]);
                }
            };
        },
        
        initListeners: function() {
            var me = this;
            query('#axis').on('click', function(e){
                var c = query("#axis")[0];
                var ctx = c.getContext("2d");
                me.clearCanvas("#axis");
                me.drawAxis();
                ctx.moveTo(e.x, 0);
                ctx.lineTo(e.x, me.height);
                ctx.moveTo(0, e.y);
                ctx.lineTo(me.width, e.y);
                //ctx.strokeStyle = "#FF0000";
                ctx.stroke();
                me.updateNeighboringPlots(e.x, e.y);
            });
        },

        updateNeighboringPlots: function(x, y) {
            // Converting the (x, y) position for the mouse click to the right indices.
            this.channel_index = Math.floor((x - this.hortMargin) / this.pointWidth);
            this.spectra_index = Math.floor((y - this.vertMargin) / this.pointHeight) + 1;
            // Useful log for debugging
            //console.log("spactra at: " + this.channel_index + ", " + this.spectra_index);
            if (this.spectra_index < this.spectralData.length && this.spectra_index >= 0) {
                this.spectra.plot(this.spectralData[this.spectra_index]);
            } else {
                this.spectra.plot([]);
            }

            this.timeseries.newChannelBuffer(this.spectralData, this.channel_index);
            this.timeseries.plot(this.spectralData[this.spectralData.length - 1], this.channel_index);
        },
            
        clearCanvas: function(id){
            var c = query(id)[0];
            var ctx = c.getContext("2d");
            //ctx.clearRect(0, 0, c.width, c.height);
            c.width = c.width;
            c.height = c.height;
        },
        
        drawDisplay: function(data){
            var c = query(this.primaryCanvas)[0];
            var c2 = query(this.secondaryCanvas)[0];
            var ctx = c.getContext("2d");
 
            var numChannels = data.length;
            this.pointWidth  = (this.width - this.vertMargin) / numChannels;
            this.pointHeight = this.heightScale * (this.height - this.hortMargin);
            var xStart      = this.hortMargin;
            var yStart      = this.height;
            var value;
            var i = this.rowCounter;
            this.rowCounter += 1;
            var pos = Math.round(this.height - this.vertMargin - (this.pointHeight * i + 1));
            c.style.top = "-" + pos + "px";
            c2.style.top = Math.round(this.pointHeight * i - 2) + "px";
            for(var j = 0; j < numChannels; j++){
                value = data[j];
                ctx.fillStyle = this.getFillColor(value);
                ctx.fillRect(xStart + (this.pointWidth * j),
	                     yStart - (this.pointHeight * i),
               	             this.pointWidth,
		             this.pointHeight);
            }
            //Clip the bottom
            var ctx2 = c2.getContext("2d");
            var clipPos = Math.round(c2.height - (this.pointHeight * i - 2));
            ctx2.clearRect(0, clipPos, this.width, this.pointHeight + 2);  
            if (this.spectra_index < this.spectralData.length) {
                this.spectra.plot(this.spectralData[this.spectra_index]);
            }
            this.timeseries.plot(data, this.channel_index);
        },
        
        drawAxis: function() {
            var c = query('#axis')[0];
            var ctx = c.getContext("2d");
            var l = this.hortMargin; //Short hand
            ctx.moveTo(l, this.vertMargin);
            ctx.lineTo(l, this.height);
            ctx.moveTo(l, this.vertMargin);
            ctx.lineTo(this.width, this.vertMargin);
            ctx.stroke();

            ctx.font = "20px Arial";
            ctx.fillStyle = '#000000';
            ctx.fillText("channels", this.width / 2.0, this.vertMargin - 10)
        },
    
        getFillColor: function(value){
            var colors = ['#FF0000',
             	          '#00FF00',
		          '#0000FF',
                          '#800080',
                          '#FFFF00',
                          '#FFA500'];
            return colors[value - 5];
        },

        addData: function(data){
            var maxSize = Math.floor(1 / this.heightScale);
            if (this.spectralData.length >= maxSize){
                this.spectralData.pop();
            }
            if (this.rowCounter == maxSize) {
                if (this.primaryCanvas == '#waterfall2'){
                    this.clearCanvas(this.secondaryCanvas);
                }
                var temp = this.primaryCanvas;
                this.primaryCanvas = this.secondaryCanvas;
                this.secondaryCanvas = temp;
                this.rowCounter = 0;
            }
            this.spectralData.unshift(data);
        },

        updateDisplay: function(data){
            this.addData(data);
            this.drawDisplay(data);
        },

    });
});

