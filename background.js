/*
Copyright 2016 Taylor Raack.

This file is part of PageAccel.

PageAccel is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

PageAccel is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with PageAccel.  If not, see <http://www.gnu.org/licenses/>.
 */

var working = false;
var publicSuffixList = this.publicSuffixList;
var thestorage = window.localStorage;

function logpa(message, tabId) {
  console.log(new Date().toISOString() + (tabId ? (" - tab " + tabId) : "") + " - " + message);
}

function getFromStorage(key, callback) {
  var item = JSON.parse(thestorage.getItem(key));
  callback(item != null ? item : {});
}

function getTabAndSiteStatus(callback) {
  var tabstatus = thestorage.getItem('tabstatus');
  if (tabstatus == null) tabstatus = '{}';
  var sitestatus = thestorage.getItem('sitestatus');
  if (sitestatus == null) sitestatus = '{}';
  callback(JSON.parse(tabstatus), JSON.parse(sitestatus));
}

function getTabStatus(callback) {
  getFromStorage('tabstatus', callback);
}

function getSiteStatus(callback) {
  getFromStorage('sitestatus', callback);
}

function setToStorage(key, value, callback) {
  thestorage.setItem(key, JSON.stringify(value));
  callback();
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
  logpa("updating page action icon; canonical: " + status.canonicalUrl + "; amp: " + status.ampUrl + "; on amp page: " + status.onAmpPage, tabId); 
  if (status.canonicalUrl != null && status.canonicalUrl != senderUrl && status.onAmpPage != null && status.onAmpPage) {
    logpa("canonical url is " + status.canonicalUrl + " and we are on an amp page", tabId)
    // we are currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : tabId, path : 'canonical.png' });
    chrome.pageAction.setTitle({ tabId : tabId, title : 'Show the Standard version of this page' });
    chrome.pageAction.show(tabId);
    logpa("setting to is on amp page icon", tabId);
  } else if (status.ampUrl != null && status.onAmpPage != null && !status.onAmpPage) {
    logpa("amp url is " + status.ampUrl + " and we are NOT on an amp page", tabId)
    // we are not currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : tabId, path : 'amplify.png' });
    chrome.pageAction.setTitle({ tabId : tabId, title : 'Show the accelerated version of this page' });
    chrome.pageAction.show(tabId);
    logpa("setting to is on canonical page icon", tabId);
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

function isSimplifyEnabled(tabId, thisTabStatus, sitestatus) {
  var domain = getMasterDomain(thisTabStatus);
  var enabled = domain in sitestatus ? sitestatus[domain] : true;
  logpa("simplify " + (enabled ? "enabled" : "disabled") + " for domain " + domain, tabId);
  return enabled;
}

chrome.webNavigation.onCommitted.addListener(function(data) {
  var thewindow = this;
  if (data.transitionQualifiers != 'forward_back') {
	// not a user click on forward or back; ignore
	return;
  }
  checkAndWork(function() {
    getTabStatus(function(tabStatus) {
      var status = data.tabId in tabStatus ? tabStatus[data.tabId] : {};
      var lastUrl = 'swithedurls' in status ? status['swithedurls'] : [];
      if (lastUrl.length > 0 && lastUrl[lastUrl.length-1] == data.url) {
        logpa("detected forward/backward change with previous url; assuming back button was clicked");
        lastUrl.pop();
        status['swithedurls'] = lastUrl;
        status['goback'] = true;
        status['pageaccelblock'] = true;
        logpa("blocking future changes", data.tabId);
        logpa("setting go back to true; lasturl was " + data.url, data.tabId);
        tabStatus[data.tabId] = status;
        setTabStatus(tabStatus, function() { working = false; });
      } else {
        working = false;
      }
    });
  });
  
  // do whatever else I need this specific tab in question to do
});

chrome.webNavigation.onCompleted.addListener(function(data) {
  // Fired when a document, including the resources it refers to, is completely loaded and initialized.
  // this means after all messages from html scanning that might send messages to alter pageaccel behavior
  checkAndWork(function() {
    getTabStatus(function(tabStatus) {
      var status = data.tabId in tabStatus ? tabStatus[data.tabId] : {};
      status['pageaccelblock'] = false;
      tabStatus[data.tabId] = status;
      setTabStatus(tabStatus, function() { working = false; });
    });
  });
});

function buildAmpUrl(status) {
  if (status.ampUrl.startsWith('//')) {
    return status['origin'].split("/")[0] + status.ampUrl;
  } else if (status.ampUrl.startsWith('/')) {
    return status['origin'] + status.ampUrl;
  } else {
    return status.ampUrl;
  }
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
  logpa("processing tab state", tabId);
  getTabAndSiteStatus(function(tabStatus, sitestatus) {
    var status = tabId in tabStatus ? tabStatus[tabId] : {};
    if (status.canonicalUrl != null && status.canonicalUrl != senderUrl && status.onAmpPage != null && status.onAmpPage && !isSimplifyEnabled(tabId, status, sitestatus)) {
      logpa("switching to canonical url", tabId);
      var lastUrl = 'swithedurls' in status ? status['swithedurls'] : [];
      if(lastUrl.length == 0 || lastUrl[lastUrl.length - 1] != senderUrl) {
        lastUrl.push(senderUrl);
      }
      status['swithedurls'] = lastUrl;
      // block other events from triggering duplicate url change events until end of load, which confuse chrome (it might just decide not to switch urls)
      status['pageaccelblock'] = true;
      tabStatus[tabId] = status;
      logpa("setting previous url to " + senderUrl, tabId);
      setTabStatus(tabStatus, function() {
        working = false;
        chrome.tabs.update(tabId, { url : status.canonicalUrl });
      });
    } else if (status.ampUrl != null && status.onAmpPage != null && !status.onAmpPage && isSimplifyEnabled(tabId, status, sitestatus)) {
      logpa("switching to amp url", tabId);
      var lastUrl = 'swithedurls' in status ? status['swithedurls'] : [];
      if(lastUrl.length == 0 || lastUrl[lastUrl.length - 1] != senderUrl) {
        lastUrl.push(senderUrl);
      }
      status['swithedurls'] = lastUrl;
      status['lastSwitchedUrl'] = senderUrl;
      // block other events from triggering duplicate url change events until end of load, which confuse chrome (it might just decide not to switch urls)
      status['pageaccelblock'] = true;
      tabStatus[tabId] = status;
      logpa("setting previous url to " + senderUrl, tabId);
      setTabStatus(tabStatus, function() {
        working = false;
        chrome.tabs.update(tabId, { url : buildAmpUrl(status) });
      });
    } else {
      updatePageActionIcon(tabId, senderUrl, status);
      working = false;
    }
  });
}

function handleUpdate(sender, key, value) {
  if (value == null) throw key + " cannot be null";
  logpa("got new " + key + ": " + value, sender.tab.id);
  checkAndWork(function() {
    getTabStatus(function(tabStatus) {
      var status = sender.tab.id in tabStatus ? tabStatus[sender.tab.id] : {};
      if (!('pageaccelblock' in status) || status['pageaccelblock'] == false) {
        status[key] = value;
        tabStatus[sender.tab.id] = status;
        setTabStatus(tabStatus, function() { processTabState(sender.tab.id, sender.url); });
      } else {
        logpa("forbidden from handling update by pageaccelblock", sender.tab.id);
        working = false;
      }
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

function handleClear(sender) {
  var tabId = sender.tab.id;
  logpa("got new clear", tabId);
  checkAndWork(function() {
    getTabStatus(function(tabStatus) {
      var status = tabId in tabStatus ? tabStatus[tabId] : {};
      var lasturl = 'swithedurls' in status ? status['swithedurls'] : [];
      var goback = 'goback' in status ? status['goback'] : false;
      if ('lastSwitchedUrl' in status && status['lastSwitchedUrl'] == sender.url) {
        // the last thing we did was switch from a canonical url, and now we've arrived back at that canonical url
        // so there must have been a redirect that brought us back
        // so let's not force another amp redirect
        logpa("likely redirect detected; not loading pageaccel for this page load", tabId);
        status['pageaccelblock'] = true;
      }
      var pageaccelblock = 'pageaccelblock' in status ? status['pageaccelblock'] : false;
      status = {'swithedurls' : lasturl, 'goback' : goback, 'pageaccelblock' : pageaccelblock, 'lastTabLoadTime' : Date.now()};
      tabStatus[tabId] = status;
      setTabStatus(tabStatus, function() { working = false });
    });
  });
}

function handleOrigin(tabId, origin) {
  checkAndWork(function() {
    getTabStatus(function(tabStatus) {
      var status = tabId in tabStatus ? tabStatus[tabId] : {};
      status['origin'] = origin;
      logpa('got new origin ' + origin, tabId);
      tabStatus[tabId] = status;
      setTabStatus(tabStatus, function() { working = false });
    });
  });
}

function handleGetBack(sender, callback) {
  var theurl = sender.url;
  checkAndWork(function() {
    getTabStatus(function(tabStatus) {
      var status = sender.tab.id in tabStatus ? tabStatus[sender.tab.id] : {};
      var oldGoBack = 'goback' in status ? status['goback'] : false;
      status['goback'] = false;
      tabStatus[sender.tab.id] = status;
      setTabStatus(tabStatus, function() {
        logpa("going back " + oldGoBack + " from " + theurl, sender.tab.id);
        callback(oldGoBack);
        working = false;
      });
    });
  });

  // must return true to indicate that callback is going to be called later, asynchronously
  return true;
}

function handleGetEnabled(sender, callback) {
  getTabAndSiteStatus(function(tabstatus, sitestatus) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var domain = getMasterDomain(tabstatus[tabs[0].id]);
      callback(domain in sitestatus ? sitestatus[domain] : true);
    });
  });
  // must return true to indicate that callback is going to be called later, asynchronously
  return true;
}

function getMasterDomain(thisTabStatus) {
  return publicSuffixList.getDomain(new URL(thisTabStatus.onAmpPage == true ? thisTabStatus.canonicalUrl : thisTabStatus.origin).hostname)
}

function handleToggleEnabled(sender, inputhostname, callback) {
  getTabAndSiteStatus(function(tabstatus, sitestatus) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var masterDomain = inputhostname != null ? publicSuffixList.getDomain(new URL(inputhostname).hostname) : getMasterDomain(tabstatus[tabs[0].id]);

      // flip domain enabled, or set to false if it's never been set
      sitestatus[masterDomain] = (masterDomain in sitestatus) ? !sitestatus[masterDomain] : false;
      logpa("setting simplify enabled for " + masterDomain + " to " + sitestatus[masterDomain], tabs[0].id);

      setSiteStatus(sitestatus, inputhostname != null ? callback : function() {
        // reload the page, which will force the proper loading to occur again
        logpa("reloading", tabs[0].id);
        chrome.tabs.reload(tabs[0].id);
      });
    });
  });
  return inputhostname != null;
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.sentinel === undefined || message.sentinel != "__SIMPLIFYMESSAGE__") {
    return;
  }
  var tabId = sender.tab != null ? sender.tab.id : null;
  logpa("received action " + message.method + " with data " + message.data + " url " + sender.url, tabId);
  var response = false;
  switch (message.method) {
    case "clear":
      handleClear(sender);
      break;
    case "origin":
      handleOrigin(sender.tab.id, message.data);
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
    case "getBack":
      response = handleGetBack(sender, sendResponse);
      break;
    case "toggleEnabled":
      response = handleToggleEnabled(sender, message.data, sendResponse);
    default: 
      break;
  }
  logpa("completed action " + message.method, tabId);
  return response;
});

var uninstallTimer = null;
var uninstallUrlBase = "http://pageaccel.raack.info/uninstall_survey"
  
function updateUninstallUrl() {
  getFromStorage('installTime', function(item) {
    logpa("updating install url");
    chrome.runtime.setUninstallURL(uninstallUrlBase + "?installed_for=" + (Date.now() - ('time' in item ? item['time'] : Date.now())));
  });
}

updateUninstallUrl();

function showSplashScreenOnFirstRun() {
  getFromStorage('tutorialShown', function(item) {
    if (!('shown' in item)) {
      chrome.tabs.create({
        url: chrome.extension.getURL("firstRun2.html")
      });
      setToStorage('tutorialShown', {'shown':true}, function() {});
    }
  });
}

function setUpInstallUninstallActions() {
  getFromStorage('installTime', function(item) {
    if (!('time' in item)) {
      setToStorage('installTime', {'time':Date.now()}, function() {})
    }
  })
  if(uninstallTimer == null) {
    // update uninstall URL every 5 minutes
    uninstallTimer = setInterval(updateUninstallUrl, 60 * 1000);
  }
}

primePublicSuffixList();

setUpInstallUninstallActions();
showSplashScreenOnFirstRun();
