# ERP/POS Integration with TikTok, Lazada, and KiotViet (Internship 2023)

## Context
- Role: Backend Intern (PHP, MySQL)
- Domain: Retail ERP + Marketplace sync
- Goal: Automate order, stock, and customer data sync between in-store POS and marketplaces.

## Key Contributions
- Designed **API connectors** with token caching & retry strategy.
- Built **cronjobs** to reconcile orders & inventory every 5 min.
- Implemented **webhook signature verification** and **idempotency keys**.
- Created multi-channel commission logic.

## Results
- Reduced API sync failures by ~40%.
- Cut average sync latency from ~8s to ~2s (p95).
- Achieved >99% webhook success rate.

## Tech Stack
PHP 7.4, MySQL, Apache/Nginx, Slim Framework, Redis (for token & rate limit), Cron.

## Lessons Learned
- Importance of idempotency in distributed systems.
- Handling rate limits gracefully with backoff & circuit breakers.
- Designing flexible schema for multi-channel commissions.
