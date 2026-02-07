// OpenFoodFacts API integration

interface OFFProduct {
    name: string;
    brand?: string;
    imageUrl?: string;
    quantity?: string;
    categories?: string[];
    nutriscore?: string;
    novaGroup?: number;
    ecoScore?: string;
}

interface OFFResponse {
    status: number;
    product?: {
        product_name?: string;
        product_name_it?: string;
        brands?: string;
        image_url?: string;
        image_front_url?: string;
        quantity?: string;
        categories_tags?: string[];
        nutriscore_grade?: string;
        nova_group?: number;
        ecoscore_grade?: string;
    };
}

export async function getProductByBarcode(code: string): Promise<OFFProduct | null> {
    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
            {
                headers: {
                    'User-Agent': 'PantryOps/1.0 (https://github.com/PantryOps)',
                },
            }
        );

        if (!response.ok) {
            console.error(`OFF API error: ${response.status}`);
            return null;
        }

        const data = (await response.json()) as OFFResponse;

        if (data.status !== 1 || !data.product) {
            return null;
        }

        const p = data.product;

        // Extract a clean list of categories (removing 'en:' prefix if present)
        const cleanCategories = p.categories_tags?.map(cat =>
            cat.startsWith('en:') ? cat.substring(3).replace(/-/g, ' ') : cat
        ).slice(0, 5); // Limit to top 5

        return {
            name: p.product_name_it || p.product_name || 'Unknown Product',
            brand: p.brands,
            imageUrl: p.image_front_url || p.image_url,
            quantity: p.quantity,
            categories: cleanCategories,
            nutriscore: p.nutriscore_grade?.toUpperCase(),
            novaGroup: p.nova_group,
            ecoScore: p.ecoscore_grade?.toUpperCase(),
        };
    } catch (error) {
        console.error('OpenFoodFacts fetch error:', error);
        return null;
    }
}
