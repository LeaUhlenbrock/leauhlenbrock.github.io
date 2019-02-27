/*** Helper methods ***/
String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function fitToContainer(canvas){
    // Make it visually fill the positioned parent
    canvas.style.width ='100%';
    canvas.style.height='100%';
    // ...then set the internal size to match
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

/*** Deadline clock constructor ***/
function DeadlineClock(canvas) {
    this.canvas = canvas;
}

/*** Deadline clock prototype ***/
DeadlineClock.prototype = (function() {
    // Private constants
    let outerRadius = 150;
    let middleRadius = 100;
    let innerRadius = 50;
    let markerRadius = 5;
    // Color scheme: https://color.adobe.com/Neutral-Blue-color-theme-22361/edit/?copy=true&base=0&rule=Custom&selected=0&name=Copy%20of%20Neutral%20Blue&mode=rgb&rgbvalues=0.988235,1,0.960784,0.819608,0.858824,0.741176,0.568627,0.666667,0.615686,0.243137,0.376471,0.435294,0.0980392,0.203922,0.254902&swatchOrder=0,1,2,3,4
    let colorPalette = ["#FCFFF5", "#3E606F", "#193441"];

    // Private members
    var conferences = [];
    var conferenceMarkers = [];
    var centerX, centerY;
    var canvas;
    var ctx;

    function init() {
        canvas = this.canvas;
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;
        ctx = canvas.getContext('2d');

        draw();
    }

    function onResize() {
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;

        setConferenceMarkers();
        draw();
    }

    function setConferences(confs) {
        conferences = confs;
        
        setConferenceMarkers();
        draw();
    }

    function setConferenceMarkers() {
        // Count the number of days to today next year
        let today = moment();
        let todayInOneYear = moment(today).add(1, 'years');
        let numDaysOneYear = todayInOneYear.diff(today, 'days');

        // Clear current conference markers
        conferenceMarkers = [];

        for (let i=0; i<conferences.length; i++) {
            let conference = conferences[i];
            let deadline = conference.deadline;
            if ("TBA" === deadline) {
                return;
            }

            deadline = moment(deadline);
            // Check if deadline has passed already
            if (deadline.diff(today) < 0) {
                return;
            }

            // Check if date is more than one year away
            if (deadline.diff(todayInOneYear) > 0) {
                return;
            }

            // Get hash of conference title
            let id = conference.id;
            let title = conference.title;
            let hash = Math.abs(title.hashCode());
            let color = colorPalette[hash % colorPalette.length];

            // Draw marker on outer circle
            var newYearsDay = moment(todayInOneYear.format('YYYY') + '-01-01');
            var todayFraction = todayInOneYear.diff(newYearsDay, 'days') / numDaysOneYear;

            var numberOfDaysToToday = deadline.diff(today, 'days');
            var numberOfDaysFraction = numberOfDaysToToday / numDaysOneYear + todayFraction;
            if (numberOfDaysFraction > 1) {
                numberOfDaysFraction -= 1;
            }

            var angle = numberOfDaysFraction * Math.PI * 2;

            var markerX = centerX + outerRadius * Math.sin(angle);
            var markerY = centerY - outerRadius * Math.cos(angle);

            conferenceMarkers.push({
                title: title,
                color: color,
                markerX: markerX,
                markerY: markerY,
                id: id
            });
        }
    }

    function draw() {
        // First of all, clear the current canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Outer circle
        drawCircle(centerX, centerY, outerRadius, 0, Math.PI * 2, false, '#D1DBBD', 'fill', 1);
        // Middle circle
        drawCircle(centerX, centerY, middleRadius, 0, Math.PI * 2, false, '#FCFFF5', 'fill', 1)
        // Inner circle
        drawCircle(centerX, centerY, innerRadius, 0, Math.PI * 2, false, '#91AA9D', 'fill', 1);

        // Count the number of days to today next year
        let today = moment();
        let todayInOneYear = moment(today).add(1, 'years');
        let numDaysOneYear = todayInOneYear.diff(today, 'days');

        // Split circle into 12 slices
        let numberOfDaysPerMonth = new Array(12);
        var currentDate = moment(today);
        for (var i=0; i<12; i++) {
            let currentMonth = currentDate.format("M") - 1;
            numberOfDaysPerMonth[currentMonth] = currentDate.daysInMonth();
            currentDate.add(1, 'month');
        }

        // Draw month boundaries
        var currentPastDays = 0;
        for (var i=0; i<12; i++) {
            var angle = (currentPastDays / numDaysOneYear) * 2 * Math.PI;

            var startX = centerX + middleRadius * Math.sin(angle);
            var startY = centerY - middleRadius * Math.cos(angle);
            var endX = centerX + outerRadius * Math.sin(angle);
            var endY = centerY - outerRadius * Math.cos(angle);
            
            // Draw month boundary
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Draw month name
            var textX = centerX + (outerRadius + 20) * Math.sin(angle);
            var textY = centerY - (outerRadius + 20) * Math.cos(angle);
            var monthThreeLetterName = moment('2019-' + (i + 1) + '-01').format("MMMM").substr(0, 3);

            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText(monthThreeLetterName, textX, textY);

            currentPastDays += numberOfDaysPerMonth[i];
        }

        // Draw conferences
        conferenceMarkers.forEach(function(conf) {
            drawCircle(conf.markerX, conf.markerY, markerRadius, 0, Math.PI * 2, false, conf.color, 'fill', 1);
        });
    }

    function drawRect(x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
    }

    function drawArc(x, y, radius, start, end, clockwise) {
        ctx.beginPath();
        ctx.arc(x, y, radius, start, end, clockwise);
    }

    function drawCircle( x, y, radius, start, end, clockwise, color, type, thickness) {
        if ("fill" === type) {
            ctx.fillStyle = color;
            drawArc(x, y, radius, start, end, clockwise);
            ctx.fill();
        }
        else if ("stroke" == type) {
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            drawArc(x, y, radius, start, end, clockwise);
            ctx.stroke();
        }
    }

    return {
        setConferences: setConferences,
        draw: draw,
        onResize: onResize,
        init: init
    };
})();