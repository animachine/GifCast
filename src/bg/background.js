"use strict";
// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {

        if (request.subject === 'changeCrop') {

            crop.left = request.left;
            crop.top = request.top;
            crop.width = request.width;
            crop.height = request.height;
        }
        else if (request.subject === 'changeMouse') {

            crop.mx = request.x;
            crop.my = request.y;
        }
    }
);

console.log(chrome.extension.getURL('pages/'));


var state,
    crop = {top: 0, left: 0, width: 100, height: 100, mx: 0, my: 0},
    gifRenderer,
    canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d'),
    shots = [],
    video = document.createElement('video'),
    localStream,
    fps = 30,
    lastShotTime,
    shotRafId,
    paths = {
        icons: '../../icons/',
    };

toBaseState();

chrome.browserAction.onClicked.addListener(function (tab) {

    if (state === 'base') toSelectState();
    else if (state === 'select') toRecState();
    else if (state === 'rec') stopLocalStream();
    else if (state === 'render') return;
});

function toBaseState() {

    state = 'base';

    chrome.browserAction.setIcon({path: paths.icons + 'icon_base.png'}, function () {});
}

function toSelectState() {

    chrome.desktopCapture.chooseDesktopMedia(["screen", "window"], function(id) {
        
        if (!id) {
            console.log("Access rejected.");
            return;
        }

        navigator.webkitGetUserMedia({
            audio: false,
            video: { 
                mandatory: { 
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: id,
                    maxWidth: screen.width,
                    maxHeight: screen.height,
                } 
            }
        }, gotStream, getUserMediaError);
    });
}

function gotStream(stream) {

    localStream = stream;
    localStream.onended = toRenderState;

    video.src = URL.createObjectURL(localStream);
    video.width = screen.width;
    video.height = screen.height;
    
    crop.width = screen.width;
    crop.height = screen.height;
    console.log(crop)
    toRecState();
}

function toRecState() {

    state = 'rec';

    canvas.width = crop.width;
    canvas.height = crop.height;

    gifRenderer = new GIF({
        workers: 2,
        quality: 10,
        width: crop.width,
        height: crop.height,
    });

    lastShotTime = performance.now();
    shot();

    chrome.browserAction.setIcon({path: paths.icons + 'icon_stop.png'}, function () {});
}

function getUserMediaError(err) {
    console.log("getUserMedia() failed.");
    console.log(err);
}

function stopLocalStream() {

    if (localStream) {

        localStream.stop();
    }
}

function toRenderState() {

    state = 'render';

    cancelAnimationFrame(shotRafId);

    chrome.browserAction.setIcon({path: paths.icons + 'icon_select.png'}, function () {});

    while (shots.length) {

        var shot = shots.shift();
        gifRenderer.addFrame(shot.ctx, {copy: true, delay: shot.delay});
    }

    gifRenderer.on('finished', function(blob) {
        
        window.open(URL.createObjectURL(blob));
        
        toBaseState();
    });

    gifRenderer.render();

}





function sendToPage(msg, cb) {

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, msg, cb);
    });
}

function injectScript(cb) {

    sendToPage({subject: 'bip'}, function (response) {

        if (response) {
            cb();
        }
        else {
            chrome.tabs.executeScript(null, {file: 'src/inject/inject.js'}, function () {
                
                sendToPage({subject: 'startReportMouse'});
                
                cb();
            });
        }
    });
}

function shot(cb) {

    if (state !== 'rec') return;

    var now = performance.now(),
        delay = now - lastShotTime;

    lastShotTime = now;

    console.log('fps:', 1000/delay);

console.time('canvas draw');
    
    var canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    var ctx = canvas.getContext('2d');

    ctx.drawImage(video, -crop.left, -crop.top);

    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.arc(crop.mx - crop.left, crop.my - crop.top, 5, 0, Math.PI*2);
    ctx.stroke();
    shots.push({
        ctx: ctx,
        delay: delay
    });
console.timeEnd('canvas draw');

    shotRafId = setTimeout(shot, 1);
}