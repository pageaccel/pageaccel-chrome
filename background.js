/*
Copyright 2016 Taylor Raack.

This file is part of Foobar.

    Foobar is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Foobar is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Foobar.  If not, see <http://www.gnu.org/licenses/>.
 */

var working = false

function getFromStorage(item, callback) {
  chrome.storage.local.get(item, function(items) { callback(item in items ? items[item] : {}); });
}

function getTabStatus(callback) {
  getFromStorage('tabstatus', callback);
}

function getBothStatus(callback) {
  chrome.storage.local.get(['tabstatus','sitestatus'], function(items) { callback('tabstatus' in items ? items['tabstatus'] : {}, 'sitestatus' in items ? items['sitestatus'] : {}); });
}

function getSiteStatus(callback) {
  getFromStorage('sitestatus', callback);
}

function setToStorage(item, value, callback) {
  var toStore = {};
  toStore[item] = value;
  chrome.storage.local.set(toStore, callback);
}

function setTabStatus(tabStatus, callback) {
  setToStorage('tabstatus', tabStatus, callback);
}

function setSiteStatus(siteStatus, callback) {
  setToStorage('sitestatus', siteStatus, callback);
}

function updatePageActionIcon(tab, status) {
  console.log("updating page action icon; canonical: " + status.canonicalUrl + "; amp: " + status.ampUrl + "; on amp page: " + status.onAmpPage); 
  if (status.canonicalUrl != null && status.onAmpPage != null && status.onAmpPage) {
    console.log("canonical url is " + status.canonicalUrl + " and we are on an amp page")
    // we are currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : tab.id, path : 'canonical.png' });
    chrome.pageAction.setTitle({ tabId : tab.id, title : 'Show the Canonical version of this page' });
    chrome.pageAction.show(tab.id);
    console.log("setting to is on amp page icon");
  } else if (status.ampUrl != null && status.onAmpPage != null && !status.onAmpPage) {
    console.log("amp url is " + status.ampUrl + " and we are NOT on an amp page")
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

function isSimplifyEnabled(sitestatus, url) {
  console.log("checking simplify enabled for url " + url);
  var domain = new URL(url).hostname;
  var enabled = domain in sitestatus ? sitestatus[domain] : true;
  console.log("simplify " + (enabled ? "enabled" : "disabled") + " for domain " + domain);
  return enabled;
}

function handleOnAmpPage(sender, onAmpPage) {
  if (onAmpPage == null) throw "onAmpPage cannot be null";
  var tab = sender.tab;
  console.log("got new amp page " + onAmpPage);
  checkAndWork(function() {
    getBothStatus(function(tabStatus, sitestatus) {
      var status = tabStatus[tab.id];
      if (typeof(status) == 'undefined') {
        status = { enabled : true };
      }
      if (status.canonicalUrl != null && onAmpPage && !isSimplifyEnabled(sitestatus, sender.url)) {
        console.log("switching to canonical url")
        working = false;
        chrome.tabs.update(tab.id, { url : status.canonicalUrl });
      } else if (status.ampUrl != null && !onAmpPage && isSimplifyEnabled(sitestatus, sender.url)) {
        console.log("switching to amp url")
        working = false;
        chrome.tabs.update(tab.id, { url : status.ampUrl });
      } else {
        status.onAmpPage = onAmpPage;
        tabStatus[tab.id] = status;
        updatePageActionIcon(tab, status);
        setTabStatus(tabStatus, function() { working = false; });
      }
    });
  });
}

function handleCanonicalUrl(sender, canonicalUrl) {
  if (canonicalUrl == null) throw "canonicalUrl cannot be null"
  var tab = sender.tab;
  console.log("got new canonicalUrl " + canonicalUrl);
  checkAndWork(function() {
    getBothStatus(function(tabStatus, sitestatus) {
      var status = tabStatus[tab.id];
      if (typeof(status) == 'undefined') {
        status = { enabled : true };
      }
      if (status.onAmpPage != null && status.onAmpPage && !isSimplifyEnabled(sitestatus, sender.url)) {
        console.log("switching to canonical url");
        working = false;
        chrome.tabs.update(tab.id, { url : canonicalUrl });
      } else {
        status.canonicalUrl = canonicalUrl;
        tabStatus[tab.id] = status;
        updatePageActionIcon(tab, status);
        setTabStatus(tabStatus, function() { working = false; });
      }
    });
  });
}

function handleAmpUrl(sender, ampUrl) {
  if (ampUrl == null) throw "ampUrl cannot be null"
  var tab = sender.tab;
  console.log("got new ampUrl " + ampUrl);
  checkAndWork(function() {
    getBothStatus(function(tabStatus, sitestatus) {
      var status = tabStatus[tab.id];
      if (typeof(status) == 'undefined') {
        status = {};
      }
      if (status.onAmpPage != null && !status.onAmpPage && isSimplifyEnabled(sitestatus, sender.url)) {
        console.log("switching to amp url");
        working = false;
        chrome.tabs.update(tab.id, { url : ampUrl });
      } else {
        status.ampUrl = ampUrl;
        tabStatus[tab.id] = status;
        updatePageActionIcon(tab, status);
        setTabStatus(tabStatus, function() { working = false });
      }
    });
  });
}

function handleClear(tabId) {
  console.log("got new clear " + tabId);
  checkAndWork(function() {
    getTabStatus(function(tabStatus) {
      tabStatus[tabId] = {};
      setTabStatus(tabStatus, function() { working = false });
    });
  });
}

function handleGetEnabled(sender, callback) {
  getSiteStatus(function(sitestatus) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      console.log("tabs url " + tabs[0].url);
      var domain = new URL(tabs[0].url).hostname;
      console.log("domain is " + domain);
      console.log(callback);
      callback((domain in sitestatus ? sitestatus[domain] : true) ? "Simplified view is Enabled" : "Simplified view is Disabled");
      console.log("callback is done");
    });
  });
}

