"use strict";
var SuppliersCore;
(function (SuppliersCore) {
    SuppliersCore.suppliers = {};
    /**
     * URL: /suppliers/:supplier/:county
     */
    var components = location.pathname.split("/").filter(function (s) { return s; });
    /**
     * Loads all suppliers from the JSON API
     * @param callback completion function, if any
     */
    function loadSuppliers(callback) {
        $.getJSON('/api/stats.json', function (data) {
            for (var _i = 0, _a = data.suppliers; _i < _a.length; _i++) {
                var supplier = _a[_i];
                SuppliersCore.suppliers[supplier.id] = supplier;
            }
            if (callback)
                callback();
        });
    }
    SuppliersCore.loadSuppliers = loadSuppliers;
    SuppliersCore.supplierID = components[1];
    SuppliersCore.countyID = null;
    /**
     * Returns the supplier for the current page
     */
    function getSupplier() {
        return SuppliersCore.suppliers[SuppliersCore.supplierID] || null;
    }
    SuppliersCore.getSupplier = getSupplier;
    /**
     * Returns the county for the current page
     */
    function getCounty() {
        var supplier = getSupplier();
        if (!supplier)
            return null;
        return supplier.counties.filter(function (county) { return county.id === SuppliersCore.countyID; })[0] || null;
    }
    SuppliersCore.getCounty = getCounty;
})(SuppliersCore || (SuppliersCore = {}));
var SupplierPage = /** @class */ (function () {
    function SupplierPage() {
    }
    SupplierPage.prototype.init = function () {
        console.log(this.supplier);
    };
    Object.defineProperty(SupplierPage.prototype, "supplier", {
        get: function () {
            return SuppliersCore.getSupplier();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SupplierPage.prototype, "county", {
        get: function () {
            return SuppliersCore.getCounty();
        },
        enumerable: false,
        configurable: true
    });
    return SupplierPage;
}());
$(function () {
    SuppliersCore.loadSuppliers(function () {
        var page = new SupplierPage();
        page.init();
    });
});
