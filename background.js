/*
(C) Portions copyright 2016 Taylor Raack.
Some portions from public domain

Amplifier is free software: you can redistribute it and/or modify
it under the terms of the Affero GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Amplifier is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
Affero GNU General Public License for more details.

You should have received a copy of the Affero GNU General Public License
along with Amplifier.  If not, see <http://www.gnu.org/licenses/>.
 */

var working = false

function getAmpTabs(callback) {
  chrome.storage.local.get('amptabs', function(items) { callback(items['amptabs']); });
}

function setAmpTabs(ampTabs, callback) {
  chrome.storage.local.set({ 'amptabs' : ampTabs }, callback);
}

function updatePageActionIcon(tab, amp) {
  console.log("updating page action icon; canonical: " + amp.canonicalUrl + "; amp: " + amp.ampUrl + "; on amp page: " + amp.onAmpPage); 
  if (amp.canonicalUrl != null && amp.onAmpPage != null && amp.onAmpPage) {
    console.log("canonical url is " + amp.canonicalUrl + " and we are on an amp page")
    // we are currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : tab.id, path : 'canonical.png' });
    chrome.pageAction.setTitle({ tabId : tab.id, title : 'Show the Canonical version of this page' });
    chrome.pageAction.show(tab.id);
    console.log("setting to is on amp page icon");
  } else if (amp.ampUrl != null && amp.onAmpPage != null && !amp.onAmpPage) {
    console.log("amp url is " + amp.ampUrl + " and we are NOT on an amp page")
    // we are not currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : tab.id, path : 'amplify.png' });
    chrome.pageAction.setTitle({ tabId : tab.id, title : 'Show the AMP version of this page' });
    chrome.pageAction.show(tab.id);
    console.log("setting to is on canonical page icon");
  }
}

function checkAndWork(fcn) {
  if (working) {
    setTimeout(function() { checkAndWork(fcn) }, 5);
  } else {
    working = true;
    fcn();
  }
}

function handleOnAmpPage(sender, onAmpPage) {
  if (onAmpPage == null) throw "onAmpPage cannot be null";
  var tab = sender.tab;
  console.log("got new amp page " + onAmpPage);
  checkAndWork(function() {
    getAmpTabs(function(ampTabs) {
      console.log("amp tabs loaded");
      var amp = ampTabs[tab.id];
      if (typeof(amp) == 'undefined') {
        amp = { ampEnabled : true };
      }
      if (amp.canonicalUrl != null && onAmpPage && !amp.ampEnabled) {
        console.log("switching to canonical url")
        working = false;
        chrome.tabs.update(tab.id, { url : amp.canonicalUrl });
      } else if (amp.ampUrl != null && !onAmpPage && amp.ampEnabled) {
        console.log("switching to amp url")
        working = false;
        chrome.tabs.update(tab.id, { url : amp.ampUrl });
      } else {
        amp.onAmpPage = onAmpPage;
        ampTabs[tab.id] = amp;
        if(amp.onAmpPage == true) {
          console.log("ON AMP PAGE IS TRUE");
        }
        updatePageActionIcon(tab, amp);
        setAmpTabs(ampTabs, function() { working = false; });
      }
    });
  });
}

function handleCanonicalUrl(sender, canonicalUrl) {
  if (canonicalUrl == null) throw "canonicalUrl cannot be null"
  var tab = sender.tab;
  console.log("got new canonicalUrl " + canonicalUrl);
  checkAndWork(function() {
    getAmpTabs(function(ampTabs) {
      console.log("amp tabs loaded");
      var amp = ampTabs[tab.id];
      if (typeof(amp) == 'undefined') {
        amp = { ampEnabled : true };
      }
      if (amp.onAmpPage != null && amp.onAmpPage && !amp.ampEnabled) {
        console.log("switching to canonical url");
        working = false;
        chrome.tabs.update(tab.id, { url : canonicalUrl });
      } else {
        amp.canonicalUrl = canonicalUrl;
        ampTabs[tab.id] = amp;
        updatePageActionIcon(tab, amp);
        setAmpTabs(ampTabs, function() { working = false; });
      }
    });
  });
}

function handleAmpUrl(sender, ampUrl) {
  if (ampUrl == null) throw "ampUrl cannot be null"
  var tab = sender.tab;
  console.log("got new ampUrl " + ampUrl);
  checkAndWork(function() {
    getAmpTabs(function(ampTabs) {
      var amp = ampTabs[tab.id];
      if (typeof(amp) == 'undefined') {
        amp = { ampEnabled : true };
      }
      if (amp.onAmpPage != null && !amp.onAmpPage && amp.ampEnabled) {
        console.log("switching to amp url");
        working = false;
        chrome.tabs.update(tab.id, { url : ampUrl });
      } else {
        amp.ampUrl = ampUrl;
        ampTabs[tab.id] = amp;
        updatePageActionIcon(tab, amp);
        setAmpTabs(ampTabs, function() { working = false });
      }
    });
  });
}

function handleClear(tabId) {
  console.log("got new clear " + tabId);
  checkAndWork(function() {
    getAmpTabs(function(ampTabs) {
      var amp = ampTabs[tabId];
      if (amp != null) {
        amp = { ampEnabled : amp.ampEnabled };
      } else {
        amp = { ampEnabled : true };
      }
      ampTabs[tabId] = amp;
      setAmpTabs(ampTabs, function() { working = false });
    });
  });
}

chrome.runtime.onMessage.addListener(function(amp, sender, sendResponse) {
  if (amp.sentinel === undefined || amp.sentinel != "__AMPMESSAGE__") {
    return; // not from amplifier
  }
  console.log("received action " + amp.method + " with data " + amp.data + " url " + sender.url);
  switch (amp.method) {
    case "clear":
      handleClear(sender.tab.id);
      break;
    case "onAmpPage":
      handleOnAmpPage(sender, amp.data);
      break;
    case "ampUrl":
      handleAmpUrl(sender, amp.data);
      break;
    case "canonicalUrl":
      handleCanonicalUrl(sender, amp.data);
      break;
    default: 
      break;
  }
  console.log("completed action " + amp.method);
});

//
chrome.pageAction.onClicked.addListener(function(tab) {
  getAmpTabs(function(ampTabs) {
    var amp = ampTabs[tab.id];
    amp.ampEnabled = !amp.ampEnabled;
    ampTabs[tab.id] = amp;
    setAmpTabs(ampTabs, function() {
      if (typeof(amp) !== 'undefined') {
        
        if (amp.onAmpPage != null && amp.onAmpPage) {
          // the current state is amp on - switch it to canonical
          if (amp.canonicalUrl != null) {
            if (tab.url != amp.canonicalUrl) {
              console.log("switching to canonical page");
              chrome.tabs.update(tab.id, { url : amp.canonicalUrl });
            }
          }
        } else if (amp.onAmpPage != null && !amp.onAmpPage) {
          // current state is amp off - switch to amp on
          if (amp.ampUrl != null) {
            if (tab.url != amp.ampUrl) {
              console.log("switching to amp page");
              chrome.tabs.update(tab.id, { url : amp.ampUrl });
            }
          }
        }
      } else {
        // missing amp state for this tab - bug?
      }
    });
  });
});
