var cached = [];
cached.push(location.href);
var bottomMenu;
var snackbar_timeout;
var selected;

var addbuttoncolor2 = "#c4c4c4"

// Get the videoplayer
function attachToVid() {
    var vid = document.querySelector("video");
    if (vid) {
        // Play next when video ends
        vid.onended = function(e) {
            nextMessage();
        }

        vid.addEventListener("pause", function() {
            chrome.runtime.sendMessage({
                type: "playing",
                state: false
            });
        });

        vid.addEventListener("play", function() {
            chrome.runtime.sendMessage({
                type: "playing",
                state: true
            });
        });
    }
}

// Snackbar to notify about "playnexthere"
function injectSnackbar() {
    var snackbar = document.createElement("div");
    snackbar.setAttribute("id", "snackbar");
    document.body.append(snackbar);
}

function showSnackbar(message) {
    if (snackbar_timeout) {
        clearTimeout(snackbar_timeout);
    }
    // Get the snackbar DIV
    var x = document.getElementById("snackbar");
    x.innerHTML = message;

    // Add the "show" class to DIV
    x.className = "show";

    // After 3 seconds, remove the show class from DIV
    snackbar_timeout = setTimeout(function() {
        x.className = "";
        snackbar_timeout = null;
    }, 3000);
}
injectSnackbar();


function herebarSnackbarMessage() {
    var message = "";
    // sendmessage is async
    chrome.runtime.sendMessage({
        type: "check"
    }, function(response) {
        // Decide which screen the user is in and the context
        if (response.response == "selected") {
            message = "Queue paused";
        } else if (document.location.href.match(/watch/)) {
            message = "Queued after this video";
        } else {
            message = "Queued to this tab";
        }
        // Show snackbar with appropriate message
        showSnackbar(message);
    });
}

function injectPrimaryAddButton() {
    var video_primary_info = document.querySelector("ytd-menu-renderer.ytd-video-primary-info-renderer");
    var top_level_buttons = video_primary_info.querySelector("div#top-level-buttons");
    top_level_buttons.querySelectorAll(".addbuttonprimary").forEach(function(button) {
        top_level_buttons.removeChild(button);
    });

    var titlediv = document.querySelector("h1.title");
    var title = titlediv.querySelector("yt-formatted-string.ytd-video-primary-info-renderer").innerHTML;

    var button = document.createElement("img");
    button.src = chrome.extension.getURL("images/plus.png");

    button.className = "addbuttonprimary";
    button.onclick = function() {
        button.style.background = addbuttoncolor2;
        button.style.borderColor = addbuttoncolor2;
        addNext(title.trim(), document.location.href);
    };

    top_level_buttons.appendChild(button);
}

// Tell the background that the video is done
function nextMessage() {
    chrome.runtime.sendMessage({
        type: "next"
    });
}

// Add next to local queue storage
function addNext(name, nexturl) {
    var videoqueue;
    chrome.storage.local.get({
        'queue': []
    }, function(result) {
        videoqueue = result.queue;
        videoqueue.push([name, nexturl]);
        chrome.storage.local.set({
            'queue': videoqueue
        }, function() {});
    });
}

// Injects the controls in the bottom
function injectBottomMenu() {
    bottomMenu = document.createElement("div");
    bottomMenu.id = "bottomMenu";

    var nextbar = document.createElement("a");
    nextbar.id = "next";

    var img = document.createElement("img");
    img.src = chrome.extension.getURL("images/nexticon.png");
    nextbar.appendChild(img);

    var herebar = document.createElement("a");
    herebar.id = "here";
    herebar.innerHTML = "Q";
    // Ask background if this tab is selected
    chrome.runtime.sendMessage({
        type: "check"
    }, function(response) {
        if (response.response == "selected") {
            herebar.style.color = 'white';
        }
    });

    var pip = document.createElement("a");
    pip.id = "pip";

    var img = document.createElement("img");
    img.src = chrome.extension.getURL("images/pip.png");
    pip.appendChild(img);

    nextbar.onclick = function() {
        chrome.runtime.sendMessage({
            type: "forcenext"
        });
    }
    pip.onclick = function() {
        var vid = document.querySelector("video");
        if (vid) {
            if (vid !== document.pictureInPictureElement) {
                vid.requestPictureInPicture();
            } else {
                document.exitPictureInPicture();
            }
        }
    }
    herebar.onclick = function() {
        herebarSnackbarMessage();
        chrome.runtime.sendMessage({
            type: "playnexthere"
        });
    }

    bottomMenu.appendChild(nextbar);
    bottomMenu.appendChild(herebar);
    bottomMenu.appendChild(pip);
    document.body.appendChild(bottomMenu);
}
injectBottomMenu();

