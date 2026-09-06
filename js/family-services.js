"use strict";
/* Family-owned education data boundary. The standalone provider uses the
   existing Store. A future authenticated website can supply a hydrated
   provider without moving world saves or rewriting the learning scheduler.
   No URL/postMessage/import payload can install a provider or grant credits. */
var FamilyServices = (function () {
  var names=["assignmentsFor","curriculum","allCurricula","nudgeMinutes","promotionSnoozedAt"];
  var local={};
  names.forEach(function(name){local[name]=function(){return Store[name].apply(Store,arguments);};});
  var provider=local;
  function useProvider(next) {
    if(!next || !names.every(function(n){return typeof next[n]==="function";}))throw new Error("Incomplete family provider");
    provider=next;
  }
  var api={useProvider:useProvider,useLocal:function(){provider=local;},
    // Stable student id links an existing Lumen save to a shared student.
    studentId:function(){return Store.profile && (Store.profile.studentId||Store.profile.id);}};
  names.forEach(function(name){api[name]=function(){return provider[name].apply(provider,arguments);};});
  return api;
})();
