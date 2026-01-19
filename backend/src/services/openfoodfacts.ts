// OpenFoodFacts API integration

interface OFFProduct {
    name: string;
    brand?: string;
    imageUrl?: string;
    quantity?: string;
    categories?: string;
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
        categories?: string;
    };
}

export async function getProductByBarcode(code: string): Promise<OFFProduct | null> {
    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
            {
                headers: {
                    'User-Agent': 'BetterGrocy/1.0 (https://github.com/bettergrocy)',
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

        return {
            name: p.product_name_it || p.product_name || 'Unknown Product',
            brand: p.brands,
            imageUrl: p.image_front_url || p.image_url,
            quantity: p.quantity,
            categories: p.categories,
        };
    } catch (error) {
        console.error('OpenFoodFacts fetch error:', error);
        return null;
    }
}
