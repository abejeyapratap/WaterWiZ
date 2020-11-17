"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var SuppliersDOM;
(function (SuppliersDOM) {
    function element(tagName, children, attributes) {
        if (children === void 0) { children = []; }
        if (attributes === void 0) { attributes = {}; }
        var element = document.createElement(tagName);
        if (!Array.isArray(children))
            children = [children];
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var child = children_1[_i];
            if (typeof child === "string")
                element.appendChild(document.createTextNode(child));
            else
                element.appendChild(child);
        }
        for (var key in attributes) {
            element.setAttribute(key, attributes[key]);
        }
        return element;
    }
    SuppliersDOM.element = element;
    function makeHeading(_a) {
        var name = _a.name, id = _a.id;
        return element("div", [
            element("h1", name, { id: id }),
            element("hr")
        ], {
            id: "supplier-heading"
        });
    }
    SuppliersDOM.makeHeading = makeHeading;
    function makeSystem(_a) {
        var name = _a.name, waterStatus = _a.waterStatus, description = _a.description, stats = _a.stats;
        return element("div", [
            element("h3", name, { class: "system-name" }),
            element("p", description, { class: "system-description" }),
            element("p", [
                element("strong", "Water Status: "),
                waterStatus
            ], { class: "water-status" }),
            element("div", [
                element("div", [], __assign({ name: "chart" }, stats.reduce(function (collector, stat, index) { return (collector["stat-" + index] = stat.toString(), collector); }, {})))
            ])
        ], {
            class: "system-container"
        });
    }
    SuppliersDOM.makeSystem = makeSystem;
    function makeSystems(systems) {
        return element("div", systems.map(function (system) { return makeSystem(system); }), {
            class: "systems-container"
        });
    }
    SuppliersDOM.makeSystems = makeSystems;
    function makeCounty(_a) {
        var id = _a.id, name = _a.name, systems = _a.systems;
        return element("div", [
            element("h2", name, { id: id }),
            makeSystems(systems)
        ], {
            class: "county-container"
        });
    }
    SuppliersDOM.makeCounty = makeCounty;
    function makeCounties(counties) {
        return element("div", counties.map(function (c) { return makeCounty(c); }), {
            class: "counties-container"
        });
    }
    SuppliersDOM.makeCounties = makeCounties;
})(SuppliersDOM || (SuppliersDOM = {}));
var SuppliersCharting;
(function (SuppliersCharting) {
    var element = SuppliersDOM.element;
    var definitions = [];
    function loadStatisticDefinitions(cb) {
        var chartsLoaded = false;
        var statsLoaded = false;
        google.charts.load("current", { packages: ["bar"] });
        google.charts.setOnLoadCallback(function () {
            if (statsLoaded && cb)
                cb();
            chartsLoaded = true;
        });
        $.getJSON("/api/stats-definitions.json", function (data) {
            definitions = data.stats;
            if (chartsLoaded && cb)
                cb();
            statsLoaded = true;
        });
    }
    SuppliersCharting.loadStatisticDefinitions = loadStatisticDefinitions;
    function setupChart(chart) {
        var stats = [];
        var charts = [];
        for (var attributeIndex in chart.attributes) {
            var attribute = chart.attributes[attributeIndex];
            var attributeName = attribute.name;
            if (!attributeName)
                continue;
            if (attributeName.slice(0, 5) !== "stat-")
                continue;
            var index = +attributeName.split("-")[1];
            if (isNaN(index))
                continue;
            var value = +attribute.value;
            if (isNaN(value))
                continue;
            stats[index] = value;
        }
        stats.forEach(function (stat, index) {
            var definition = definitions[index];
            if (!definition)
                return;
            var data = google.visualization.arrayToDataTable([
                ["", "Normal", "Actual"],
                [" ", definition.safeRange[1], stat]
            ]);
            var chartContainer = document.createElement("div");
            var container = element("div", [
                element("span", definition.name, { class: "stat-name" }),
                chartContainer
            ], { class: "stat-container" });
            chart.appendChild(container);
            var gChart = new google.charts.Bar(chartContainer);
            charts.push([gChart, [data, {
                        bars: "horizontal",
                        height: 50,
                        legend: "none",
                        tooltip: {
                            textStyle: {
                                fontSize: 12
                            }
                        },
                        allowAsync: true
                    }]]);
        });
        return charts;
    }
    SuppliersCharting.setupChart = setupChart;
})(SuppliersCharting || (SuppliersCharting = {}));
var SupplierPage = /** @class */ (function () {
    function SupplierPage() {
        this.storage = {};
    }
    SupplierPage.prototype.init = function () {
        if (!this.supplier)
            return;
        this.main.appendChild(SuppliersDOM.makeHeading(this.supplier));
        this.main.appendChild(SuppliersDOM.makeCounties(this.supplier.counties));
        var charts = this.main.querySelectorAll("[name=chart]");
        var chartPartials = Array.prototype.map.call(charts, function (chart) { return SuppliersCharting.setupChart(chart); });
        var _loop_1 = function (someCharts) {
            requestAnimationFrame(function () {
                for (var _i = 0, someCharts_1 = someCharts; _i < someCharts_1.length; _i++) {
                    var _a = someCharts_1[_i], chart = _a[0], _b = _a[1], opt1 = _b[0], opt2 = _b[1];
                    chart.draw(opt1, opt2);
                }
            });
        };
        for (var _i = 0, chartPartials_1 = chartPartials; _i < chartPartials_1.length; _i++) {
            var someCharts = chartPartials_1[_i];
            _loop_1(someCharts);
        }
        console.log("told them to do it");
    };
    SupplierPage.prototype.element = function (selector) {
        return document.querySelector(selector);
    };
    Object.defineProperty(SupplierPage.prototype, "main", {
        get: function () {
            return this.storage.main || (this.storage.main = this.element("main#main-content"));
        },
        enumerable: false,
        configurable: true
    });
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
    function completed() {
        var page = new SupplierPage();
        page.init();
    }
    var loadedDefs = false, loadedSuppliers = false;
    SuppliersCharting.loadStatisticDefinitions(function () {
        if (loadedSuppliers)
            completed();
        loadedDefs = true;
    });
    SuppliersCore.loadSuppliers(function () {
        if (loadedDefs)
            completed();
        loadedSuppliers = true;
    });
});
