/**
 * Work board (job posts, talent profiles/CVs, contests) and quote-based Hire projects are
 * discontinued (Quy chế 2.1, 05/10/2026) and replaced by fixed-package professional services.
 * Since 10/2026 legacy Work is fully shut down: contracts, hire projects and Work disputes routes
 * redirect home and the API answers 410 for all Work/Hire endpoints (data is kept, not deleted). Do not re-enable without a legal review.
 */
export const WORK_BOARD_ENABLED = false;
