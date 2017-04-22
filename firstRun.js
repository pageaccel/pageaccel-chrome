/*
Copyright 2016,2017 Taylor Raack <taylor@raack.info>.

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

$( document ).ready(function() {
  $('#starttutorial').click(function() {
    $('#start').addClass("hidden");
    $('#instructions1').removeClass("hidden");
  });

  $("#shownopageaccelpage").click(function() {
    chrome.runtime.sendMessage({ sentinel: "__SIMPLIFYMESSAGE__", method: "toggleEnabled", data: "http://www.foodnetwork.com/"}, function() {
      window.open("http://www.foodnetwork.com/recipes/tyler-florence/spaghetti-alla-carbonara-recipe.html");
      $('#instructions1').addClass("hidden");
      $('#instructions2').removeClass("hidden");
    });
  });

  $("#showpageaccelpage").click(function() {
    chrome.runtime.sendMessage({ sentinel: "__SIMPLIFYMESSAGE__", method: "toggleEnabled", data: "http://www.foodnetwork.com/"}, function() {
      window.open("http://www.foodnetwork.com/recipes/tyler-florence/spaghetti-alla-carbonara-recipe.html");
      $('#instructions2').addClass("hidden");
      $('#instructions3').removeClass("hidden");
    });
  });

  $("#promptForNavigation").click(function() {
    chrome.permissions.request({permissions: ['notifications']}, function(granted) {
      if (granted) {
        window.close();
      }
    });
  });
});
