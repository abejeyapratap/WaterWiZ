declare const $: JQueryStatic;

interface WaterSystem {
    name: string;
    waterStatus: string;
    description: string;
    stats: number[];
}

interface County {
    name: string;
    id: string;
    systems: WaterSystem[];
}

interface Supplier {
    id: string;
    name: string;
    counties: County[];
}

interface SuppliersRoot {
    suppliers: Supplier[];
}

const NORMAL = "#2962A5";
const DANGER = "#C90C06";
const CAUTION = "#F59112";
const SAFE = "#377E22";

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

    export function makeHeading({ name, id }: Supplier): HTMLElement {
        return element("div", [
            element("h1", name, { id }),
            element("hr")
        ], {
            id: "supplier-heading"
        });
    }

    export function makeSystem({ name, waterStatus, description, stats }: WaterSystem): HTMLElement {
        return element("div", [
            element("div", [
                element("h3", name, { class: "system-name" }),
                element("p", { html: description, tag: "div" }, { class: "system-description" }),
                element("p", [
                    element("strong", "Water Status: "),
                    waterStatus
                ], { class: "water-status" })
            ], { class: "system-info" }),
            element("div", [
                element("ul", [
                    ["Normal", NORMAL],
                    ["Safe", SAFE],
                    ["Caution", CAUTION],
                    ["Danger", DANGER]
                ].map(([label, color]) => (
                    element("li", label, { class: "legend-item", style: `--legend-color: ${color}` })
                )), { class: "color-legend" }),
                element("div", [], {
                    name: "chart",
                    ...stats.reduce((collector, stat, index) => (collector["stat-" + index] = stat.toString(), collector), {} as Record<string, string>)
                })
            ], { class: "chart-container" })
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
                ["Normal", definition.safeRange[0], definition.safeRange[0], definition.safeRange[1], definition.safeRange[1], `${definition.safeRange[1]} ${definition.unit}`, NORMAL],
            ]);

            const isDangerous = definition.safeRange ? stat > definition.safeRange[1] : false;
            const isWarning = definition.safeRange ? (stat + (definition.ticks[1] / 2)) >= definition.safeRange[1] : false;

            const color = isDangerous ? DANGER : isWarning ? CAUTION : SAFE;
            
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
            ], { class: "stat-container", name: `stat-${definition.name}`, ...(isDangerous ? { dangerous: "dangerous" } : isWarning ? { warning: "warning" } : {}) });

            chart.appendChild(container);

            const gChart = new google.visualization.CandlestickChart(chartContainer);
            
            charts.push([gChart, [dataTable, {
                orientation: "vertical",
                theme: "material",
                height: 90,
                chartArea: {left:50, width: "100%"},
                legend: {
                    position: "none"
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
        this.main.appendChild(SuppliersDOM.makeCounties(this.supplier.counties));

        const charts = this.main.querySelectorAll("[name=chart]");

        const chartPartials = Array.prototype.map.call(charts, chart => SuppliersCharting.setupChart(chart as HTMLElement)) as [any, any[]][];

        for (let someCharts of chartPartials) {
            requestAnimationFrame(function() {
                for (let [chart, [opt1, opt2]] of someCharts) {
                    chart.draw(opt1, opt2);
                }
            });
        }

        setTimeout(() => {
            SuppliersCharting.definitions.forEach((definition, index) => {
                const baseSelector = `[name="stat-${definition.name}"]`;

                tippy(baseSelector, {
                    content: definition.description,
                    allowHTML: true,
                    placement: (index % 2 === 0) ? "left" : "right"
                })

                tippy(`${baseSelector}[warning]`, {
                    content: `This plant's ${definition.name} level is near unhealthy levels.`,
                    theme: "caution",
                    placement: "bottom"
                })

                tippy(`${baseSelector}[dangerous]`, {
                    content: `This plant's ${definition.name} level exceeds FDA standards!`,
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