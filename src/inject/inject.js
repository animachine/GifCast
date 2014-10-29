;(function () {

var width = 320,
    height = 230,
    left = (window.innerWidth - width) / 2,
    top = (window.innerHeight - height) / 2,
    finger = false,
    isHandle = false,
    md = {},
    dialog, deBox;

var MOUSESTATES = {
    'move': 'move',
    '1000': 'ns-resize',
    '1100': 'nesw-resize',
    '0100': 'ew-resize',
    '0110': 'nwse-resize',
    '0010': 'ns-resize',
    '0011': 'nesw-resize',
    '0001': 'ew-resize',
    '1001': 'nwse-resize'
};

chrome.extension.sendMessage({}, function(response) {
    var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);

        // ----------------------------------------------------------
        // This part of the script triggers when page is done loading
        console.log("Hello. This message was sent from scripts/inject.js");
        // ----------------------------------------------------------

    }
    }, 10);
});

chrome.runtime.onMessage.addListener(

    function(request, sender, sendResponse) {

        if (request.subject === 'bip') {
            
            sendResponse({message: 'bop'});
        }
        else if (request.subject === 'showSelector') {
            
            showSelector();
            sendResponse({message: 'ok'});
        }
        else if (request.subject === 'hideSelector') {
            
            hideSelector();
            sendResponse({message: 'ok'});
        }
        else if (request.subject === 'startReportMouse') {
            
            window.addEventListener('mousemove', onMouseMoveReport)
            sendResponse({message: 'ok'});
        }
        else if (request.subject === 'stopReportMouse') {
            
            window.removeEventListener('mousemove', onMouseMoveReport)
            sendResponse({message: 'ok'});
        }
    }
);

initSelector();



function reportMetrics() {

    chrome.runtime.sendMessage({
        subject: 'changeCrop',
        left: left,
        top: top,
        width: width,
        height: height,
    });
}

function onMouseMoveReport(e) {

    chrome.runtime.sendMessage({
        subject: 'changeMouse',
        x: e.x,
        y: e.y,
    });
}

function showSelector() {

    document.body.appendChild(dialog);
}

function hideSelector() {

    if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
    }
}

function initSelector() {

    dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    dialog.style.position = 'fixed';
    dialog.style.margin = '0';
    dialog.style.border = '';
    dialog.style.top = '0px';
    dialog.style.left = '0px';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.background = 'none';
    dialog.style.border = 'none';

    deBox = document.createElement('div');
    deBox.style.position = 'absolute';
    deBox.style.margin = '0';
    deBox.style.border = '1px solid lime';
    deBox.style.boxShadow = '0px 0px 12px 4px rgba(50, 50, 50, 0.75)';
    dialog.appendChild(deBox);

    refreshSelectionBox();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);




    function refreshSelectionBox() {
      
        deBox.style.top = top + 'px';
        deBox.style.left = left + 'px';
        deBox.style.width = width + 'px';
        deBox.style.height = height + 'px';
    }





    function onMouseMove(e) {

        if (!isHandle) {
            
            setFinger(e);
        }
        else {
            onDrag(e);
        }
    }

    function onMouseDown(e) {

        if (!finger) {
            return;
        }

        e.stopPropagation();
        e.preventDefault();

        isHandle = true;

        md.mx = e.x;
        md.my = e.y;
        md.top = top;
        md.left = left;
        md.width = width;
        md.height = height;

        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('mouseleave', onMouseUp);
    }

    function onMouseUp() {

        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mouseleave', onMouseUp);
        
        isHandle = false;
    }





    function setFinger(e) {

        var mx = e.x,
            my = e.y,
            diff = 7,
            dTop = Math.abs(my - top),
            dRight = Math.abs(mx - (left + width)),
            dBottom = Math.abs(my - (top + height)),
            dLeft = Math.abs(mx - left),
            onTop = dTop < diff,
            onLeft = dLeft < diff,
            onBottom = dBottom < diff,
            onRight = dRight < diff,
            inside = mx > left && mx < left + width && my > top && my < top + height;

        if (width < diff * 2 && inside) {
            
            onLeft = false;
            onRight = false;
        }

        if (height < diff * 2 && inside) {
        
            onTop = false;
            onBottom = false;
        }
        
        if (onTop || onRight || onBottom || onLeft) {

            finger = ('000' + (onTop * 1000 + onRight * 100 + onBottom * 10 + onLeft * 1)).substr(-4);
        }
        else if (inside) {

            finger = 'move';
        }
        else {
            finger = false;
        }
    
        deBox.style.cursor = MOUSESTATES[finger];
    };




    function onDrag(e) {
      
        var mx = e.x,
            my = e.y,
            dx = mx - md.mx,
            dy = my - md.my,
            shift = e.shiftKey; //keep proportion
            
        if (finger === 'move') {

            left = md.left + dx;
            top = md.top + dy;
        }
        
        if (finger.charAt(0) === '1') {

            top = md.top + dy;
            height = md.height - dy;
        }

        if (finger.charAt(1) === '1') {

            width = md.width + dx;
        }

        if (finger.charAt(2) === '1') {

            height = md.height + dy;
        }

        if (finger.charAt(3) === '1') {

            left = md.left + dx;
            width = md.width - dx;
        }

        refreshSelectionBox();
        reportMetrics();
    }

    dialog.showModal();
};

}());