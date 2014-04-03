// This file defines a Display object, which is the main part of the
// client program.  It controls the content and position of the
// canvases.
//

function Display() {

    var me = this; // convention for local use of self

    // Set listeners and associated event handlers.
    this.initListeners = function () {

        // Registering click event for the plot.
        // On click, get the position of the click and draw cross
        // hairs to highlight the row and column clicked.  Then update
        // the timeseries and spectral plots to show the selected row
        // and column (channel).
	// !!! CHANGE IDENTIFIER TO axis TO ENABLE
        $('#axs').click(function (e) {

            // get click pos relative to left edge of plot
            // http://api.jquery.com/event.pageX/
            me.crosshairX = Math.floor(e.pageX - $("#axis").offset().left);

            // get click pos relative to top of plot
            // http://api.jquery.com/event.pageY/
            me.crosshairY = Math.floor(e.pageY - $("#axis").offset().top);

            var canvas = $("#axis")[0];
            var context = canvas.getContext("2d");
            me.clearCanvas("#axis");

            // draw crosshairs
            context.beginPath();
            context.moveTo(me.crosshairX - 1, 0);
            context.lineTo(me.crosshairX - 1, me.canvasHeight);
            context.moveTo(0, me.crosshairY - 1);
            context.lineTo(me.canvasWidth, me.crosshairY - 1);
            context.strokeStyle = 'yellow'; // make the crosshairs red
            context.stroke();

            // display the position with text above the plot
            $('#crosshair-position').html("Column " + (me.crosshairX) + ", Row " + (me.crosshairY));
            me.updateNeighboringPlots(me.currentBank, me.crosshairX, me.crosshairY);
        });

        $('#bank-choice').change(function () {
            // stop requesting data
            clearTimeout(me.updateId);

            // clear the plot display
            me.resetDisplay();

            me.currentBank = $('#bank-choice').find(':checked').val();
            console.log("----------------- Changed to bank " + me.currentBank);

            // request data every 1 second for new bank
            me.startRequestingData(me.currentBank);
        });

	$('#mybutton').click( function() {
	    me.ws.send(me.currentBank);
	});
    };

    this.clearCanvas = function (id) {
        var canvas = $(id)[0];
        canvas.width = canvas.width;
        canvas.height = canvas.height;
    };

    // when we want to switch to displaying a different bank we
    // need to clear the plot and axes
    this.resetDisplay = function () {

        // clear each of the two plot canvases
        this.clearCanvas(this.primaryCanvas);
        this.clearCanvas(this.secondaryCanvas);

        // reset the canvas top positions
        $(this.primaryCanvas).css("top", "-350px");
        $(this.secondaryCanvas).css("top", "150px");

        delete this.specData[this.currentBank];
        this.specData[this.currentBank] = [];

	this.rowCounter = 0;
    };

    this.updateNeighboringPlots = function (bank, x, y) {

        // Convert the (x, y) position for the mouse click to the right indices.
        this.channel_index = Math.floor(x / this.pointWidth);
        this.spectrum_index = Math.floor(y / this.pointHeight);

        // debug
        console.log("clicked spectrum at: [" + this.spectrum_index + ", " + this.channel_index + "]");

        // If we clicked where there is data plot, tell the spectra plot to display that
        // row.  Otherwise, we clear the spectrum plot.
        if (this.spectrum_index < this.specData[this.currentBank].length && this.spectrum_index >= 0) {
            var data = this.specData[this.currentBank][this.spectrum_index];
            console.log('updating spectrum plot');
            var min = this.getMin(data);
            var max = this.getMax(data);
            this.drawSpectrum(bank, data);
        } else {
            this.drawSpectrum(null, null);
        }

        if (this.channel_index < this.specData[this.currentBank][0].length && this.channel_index >= 0) {
            var data = new Array(this.nSpectra);
            for (var i = 0; i < data.length; i++) {
                data[i] = null;
            }

            for (var i = 0; i < this.specData[this.currentBank].length; i++) {
                data[i] = this.specData[this.currentBank][i][this.channel_index];
            }

            console.log('updating time series, length', data.length);
            var min = this.getMin(data.slice(0, this.specData[this.currentBank].length));
            var max = this.getMax(data.slice(0, this.specData[this.currentBank].length));
            this.drawTimeSeries(data, min, max);
        } else {
            this.drawTimeSeries(null, null, null);
        }

    };

    this.getMin = function (data) {
        Array.prototype.min = function () {
            return Math.min.apply(null, this);
        };
        return Math.min.apply(null, data);
    };

    this.getMax = function (data) {
        Array.prototype.max = function () {
            return Math.max.apply(null, this);
        };
        return Math.max.apply(null, data);
    };

    this.addData = function (bank, data) {
        // If we have reached the max amount of data to keep in
        // the buffer, pop off the end.
        if (this.specData[this.currentBank].length >= this.nSpectra) {
            this.specData[this.currentBank].pop();
        }

        // If we have plotted the max amount of data, swap the
        // canvases and reset the count.
        if (this.rowCounter >= this.nSpectra) {
            console.log("= " + this.rowCounter + " " + this.nSpectra);

            // Also, if we've been plotting on the second cavnas,
            // clear the secondary before the swap.
            $(this.secondaryCanvas).css("top", "-350px");
            this.clearCanvas(this.secondaryCanvas);
            var temp = this.primaryCanvas;
            this.primaryCanvas = this.secondaryCanvas;
            this.secondaryCanvas = temp;
            this.rowCounter = 0;
        } else {
            console.log('used ' + this.rowCounter + " of " + this.nSpectra + " available rows in plot");
        }

        // Finally, insert the new data to the beginning of the
        // buffer.
        this.specData[this.currentBank].unshift(data);
    };

    this.drawTimeSeries = function (data, min, max) {
        $("#timeseries").highcharts({
            chart: { animation: false },
            legend: { enabled: false },
            credits: { enabled: false },
            title: { text: 'Time Series' },
            series: [{
                name: 'amplitude',
                linewidth: 1,
                marker: { enabled: false },
                animation: false,
                data: data,
            }],
            tooltip: { enabled: false },
            plotOptions: {
                series: {
                    states: { hover: { enabled: false } },
		    lineWidth: 1
                }
            },
            yAxis: {
                type: 'logarithmic',
              //  min: min,
                //max: max,
                title: {
                    text: null
                },
            },
        });
    };

    this.drawSpectrum = function (bank, data) {
        var min = this.getMin(data);
        var max = this.getMax(data);

        $("#waterfall-spectrum").highcharts(me.specoptions);

	var wfspec = $('#waterfall-spectrum').highcharts();
	wfspec.series[0].setData(data);
	wfspec.setTitle({text: 'Spectrometer '+bank});
//	wfspec.yAxis[0].options.min = min;
//	wfspec.yAxis[0].options.max = max;
    };

    this.drawSpec = function(number, bank, data) {
        var min = this.getMin(data);
        var max = this.getMax(data);
        $("#spectrum-"+number).highcharts(me.specoptions);
	var specchart = $('#spectrum-'+number).highcharts();
	specchart.series[0].setData(data);
	specchart.setTitle({text: 'Spectrometer '+bank});
//	specchart.yAxis[0].options.min = min;
//	specchart.yAxis[0].options.max = max;


    };

    this.startRequestingData = function (bank) {
	console.log('requesting data from bank ' + bank); // debug
        var me = this; // convention for local use of self
        me.updateId = setInterval(function () {
            me.ws.send(bank);
        }, 1000); // 1000 milliseconds == 1 second
	console.log('update id: ' + me.updateId); // debug
    };

    this.drawDisplay = function (data) {
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
        var canvas = $(this.primaryCanvas)[0];
        var canvas2 = $(this.secondaryCanvas)[0];
        var context = canvas.getContext("2d");
        var context2 = canvas2.getContext("2d");

        // Given the number of rows we have plotted, what should the position be?
        this.rowCounter += 1;

        // Set the canvases top position accordingly.
        $(this.primaryCanvas).css("top", $(this.primaryCanvas).position().top + this.pointHeight);
        $(this.secondaryCanvas).css("top", $(this.secondaryCanvas).position().top + this.pointHeight);
        console.log("height " + this.pointHeight);
        console.log("canvas 1 top " + $(this.primaryCanvas).position().top);
        console.log("canvas 2 top " + $(this.secondaryCanvas).position().top);

        // Draw the new spectrum as rectangles
        for (var chan = 0; chan < data.length; chan++) {
            context.fillStyle = this.getFillColor(Math.log(data[chan]));
            context.fillRect(this.pointWidth * chan,
            this.canvasHeight - (this.pointHeight * this.rowCounter),
            this.pointWidth, this.pointHeight);
        }

        // Clip the bottom of the secondary canvas
        var clipPos = Math.round(canvas2.height - (this.pointHeight * this.rowCounter));
        context2.clearRect(0, clipPos, this.canvasWidth, (this.pointHeight * this.rowCounter));
    };

    this.getFillColor = function (value) {
        var colorIdx = Math.floor(((value - this.colormin) / (this.colormax - this.colormin)) * 255);
        return 'rgb(' + colorIdx + ',0,0)';
    };

    // set waterfall lower spectrum plot position and width
    $("#waterfall-spectrum").css("top", $("#axis").position().top + $("#axis").height());
    $("#waterfall-spectrum").css("width", $("#axis").width());

    this.canvasWidth = $("#axis").width(); // canvas width, in pixels
    this.canvasHeight = $("#axis").height(); // canvas height, in pixels

    // make the bank radio button choices a jquery-ui buttonset
    $("#bank-choice").buttonset();

    this.currentBank = null;
    this.specData = {
        // each letter is a key to a bank or spectral window
        A: [], // "[]" is the same as "new Array()"
        B: [], C: [], D: [], E: [], F: [], G: [], H: [],
    };

    this.nSpectra = 100; // number of spectra in waterfall plot

    // datapoint height and width, in pixels
    this.pointHeight = this.canvasHeight / this.nSpectra;
    this.pointWidth = undefined; // calculated later

    // offsets from left and top of window; needed to translate
    // click events to positions on the waterfall plot
    this.horzOffset = 0;
    this.vertOffset = 0;

    this.rowCounter = 0; // keeps track of the current row position

    // waterfall index of time series to display in the spectrum plot
    this.channel_index = 0;

    // waterfall index of spectrum to display in the spectrum plot
    this.spectrum_index = 0;

    // these will switch as each canvas slides below the viewable area
    this.primaryCanvas = "#waterfallA";
    this.secondaryCanvas = "#waterfallB";
    this.colormax = null; // for color normalization
    this.colormin = null; // for color normalization

    this.updateId = null; // used to control update interval

    // position of the crosshairs
    // this determines what is displayed in the neighboring
    // time series and spectrum plots
    this.crosshairX = 0; // default to channel 0
    this.crosshairY = 0; // default to most recent spectrum

    // highcharts display options object
    this.specoptions =  {
        chart: { animation: false },
        legend: { enabled: false },
        credits: { enabled: false },
        series: [{
            name: 'amplitude',
            marker: { enabled: false },
            animation: false,
	}],
        tooltip: { enabled: false },
        plotOptions: {
            series: {
                states: { hover: { enabled: false } },
		lineWidth: 1
            }
        },
        yAxis: {
            type: 'logarithmic',
            title: { text: null },
        },
    };

    // initialize event listeners
    this.initListeners();
};

