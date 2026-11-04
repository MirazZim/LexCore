// Page code that's worth fetching before it's asked for. The router's lazy()
// and the early fetch share one import, so the browser only downloads it once.
export const loadReviewPage = () => import('@/pages/ReviewPage');