// Add button to div called dismissible
function injectAddButton(dismissible) {
    var thumbnailoverlay = dismissible.querySelector("ytd-thumbnail");
    if (thumbnailoverlay == null || thumbnailoverlay.querySelector(".addbutton") != null) {
        return;
    }
    var thumbnail = dismissible.querySelector("#thumbnail");
    var title = dismissible.querySelector("#video-title");

    var button = document.createElement("img");
    button.src = chrome.extension.getURL("images/plus.png");
    if (!document.location.href.match(/watch/)){
        button.style.width="18px";
        button.style.height="18px";
        button.style.borderWidth="7px";
    }

    // var button = document.createElement("button");
    button.className = "addbutton";
    // button.appendChild(img);

    button.onclick = function() {
        button.style.background = addbuttoncolor2;
        button.style.borderColor = addbuttoncolor2;
        if(title.hasAttribute("title")){
            addNext(title.getAttribute("title").trim(), "https://www.youtube.com" + thumbnail.getAttribute("href"));
        } else {
            addNext(title.innerHTML.trim(), "https://www.youtube.com" + thumbnail.getAttribute("href"));
        }
    };
    thumbnailoverlay.appendChild(button);
}

// Select all current dismissibles
document.querySelectorAll("#dismissible").forEach(function(dismissible) {
    injectAddButton(dismissible);
});

// When the "dismissible" div arrives, inject button
document.arrive("#dismissible", function() {
    injectAddButton(this);
});

document.querySelectorAll(".html5-main-video").forEach(function() {
    attachToVid();
});

document.arrive(".html5-main-video",function(){
    attachToVid();
});

// Hide Bottom menu on fullscreen
document.addEventListener("fullscreenchange", (event) => {
    if (document.fullscreenElement) {
        bottomMenu.style.display = "none";
    } else if (!document.fullscreenElement) {
        bottomMenu.style.display = "block";
    }
});

// Broadcast tabid to other scripts
chrome.runtime.sendMessage({
    type: "newtab"
});

// Button which adds the current video to the queue
window.addEventListener("yt-page-data-updated", function() {
    injectPrimaryAddButton();
});
// window.addEventListener("DOMContentLoaded", function() {
//     injectPrimaryAddButton();
// });

document.arrive("#top-level-buttons",function(){
    injectPrimaryAddButton();
    document.unbindArrive("#top-level-buttons");
});



// Listen to directions from the background script
chrome.runtime.onMessage.addListener(
    function(msg, sender, sendResponse) {
        if (msg.type == "notselected") {
            document.querySelector("a#here").style.color = "black";
        } else if (msg.type == "selected") {
            document.querySelector("a#here").style.color = "white";
        } 
        if (msg.type == "play") {
            document.querySelector("video").play();
            chrome.runtime.sendMessage({
                type: "playing",
                state: true
            });
        } else if (msg.type == "pause") {
            document.querySelector("video").pause();
            chrome.runtime.sendMessage({
                type: "playing",
                state: false
            });
        }
    });

window.addEventListener("yt-navigate-finish", function() {
    injectPrimaryAddButton();
    chrome.runtime.sendMessage({
                type: "playing",
                state: true
            });
});

