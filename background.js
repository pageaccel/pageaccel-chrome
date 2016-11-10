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

function getAmpTabs(callback) {
  chrome.storage.local.get('amptabs', function(items) { callback(items['amptabs']); });
}

function setAmpTabs(ampTabs, callback) {
  chrome.storage.local.set({ 'amptabs' : ampTabs }, callback);
}

// excuted when amplified.js sends message
chrome.runtime.onMessage.addListener(function(amp, sender, sendResponse) {
  if (amp.sentinel === undefined || amp.sentinel != "__AMPLIFIER__") {
    return; // not from amplifier
  }
  if (amp.isamp) {
    // we are currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : sender.tab.id, path : 'canonical.png' });
    chrome.pageAction.setTitle({ tabId : sender.tab.id, title : 'Show the Canonical version of this page' });
  } else {
    // we are not currently viewing an amp page
    chrome.pageAction.setIcon({ tabId : sender.tab.id, path : 'amplify.png' });
    chrome.pageAction.setTitle({ tabId : sender.tab.id, title : 'Show the AMP version of this page' });
  }
  if (amp.ampurl !== null || (amp.canonical != null && amp.isamp)) {
    // there is an amp url or (there is a canonical url and we're currently on
    // an amp version)
    chrome.pageAction.show(sender.tab.id);
  }
  getAmpTabs(function(ampTabs) {
    // record the page state
    if (sender.tab.id in ampTabs) {
      ampTabs[sender.tab.id].ampurl = amp.ampurl;
      ampTabs[sender.tab.id].canonical = amp.canonical;
      ampTabs[sender.tab.id].isamp = amp.isamp;

    } else {
      ampTabs[sender.tab.id] = amp;
    }
    setAmpTabs(ampTabs, function() {
      // if amplifer is turned on for this tab, and there is an amp page, and
      // we're not on it, load it up
      if (ampTabs[sender.tab.id].amplifierOn && !amp.isamp && amp.ampurl != null) {
        chrome.tabs.update(sender.tab.id, { url : amp.ampurl });
      } else if (!amp.amplifierOn && amp.isamp && amp.canonicalurl != null) {
        chrome.tabs.update(sender.tab.id, { url : amp.canonicalurl });
      }
    });

    if (localStorage["devMode"] == "true") {
      amp.ampurl += "#development=1";
    }
  });
});

//
chrome.pageAction.onClicked.addListener(function(tab) {
  getAmpTabs(function(ampTabs) {
    var amp = ampTabs[tab.id];
    if (typeof amp !== 'undefined') {
      if (amp.isamp) {
        // the current state is amp on - switch it to canonical
        if (amp.canonical != null) {
          ampTabs[tab.id].amplifierOn = false;
          setAmpTabs(ampTabs, function() {
            chrome.tabs.update(tab.id, { url : amp.canonical });
          });
        }
      } else {
        // current state is amp off - switch to amp on
        ampTabs[tab.id].amplifierOn = true;
        setAmpTabs(ampTabs, function() {
          chrome.tabs.update(tab.id, { url : amp.ampurl });
        });
      }
    } else {
      // missing amp state for this tab - bug?
    }
  });
});