// ------------------------------------- methods defined above

// instantiate a Display object
var realtimeDisplay = new Display();

// Open the web socket to the data source, which is the tornado server that
// that is reading from the streaming manager(s)
var hostname = 'arcturus.gb.nrao.edu'
var port = 8888;
realtimeDisplay.ws = new WebSocket("ws://" + hostname + ":" + port + "/websocket");
realtimeDisplay.startRequestingData('A');

// Handle data sent from the write_message server code in vdd_stream_socket.py
var me = realtimeDisplay;


realtimeDisplay.ws.onmessage = function (evt) {
    if (evt.data === 'close') {
        console.log('Closing WebSocket.');
        realtimeDisplay.ws.close();
    } else {
        var msg = eval(evt.data);

        if ('bank_config' === msg[0]) {
            // set the radio button properties depending on what banks
            // are available
            var bank_arr = msg[1];
            $.each(bank_arr, function (index, bank) {
                console.log('enabling bank', bank);
            });

            me.currentBank = bank_arr[0];
            $('#header').html('Spectrometer ' + me.currentBank);

            // send msg to server with default bank to display
            // request data every 1 second
	    me.startRequestingData(me.currentBank);

        } else if ('data' === msg[0]) {
	    var BANKNUM = {'A':0, 'B':1, 'C':2, 'D':3,
			    'E':4, 'F':5, 'G':6, 'H':7};

            var bank = msg[1];

	    var metadata = msg[2];
            var project = metadata[0];
            var scan = metadata[1]; 
            var state = metadata[2];
            var integration = metadata[3]; 
	    var update_waterfall = metadata[4];

	    var cmin = msg[3][0];
	    var cmax = msg[3][1];

            var data = msg[4];

	    // display some metadata on screen
	    $('#header').html('Spectrometer ' + bank);
            $('#metadata').html('Project id: ' + project + ', Scan: ' + scan + ', Int: ' + integration);
            me.colormin = Math.log(cmin);
            me.colormax = Math.log(cmax);

	    // debug info
            console.log('bank', bank);
            console.log('project', project);
            console.log('scan', scan);
            console.log('state', state);
            console.log('color min:', me.colormin);
            console.log('color max:', me.colormax);
            console.log('length of data:', data[BANKNUM[bank]].length);

            me.currentBank = bank;

	    if (update_waterfall == 1)
		{
		    me.pointWidth = me.canvasWidth / data[BANKNUM[bank]].length;
		    me.addData(me.currentBank, data[BANKNUM[bank]]);
		    me.drawDisplay(data[BANKNUM[bank]]);
		    me.updateNeighboringPlots(me.currentBank, me.crosshairX, me.crosshairY);
		}

	    me.drawSpec('1', 'A', data[BANKNUM['A']]);
	    me.drawSpec('2', 'B', data[BANKNUM['B']]);
	    me.drawSpec('3', 'C', data[BANKNUM['C']]);
	    me.drawSpec('4', 'D', data[BANKNUM['D']]);
	    me.drawSpec('5', 'E', data[BANKNUM['E']]);
	    me.drawSpec('6', 'F', data[BANKNUM['F']]);
	    me.drawSpec('7', 'G', data[BANKNUM['G']]);
	    me.drawSpec('8', 'H', data[BANKNUM['H']]);

        } else if ('error' === msg[0]) {
	    // stop requesting data
            clearTimeout(me.updateId);

            // clear the plot display
            me.resetDisplay();

	    var bank = msg[1];
	    console.log('ERROR: data unavailable for bank ' + bank);
	    $('#header').html('Spectrometer ' + bank);
            $('#metadata').html('Data Unavailable');
        } else {
            console.log('ERROR: do not understand message', msg);
        }
    }
};
