export interface Product {
    id: string;
    name: string;
    image_url: string;
    default_price: number;
    is_active: boolean;
}

export interface InventoryBatch {
    id: string;
    created_at: string;
    product_id: string;
    quantity_made: number;
    unit_price: number;
    // Joins
    products?: Product;
}

export interface SalesLog {
    id: string;
    created_at: string;
    product_id: string;
    quantity_sold: number;
    logged_by: string;
    // Joins
    products?: Product;
}
