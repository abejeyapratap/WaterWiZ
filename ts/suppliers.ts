declare const $: JQueryStatic;

interface WaterSystem {
    name: string;
    waterStatus: string;
    waterSource: string;
    description: string;
    reportLink?: string;
    stats: number[];
}

interface County {
    name: string;
    id: string;
    systems: WaterSystem[];
}

interface Supplier {
    id: string;
    logo: string;
    name: string;
    counties: County[];
}

interface SuppliersRoot {
    suppliers: Supplier[];
}

const NORMAL = "#377E22";
const DANGER = "#C90C06";
const SAFE = "#2962A5";

namespace SuppliersCore {
    export const suppliers: Record<string, Supplier> = {};

    /**
     * URL: /suppliers/:supplier/:county
     */
    const components: string[] = location.pathname.split("/").filter(s => s);

    /**
     * Loads all suppliers from the JSON API
     * @param callback completion function, if any
     */
    export function loadSuppliers(callback?: () => void) {
        $.getJSON('/api/stats.json', (data: SuppliersRoot) => {
            for (let supplier of data.suppliers) {
                suppliers[supplier.id] = supplier;
            }

            if (callback) callback();
        });
    }

    export const supplierID = components[1];
    export const countyID: string | null = null;

    /**
     * Returns the supplier for the current page
     */
    export function getSupplier(): Supplier | null {
        return suppliers[supplierID] || null;
    }

    /**
     * Returns the county for the current page
     */
    export function getCounty(): County | null {
        const supplier = getSupplier();
        if (!supplier) return null;

        return supplier.counties.filter(county => county.id === countyID)[0] || null;
    }
}

namespace SuppliersDOM {
    type Child = HTMLElement | string | { html: string, tag: string } | { text: string };

    export function element(tagName: Parameters<typeof document["createElement"]>[0], children: Child | Child[] = [], attributes: Record<string, string> = {}): HTMLElement {
        const element = document.createElement(tagName);

        if (!Array.isArray(children)) children = [children];

        for (let child of children) {
            if (typeof child === "string") element.appendChild(document.createTextNode(child));
            else if (child instanceof HTMLElement) element.appendChild(child);
            else if ("html" in child && "tag" in child) {
                const newElement = document.createElement(child.tag);
                newElement.innerHTML = child.html;
                element.appendChild(newElement);
            }
            else if ("text" in child) element.appendChild(document.createTextNode(child.text));
        }

        for (let key in attributes) {
            element.setAttribute(key, attributes[key]);
        }

        return element;
    }

    export function makeHeading({ name, logo, id }: Supplier): HTMLElement {
        return element("div", [
            logo ? element("img", [], { id, src: logo }) : element("h1", name, { id})
        ], {
            id: "supplier-heading"
        });
    }

    export function makeSystem({ name, reportLink, waterStatus, waterSource, description, stats }: WaterSystem): HTMLElement {
        return element("div", [
            element("div", [
                element("h3", name, { class: "system-name", id: name.toLowerCase().split(" ").join("-") }),
                element("p", [
                    element("strong", "Areas Served: "),
                    description
                ], { class: "system-description" }),
                ...(waterSource ? [
                    element("p", [
                        element("strong", "Water Source: "),
                        waterSource
                    ], { class: "water-source" })
                ] : []),
                element("p", [
                    element("strong", "Water Status: "),
                    waterStatus
                ], { class: "water-status" })
            ], { class: "system-info" }),
            element("div", [
                element("ul", [
                    ["Ideal", NORMAL],
                    ["Safe", SAFE],
                    ["Critical", DANGER]
                ].map(([label, color]) => (
                    element("li", label, { class: "legend-item", style: `--legend-color: ${color}` })
                )), { class: "color-legend" }),
                element("div", [], {
                    name: "chart",
                    ...stats.reduce((collector, stat, index) => (collector["stat-" + index] = stat.toString(), collector), {} as Record<string, string>)
                })
            ], { class: "chart-container" }),
            ...reportLink ? [element("div", [
                element("p", "EPA: Environmental Protection Agency"),
                element("a", "Click here to see the detailed water quality report", { href: reportLink })
            ], { class: "source-container" })] : []
        ], {
            class: "system-container"
        });
    }

    export function makeSystems(systems: WaterSystem[]): HTMLElement {
        return element("div", systems.map(system => makeSystem(system)), {
            class: "systems-container"
        });
    }

    export function makeCounty({ id, name, systems }: County): HTMLElement {
        return element("div", [
            element("h2", name, { id }),
            makeSystems(systems)
        ], {
            class: "county-container"
        });
    }

    export function makeCounties(counties: County[]): HTMLElement {
        return element("div", counties.map(c => makeCounty(c)), {
            class: "counties-container"
        });
    }
}

namespace SuppliersCharting {
    const { element } = SuppliersDOM;

    export interface StatisticDefinition {
        name: string;
        description?: string;
        range: [number, number];
        safeRange: [number, number];
        ticks: number[];
        unit: string;
        color?: string;
    }

    export interface StatisticDefinitionRoot {
        stats: StatisticDefinition[];
    }

    export let definitions: StatisticDefinition[] = [];

    export function loadStatisticDefinitions(cb?: () => void) {
        let chartsLoaded = false;
        let statsLoaded = false;

        google.charts.load("current", { packages: ["corechart"] });
        google.charts.setOnLoadCallback(function() {
            if (statsLoaded && cb) cb();
            chartsLoaded = true;
        })

        $.getJSON("/api/stats-definitions.json", (data: StatisticDefinitionRoot) => {
            definitions = data.stats;
            
            if (chartsLoaded && cb) cb();
            statsLoaded = true;
        });
    }

