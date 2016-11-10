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

(function() {
    var amplink = document.querySelector("link[rel='amphtml']");
    var canonical = document.querySelector("link[rel='canonical']");
    
    var  amp = {
        sentinel: "__AMPLIFIER__",
        ampurl : null,
        canonical : null,
        amplifierOn: true,
        isamp : (document.querySelector("html[amp]") !== null ||  document.querySelector("html[⚡]") !== null)
    };

    if (amplink !== null) {
        amp.ampurl = amplink.href;
        
    }
    if (canonical !== null) {
        amp.canonical = canonical.href;
    }
   
    // send information about the current page to the processor
    chrome.runtime.sendMessage(amp);

})();