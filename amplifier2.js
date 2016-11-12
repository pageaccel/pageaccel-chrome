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
  sentinel: "__AMPMESSAGE__",
  method: "clear"
});

// look for amp header
chrome.runtime.sendMessage({
  sentinel: "__AMPMESSAGE__",
  method: "onAmpPage",
  data: document.documentElement.hasAttribute('amp') || document.documentElement.hasAttribute('⚡')
});

// look for new canonical and amp urls
createMutationObserver(document.documentElement, "HEAD", function (headTag) {
  createMutationObserver(headTag, "LINK", function (linkTag) {
    if (linkTag.getAttribute('rel').toLowerCase() === 'amphtml') {
      chrome.runtime.sendMessage({ sentinel: "__AMPMESSAGE__", method: "ampUrl", data: linkTag.getAttribute("href") });
    } else if (linkTag.getAttribute('rel').toLowerCase() === 'canonical') {
      chrome.runtime.sendMessage({ sentinel: "__AMPMESSAGE__", method: "canonicalUrl", data: linkTag.getAttribute("href") });
    }
    return false;
  });
  
  return true;
});
