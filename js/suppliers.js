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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var NORMAL = "#377E22";
var DANGER = "#C90C06";
var SAFE = "#2962A5";
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
            else if (child instanceof HTMLElement)
                element.appendChild(child);
            else if ("html" in child && "tag" in child) {
                var newElement = document.createElement(child.tag);
                newElement.innerHTML = child.html;
                element.appendChild(newElement);
            }
            else if ("text" in child)
                element.appendChild(document.createTextNode(child.text));
        }
        for (var key in attributes) {
            element.setAttribute(key, attributes[key]);
        }
        return element;
    }
    SuppliersDOM.element = element;
    function makeHeading(_a) {
        var name = _a.name, logo = _a.logo, id = _a.id;
        return element("div", [
            logo ? element("img", [], { id: id, src: logo }) : element("h1", name, { id: id })
        ], {
            id: "supplier-heading"
        });
    }
    SuppliersDOM.makeHeading = makeHeading;
    function makeSystem(_a) {
        var name = _a.name, reportLink = _a.reportLink, waterStatus = _a.waterStatus, waterSource = _a.waterSource, description = _a.description, stats = _a.stats;
        return element("div", __spreadArrays([
            element("div", __spreadArrays([
                element("h3", name, { class: "system-name", id: name.toLowerCase().split(" ").join("-") }),
                element("p", [
                    element("strong", "Areas Served: "),
                    description
                ], { class: "system-description" })
            ], (waterSource ? [
                element("p", [
                    element("strong", "Water Source: "),
                    waterSource
                ], { class: "water-source" })
            ] : []), [
                element("p", [
                    element("strong", "Water Status: "),
                    waterStatus
                ], { class: "water-status" })
            ]), { class: "system-info" }),
            element("div", [
                element("ul", [
                    ["Ideal", NORMAL],
                    ["Safe", SAFE],
                    ["Critical", DANGER]
                ].map(function (_a) {
                    var label = _a[0], color = _a[1];
                    return (element("li", label, { class: "legend-item", style: "--legend-color: " + color }));
                }), { class: "color-legend" }),
                element("div", [], __assign({ name: "chart" }, stats.reduce(function (collector, stat, index) { return (collector["stat-" + index] = stat.toString(), collector); }, {})))
            ], { class: "chart-container" })
        ], reportLink ? [element("div", [
                element("p", "EPA: Environmental Protection Agency"),
                element("a", "Click here to see the detailed water quality report", { href: reportLink })
            ], { class: "source-container" })] : []), {
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
    SuppliersCharting.definitions = [];
    function loadStatisticDefinitions(cb) {
        var chartsLoaded = false;
        var statsLoaded = false;
        google.charts.load("current", { packages: ["corechart"] });
        google.charts.setOnLoadCallback(function () {
            if (statsLoaded && cb)
                cb();
            chartsLoaded = true;
        });
        $.getJSON("/api/stats-definitions.json", function (data) {
            SuppliersCharting.definitions = data.stats;
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
            var definition = SuppliersCharting.definitions[index];
            if (!definition)
                return;
            if (stat < 0)
                return;
            var dataTable = new google.visualization.DataTable();
            dataTable.addColumn("string", "");
            dataTable.addColumn("number", "");
            dataTable.addColumn("number", "");
            dataTable.addColumn("number", "");
            dataTable.addColumn("number", "");
            dataTable.addColumn({ type: "string", role: "tooltip" });
            dataTable.addColumn({ role: "style" });
            if (definition.safeRange)
                dataTable.addRows([
                    ["EPA Standard", definition.safeRange[0], definition.safeRange[0], definition.safeRange[1], definition.safeRange[1], definition.safeRange[0] + " - " + definition.safeRange[1] + " " + definition.unit, NORMAL],
                ]);
            var isDangerous = definition.safeRange ? (stat < definition.safeRange[0] || stat > definition.safeRange[1]) : false;
            var color = isDangerous ? DANGER : SAFE;
            dataTable.addRows([
                ["Actual", 0, 0, stat, stat, stat + " " + definition.unit, color]
            ]);
            // const data = google.visualization.arrayToDataTable([
            //     ["", "Normal", "Actual"],
            //     [" ", definition.safeRange[1], stat]
            // ]);
            var chartContainer = document.createElement("div");
            var container = element("div", [
                // element("span", definition.name, { class: "stat-name" }),
                element("div", [
                    element("h4", definition.name, { class: "stat-name" }),
                ], { class: "stat-info" }),
                chartContainer
            ], __assign({ class: "stat-container", name: "stat-" + definition.name }, (isDangerous ? { dangerous: "dangerous" } : {})));
            chart.appendChild(container);
            var gChart = new google.visualization.CandlestickChart(chartContainer);
            charts.push([gChart, [dataTable, {
                        orientation: "vertical",
                        theme: "material",
                        height: 110,
                        chartArea: {
                            left: 90
                        },
                        legend: {
                            position: "none",
                        },
                        hAxis: {
                            minValue: 0,
                            maxValue: definition.range[1],
                            ticks: definition.ticks || [0]
                        },
                        tooltip: {
                            style: {
                                pointerEvents: 'none'
                            }
                        },
                        focusTarget: "category",
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
        var allSystems = this.supplier.counties.reduce(function (a, c) { return a.concat(c.systems); }, []);
        var element = SuppliersDOM.element;
        this.main.appendChild(element("div", allSystems.map(function (_a) {
            var name = _a.name;
            return element("a", name, { href: "#" + name.toLowerCase().split(" ").join("-") });
        }), { class: "system-link-container" }));
        this.main.appendChild(SuppliersDOM.makeCounties(this.supplier.counties));
        var charts = this.main.querySelectorAll("[name=chart]");
        var chartPartials = Array.prototype.map.call(charts, function (chart) { return SuppliersCharting.setupChart(chart); });
        var adjustWidth = function () {
            var newWidth;
            var vw = $(window).width();
            if (vw < 1000) {
                if (vw < 700) {
                    newWidth = vw - 100;
                }
                else {
                    newWidth = vw - 300;
                }
            }
            else {
                newWidth = (vw / 2) - 200;
            }
            console.log(newWidth);
            chartPartials.forEach(function (charts) { return charts.forEach(function (opts) { return opts[1][1].width = newWidth; }); });
        };
        var pendingResize;
        var draw = function () {
            adjustWidth();
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
            pendingResize = undefined;
        };
        draw();
        $(window).on("resize", function () {
            if (!pendingResize)
                setTimeout(draw, 100);
        });
        setTimeout(function () {
            SuppliersCharting.definitions.forEach(function (definition, index) {
                var baseSelector = "[name=\"stat-" + definition.name + "\"]";
                tippy(baseSelector + " > div:not(.stat-info)", {
                    content: definition.description,
                    allowHTML: true,
                    placement: (index % 2 === 0) ? "left" : "right"
                });
                tippy(baseSelector + "[dangerous]", {
                    content: "This plant's " + definition.name + " level is outside of EPA standards!",
                    theme: "dangerous",
                    placement: "bottom"
                });
            });
        }, 1000);
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
