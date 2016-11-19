/*
Copyright 2016 Taylor Raack <taylor@raack.info>.

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

var observerConfiguration = { childList: true, subtree: true };

function createMutationObserver(baseElement, childTag, callback) {
  var mutationObserver = new MutationObserver(function(mutations, observer) {
    mutations.forEach(function(mutation) {
      for (var i = 0; i < mutation.addedNodes.length; i++) {
        if (mutation.addedNodes[i].tagName === childTag && callback(mutation.addedNodes[i])) {
         observer.disconnect();
        }
      }
    });
  });
  mutationObserver.observe(baseElement, observerConfiguration);
}

// clear out canonical and amp urls
chrome.runtime.sendMessage({
  sentinel: "__SIMPLIFYMESSAGE__",
  method: "clear"
});

// look for amp header
chrome.runtime.sendMessage({
  sentinel: "__SIMPLIFYMESSAGE__",
  method: "onAmpPage",
  data: document.documentElement.hasAttribute('amp') || document.documentElement.hasAttribute('⚡')
});

// look for new canonical and amp urls
createMutationObserver(document.documentElement, "HEAD", function (headTag) {
  var node = headTag.querySelector('link[rel="amphtml"]');
  if(node) {
    chrome.runtime.sendMessage({ sentinel: "__SIMPLIFYMESSAGE__", method: "ampUrl", data: node.getAttribute("href") });
  }
  node = headTag.querySelector('link[rel="canonical"]');
  if(node) {
    chrome.runtime.sendMessage({ sentinel: "__SIMPLIFYMESSAGE__", method: "canonicalUrl", data: node.getAttribute("href") });
  }
  createMutationObserver(headTag, "LINK", function (linkTag) {
    if (linkTag.getAttribute('rel').toLowerCase() === 'amphtml') {
      chrome.runtime.sendMessage({ sentinel: "__SIMPLIFYMESSAGE__", method: "ampUrl", data: linkTag.getAttribute("href") });
    } else if (linkTag.getAttribute('rel').toLowerCase() === 'canonical') {
      chrome.runtime.sendMessage({ sentinel: "__SIMPLIFYMESSAGE__", method: "canonicalUrl", data: linkTag.getAttribute("href") });
    }
    return false;
  });
  
  return true;
});