function handleToggleEnabled(sender, callback) {
  getSiteStatus(function(sitestatus) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var domain = new URL(tabs[0].url).hostname;
      // flip domain enabled, or set to false if it's never been set
      sitestatus[domain] = (domain in sitestatus) ? !sitestatus[domain] : false;
      console.log("setting simplify enabled for " + domain + " to " + sitestatus[domain]);
      console.log(sitestatus);
      setSiteStatus(sitestatus, function() {
        // reload the page, which will force the proper loading to occur again
        console.log("reloading");
        chrome.tabs.reload(tabs[0].id);
      });
    });
  });
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.sentinel === undefined || message.sentinel != "__SIMPLIFYMESSAGE__") {
    return;
  }
  console.log("received action " + message.method + " with data " + message.data + " url " + sender.url);
  switch (message.method) {
    case "clear":
      handleClear(sender.tab.id);
      break;
    case "onAmpPage":
      handleOnAmpPage(sender, message.data);
      break;
    case "ampUrl":
      handleAmpUrl(sender, message.data);
      break;
    case "canonicalUrl":
      handleCanonicalUrl(sender, message.data);
      break;
    case "getEnabled":
      handleGetEnabled(sender, sendResponse);
      break;
    case "toggleEnabled":
      handleToggleEnabled(sender, sendResponse);
    default: 
      break;
  }
  console.log("completed action " + message.method);
});

//
/*chrome.pageAction.onClicked.addListener(function(tab) {
  getTabStatus(function(tabStatus) {
    var amp = tabStatus[tab.id];
    status.enabled = !status.enabled;
    tabStatus[tab.id] = amp;
    setTabStatus(tabStatus, function() {
      if (typeof(amp) !== 'undefined') {
        
        if (status.onAmpPage != null && status.onAmpPage) {
          // the current state is amp on - switch it to canonical
          if (status.canonicalUrl != null) {
            if (tab.url != status.canonicalUrl) {
              console.log("switching to canonical page");
              chrome.tabs.update(tab.id, { url : status.canonicalUrl });
            }
          }
        } else if (status.onAmpPage != null && !status.onAmpPage) {
          // current state is amp off - switch to amp on
          if (status.ampUrl != null) {
            if (tab.url != status.ampUrl) {
              console.log("switching to amp page");
              chrome.tabs.update(tab.id, { url : status.ampUrl });
            }
          }
        }
      } else {
        // missing amp state for this tab - bug?
      }
    });
  });
});*/
