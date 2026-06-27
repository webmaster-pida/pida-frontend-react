export const PIDA_CONFIG = {
    // Usamos import.meta.env para que Vite asigne la URL correcta según el entorno
    API_CHAT: import.meta.env.VITE_API_CHAT,
    API_ANA: import.meta.env.VITE_API_ANA,
    API_PRE: import.meta.env.VITE_API_PRE
};

export const STRIPE_PRICES = {
    basico: {
        monthly: {
            USD: { id: 'price_1SqFQiGgaloBN5L8U60ywohe', amount: 999, text: '$9.99' },
            MXN: { id: 'price_1SqFSFGgaloBN5L8BMBeRPqb', amount: 19900, text: '$199 MXN' }
        },
        annual: {
            USD: { id: 'price_1SqFSFGgaloBN5L8kxegWZqC', amount: 9999, text: '$99.99' },
            MXN: { id: 'price_1SqFSyGgaloBN5L8rrwrtUau', amount: 199900, text: '$1,999 MXN' }
        }
    },
    avanzado: {
        monthly: {
            USD: { id: 'price_1SqFUvGgaloBN5L8xOBssn6E', amount: 1999, text: '$19.99' },
            MXN: { id: 'price_1SqFWJGgaloBN5L8roECNay2', amount: 39900, text: '$399 MXN' }
        },
        annual: {
            USD: { id: 'price_1SqFWJGgaloBN5L8VKhkzLRH', amount: 19999, text: '$199.99' },
            MXN: { id: 'price_1SqFWJGgaloBN5L8hKpEvd1v', amount: 399900, text: '$3,999 MXN' }
        }
    },
    premium: {
        monthly: {
            USD: { id: 'price_1SqFXIGgaloBN5L8vaGyleDT', amount: 2999, text: '$29.99' },
            MXN: { id: 'price_1SqFadGgaloBN5L8AwTUeTSd', amount: 59900, text: '$599 MXN' }
        },
        annual: {
            USD: { id: 'price_1SqFadGgaloBN5L86iwNYm1c', amount: 29999, text: '$299.99' },
            MXN: { id: 'price_1SqFadGgaloBN5L8QFHXe1i9', amount: 599900, text: '$5,999 MXN' }
        }
    }
};