export const PIDA_CONFIG = {
    API_CHAT: "https://chat-v20-genai-465781488910.us-central1.run.app",
    API_ANA: "https://analize-v20-genai-465781488910.us-central1.run.app",
    API_PRE: "https://precalifier-v20-perplexity-465781488910.us-central1.run.app"
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