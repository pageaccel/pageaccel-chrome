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

document.addEventListener('DOMContentLoaded', function() {
  chrome.runtime.sendMessage({ sentinel: "__SIMPLIFYMESSAGE__", method: "getEnabled"}, function(enabled) {
    if (enabled) {
      document.getElementById('statusText').className = "enabled";
      document.getElementById('statusText').innerHTML = "Status: Enabled";
      document.getElementById('enabledStatus').innerHTML = "Click to disable on this site";
    } else {
      document.getElementById('statusText').className = "disabled";
      document.getElementById('statusText').innerHTML = "Status: Disabled";
      document.getElementById('enabledStatus').innerHTML = "Click to enable on this site";
    }
  });
  document.getElementById('enabledStatus').addEventListener('click', function() {
    chrome.runtime.sendMessage({ sentinel: "__SIMPLIFYMESSAGE__", method: "toggleEnabled"});
    setTimeout(function() {window.close()}, 250);
  });
  document.getElementById('moreinfo').addEventListener('click', function(event){
    event.preventDefault();
    chrome.tabs.create({url: event.currentTarget.href });
  });
  document.getElementById('help').addEventListener('click', function(event){
    event.preventDefault();
    chrome.tabs.create({url: event.currentTarget.href });
  });
});
