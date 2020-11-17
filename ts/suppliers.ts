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

class SupplierPage {
    init() {
        console.log(this.supplier);
    }

    get supplier() {
        return SuppliersCore.getSupplier();
    }

    get county() {
        return SuppliersCore.getCounty();
    }
}

$(function() {
    SuppliersCore.loadSuppliers(() => {
        const page = new SupplierPage();

        page.init();
    });
});