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

var working = false;
var publicSuffixList = this.publicSuffixList;

function getFromStorage(item, callback) {
  chrome.storage.local.get(item, function(items) { callback(item in items ? items[item] : {}); });
}

function getTabAndSiteStatus(callback) {
  chrome.storage.local.get(['tabstatus','sitestatus'], function(items) { callback('tabstatus' in items ? items['tabstatus'] : {}, 'sitestatus' in items ? items['sitestatus'] : {}); });
}

function getTabStatus(callback) {
  getFromStorage('tabstatus', callback);
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

function primePublicSuffixList() {
  publicSuffixList.parse("com", punycode.toASCII)
}

function updatePageActionIcon(tabId, senderUrl, status) {
  console.log("updating page action icon; canonical: " + status.canonicalUrl + "; amp: " + status.ampUrl + "; on amp page: " + status.onAmpPage); 
  if (status.canonicalUrl != null && status.canonicalUrl != senderUrl && status.onAmpPage != null && status.onAmpPage) {
    console.log("canonical url is " + status.canonicalUrl + " and we are on an amp page")
    // we are currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : tabId, path : 'canonical.png' });
    chrome.pageAction.setTitle({ tabId : tabId, title : 'Show the Standard version of this page' });
    chrome.pageAction.show(tabId);
    console.log("setting to is on amp page icon");
  } else if (status.ampUrl != null && status.onAmpPage != null && !status.onAmpPage && !isAmpBlacklisted(status.ampUrl)) {
    console.log("amp url is " + status.ampUrl + " and we are NOT on an amp page")
    // we are not currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : tabId, path : 'amplify.png' });
    chrome.pageAction.setTitle({ tabId : tabId, title : 'Show the Simplified version of this page' });
    chrome.pageAction.show(tabId);
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
  var hostname = new URL(url).hostname;
  var domain = publicSuffixList.getDomain(hostname);
  var enabled = domain in sitestatus ? sitestatus[domain] : true;
  console.log("simplify " + (enabled ? "enabled" : "disabled") + " for domain " + domain);
  return enabled;
}

var blacklistedDomains = new Set();
blacklistedDomains.add("nytimes.com");

function isAmpBlacklisted(url) {
  // some websites' amp pages 302 redirect back to the canonical page automatically (such as mobile.nytimes.com when using a desktop browser user agent)
  // i experimented with modifying the user agent header to a mobile header for those requests, but chrome disallows header manipulation from "event pages" (this type of extension)
  // so we're going to blacklist some urls here so we don't attempt to AMP load them.
  var hostname = new URL(url).hostname;
  var domain = publicSuffixList.getDomain(hostname);
  return blacklistedDomains.has(domain);
}

/*
 * AMP document discovery (https://www.ampproject.org/docs/reference/spec#amp-document-discovery)
 * 
 * If an AMP document exists which is an alternative representation of a canonical document, then the canonical document should point to the AMP document via a link tag with the relation "amphtml".
 * for example: <link rel="amphtml" href="https://www.example.com/url/to/amp/document.html">
 * 
 * The AMP document itself is expected to point back to its canonical document document via a link tag with the relation "canonical".
 * for example: <link rel="canonical" href="https://www.example.com/url/to/canonical/document.html">
 * 
 * If a single resource is simultaneously the AMP and the canonical document, the canonical relation should point to itself--no "amphtml" relation is required.
 */

function processTabState(tabId, senderUrl) {
  console.log("processing tab state");
  getTabAndSiteStatus(function(tabStatus, sitestatus) {
    var status = tabId in tabStatus ? tabStatus[tabId] : {};
    if (status.canonicalUrl != null && status.canonicalUrl != senderUrl && status.onAmpPage != null && status.onAmpPage && !isSimplifyEnabled(sitestatus, senderUrl)) {
      console.log("switching to canonical url")
      working = false;
      chrome.tabs.update(tabId, { url : status.canonicalUrl });
    } else if (status.ampUrl != null && status.onAmpPage != null && !status.onAmpPage && isSimplifyEnabled(sitestatus, senderUrl) && !isAmpBlacklisted(status.ampUrl)) {
      console.log("switching to amp url")
      working = false;
      chrome.tabs.update(tabId, { url : status.ampUrl });
    } else {
      updatePageActionIcon(tabId, senderUrl, status);
      working = false;
    }
  });
}

function handleUpdate(sender, key, value) {
  if (value == null) throw key + " cannot be null";
  console.log("got new " + key + ": " + value);
  checkAndWork(function() {
    getTabStatus(function(tabStatus) {
      var status = sender.tab.id in tabStatus ? tabStatus[sender.tab.id] : {};
      status[key] = value;
      tabStatus[sender.tab.id] = status;
      setTabStatus(tabStatus, function() { processTabState(sender.tab.id, sender.url); });
    });
  });
}

function handleOnAmpPage(sender, onAmpPage) {
  handleUpdate(sender, 'onAmpPage', onAmpPage);
}

function handleCanonicalUrl(sender, canonicalUrl) {
  handleUpdate(sender, 'canonicalUrl', canonicalUrl);
}

function handleAmpUrl(sender, ampUrl) {
  handleUpdate(sender, 'ampUrl', ampUrl);
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
      var hostname = new URL(tabs[0].url).hostname;
      var domain = publicSuffixList.getDomain(hostname);
      callback((domain in sitestatus ? sitestatus[domain] : true) ? "Simplified view is Enabled" : "Simplified view is Disabled");
    });
  });
  // must return true to indicate that callback is going to be called later, asynchronously
  return true;
}

function handleToggleEnabled(sender, callback) {
  getSiteStatus(function(sitestatus) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var hostname = new URL(tabs[0].url).hostname;
      var domain = publicSuffixList.getDomain(hostname);
      // flip domain enabled, or set to false if it's never been set
      sitestatus[domain] = (domain in sitestatus) ? !sitestatus[domain] : false;
      console.log("setting simplify enabled for " + domain + " to " + sitestatus[domain]);
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
  var response = false;
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
      response = handleGetEnabled(sender, sendResponse);
      break;
    case "toggleEnabled":
      handleToggleEnabled(sender, sendResponse);
    default: 
      break;
  }
  console.log("completed action " + message.method);
  return response;
});

primePublicSuffixList();