    export function setupChart(chart: HTMLElement): [any, any[]][] {
        const stats: number[] = [];
        const charts: [any, any[]][] = [];

        for (let attributeIndex in chart.attributes) {
            const attribute = chart.attributes[attributeIndex];

            const attributeName = attribute.name;
            if (!attributeName) continue;

            if (attributeName.slice(0, 5) !== "stat-") continue;
            const index = +attributeName.split("-")[1];
            if (isNaN(index)) continue;

            const value = +attribute.value;
            if (isNaN(value)) continue;

            stats[index] = value;
        }

        stats.forEach((stat, index) => {
            const definition = definitions[index];
            if (!definition) return;

            if (stat < 0) return;

            const dataTable = new google.visualization.DataTable();

            dataTable.addColumn("string", "");
            dataTable.addColumn("number", "");
            dataTable.addColumn("number", "");
            dataTable.addColumn("number", "");
            dataTable.addColumn("number", "");
            dataTable.addColumn({ type: "string", role: "tooltip" });
            dataTable.addColumn({ role: "style" })

            if (definition.safeRange) dataTable.addRows([
                ["EPA Standard", definition.safeRange[0], definition.safeRange[0], definition.safeRange[1], definition.safeRange[1], `${definition.safeRange[0]} - ${definition.safeRange[1]} ${definition.unit}`, NORMAL],
            ]);

            const isDangerous = definition.safeRange ? (stat < definition.safeRange[0] || stat > definition.safeRange[1]) : false;

            const color = isDangerous ? DANGER : SAFE;
            
            dataTable.addRows([
                ["Actual", 0, 0, stat, stat, `${stat} ${definition.unit}`, color]
            ]);

            // const data = google.visualization.arrayToDataTable([
            //     ["", "Normal", "Actual"],
            //     [" ", definition.safeRange[1], stat]
            // ]);

            const chartContainer = document.createElement("div");

            const container = element("div", [
                // element("span", definition.name, { class: "stat-name" }),
                element("div", [
                    element("h4", definition.name, { class: "stat-name" }),
                    // element("p", definition.description, { class: "stat-description" })
                ], { class: "stat-info" }),
                chartContainer
            ], { class: "stat-container", name: `stat-${definition.name}`, ...(isDangerous ? { dangerous: "dangerous" } : {}) });

            chart.appendChild(container);

            const gChart = new google.visualization.CandlestickChart(chartContainer);
            
            charts.push([gChart, [dataTable, {
                orientation: "vertical",
                theme: "material",
                height: 90,
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
}

declare const tippy: (selector: string, options: object) => void;

class SupplierPage {
    storage: Record<string, HTMLElement> = {};

    init() {
        if (!this.supplier) return;
        
        this.main.appendChild(SuppliersDOM.makeHeading(this.supplier));

        const allSystems = this.supplier.counties.reduce((a, c) => a.concat(c.systems), [] as WaterSystem[]);

        const element = SuppliersDOM.element;

        this.main.appendChild(element("div", allSystems.map(({ name }) => element("a", name, { href: `#${name.toLowerCase().split(" ").join("-")}` })), { class: "system-link-container" }));

        this.main.appendChild(SuppliersDOM.makeCounties(this.supplier.counties));

        const charts = this.main.querySelectorAll("[name=chart]");

        const chartPartials = Array.prototype.map.call(charts, chart => SuppliersCharting.setupChart(chart as HTMLElement)) as [any, any[]][];

        const adjustWidth = function() {
            var newWidth: number;
            const vw = $(window).width()!;

            if (vw < 1000) {
                if (vw < 700) {
                    newWidth = vw - 100;
                } else {
                    newWidth = vw - 300;
                }
            } else {
                newWidth = (vw / 2) - 200;
            }

            console.log(newWidth);

            chartPartials.forEach((charts) => charts.forEach(opts => opts[1][1].width = newWidth));
        }
        var pendingResize: number;

        const draw = function() {
            adjustWidth();

            for (let someCharts of chartPartials) {
                requestAnimationFrame(function() {
                    for (let [chart, [opt1, opt2]] of someCharts) {
                        chart.draw(opt1, opt2);
                    }
                });
            }

            pendingResize = undefined!;
        }

        draw();

        $(window).on("resize", function() {
            if (!pendingResize) setTimeout(draw, 100);
        });
        

        setTimeout(() => {
            SuppliersCharting.definitions.forEach((definition, index) => {
                const baseSelector = `[name="stat-${definition.name}"]`;

                tippy(`${baseSelector} > div:not(.stat-info)`, {
                    content: definition.description,
                    allowHTML: true,
                    placement: (index % 2 === 0) ? "left" : "right"
                })

                tippy(`${baseSelector}[dangerous]`, {
                    content: `This plant's ${definition.name} level is outside of EPA standards!`,
                    theme: "dangerous",
                    placement: "bottom"
                })
            })
        }, 1000);

        console.log("told them to do it");
    }

    private element(selector: string): HTMLElement {
        return document.querySelector(selector) as HTMLElement;
    }

    get main(): HTMLElement {
        return this.storage.main || (this.storage.main = this.element("main#main-content"));
    }

    get supplier(): Supplier | null {
        return SuppliersCore.getSupplier();
    }

    get county(): County | null {
        return SuppliersCore.getCounty();
    }
}

$(function() {
    function completed() {
        const page = new SupplierPage();
    
        page.init();
    }

    let loadedDefs = false, loadedSuppliers = false;

    SuppliersCharting.loadStatisticDefinitions(() => {
        if (loadedSuppliers) completed();
        loadedDefs = true;
    });

    SuppliersCore.loadSuppliers(() => {
        if (loadedDefs) completed();
        loadedSuppliers = true;
    });
});