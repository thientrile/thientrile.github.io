<!-- Case Study: ERP/POS Integration -->
# ERP / POS Integration with TikTok, Lazada & KiotViet
> Internship 2023 • Backend Integration & Automation • Real‑world marketplace + in‑store data sync

## 🔖 Overview
| Field | Detail |
| ----- | ------ |
| Role | Backend Intern (Integration) |
| Domain | Retail ERP · Marketplace Synchronization |
| Target | Unified, near real‑time sync of Orders · Inventory · Customers |
| Marketplaces | TikTok Shop, Lazada |
| POS / ERP | KiotViet (store operations) |
| Duration | 3 months (Internship) |
| Tech | PHP 7.4 · Slim · MySQL · Redis · Cron · Webhooks · Nginx/Apache |

## 🎯 Objectives
- Eliminate manual export/import steps.
- Reduce delayed or failed marketplace stock updates.
- Provide reliable order ingestion & commission allocation.
- Harden integration (idempotent, observable, resilient to rate limits).

## 🧩 Architecture Snapshot
```
				┌──────────┐      Webhooks       ┌──────────────┐
Marketplace(s) ───▶│ Webhook Ingress │────────────────▶│  Queue / Buffer │
				│ (TikTok, │                   └─────┬────────┘
				│  Lazada) │   Token Refresh (cron)   │  Retry / DLQ
				└────┬─────┘                          │
						 │   REST Fetch (Backfill)        ▼
						 │                           ┌──────────┐
						 │ Orders / Inventory Sync   │ Normalizer│
						 ▼                           └────┬─────┘
				 ┌──────────┐  Upsert / Merge         │
				 │  Adapter │────────────────────────▶│  Core DB (MySQL)
				 └──────────┘                         │
								 ▲                            ▼
					Rate Limit Guard               ┌──────────┐
								 │                       │  Redis   │ (Token cache,
								 └──────────────────────▶│  Caches  │  idempotency keys)
																				 └──────────┘
```

## 🔐 Resilience & Data Integrity
- Idempotency Keys: `source + marketplace_id + version` hashed & cached (Redis TTL 24h).
- Signature Verification: HMAC (shared secret) per marketplace; reject mismatch early.
- Retry Strategy: Exponential (1s · 4s · 16s · 30s) with jitter; pushes to DLQ after max attempts.
- Concurrency Guard: Mutex on `SKU` during inventory decrement to avoid race.

## ⚙️ Core Components
| Component | Responsibility | Notes |
|----------|----------------|-------|
| Connectors | Auth + paginated fetch + transformation | Encapsulated per marketplace |
| Webhook Handler | Fast validation → enqueue | Non-blocking; writes ack quickly |
| Normalizer | Map external -> internal schema | Handles commission + tax flags |
| Reconcile Cron | Backfill + drift detection | Every 5m diff check (orders + stock) |
| Commission Engine | Multi-channel rules | % / fixed / tiered mix |

## 🛠 Key Contributions
- Built modular **connector layer** (plug-add new marketplace < 1 day).
- Implemented **token caching & refresh window** preventing 401 bursts.
- Added **diff-based reconciliation** (only changed SKUs) → lower API cost.
- Designed **commission rule schema** (`channel`, `strategy`, `formula_json`).
- Added **structured logging** (trace id per sync batch) & simple latency histogram.

## 📊 KPIs & Impact
| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| API sync failure rate | ~12% | <7% | ~40% fewer failures |
| Avg order ingest latency | ~8s | ~2s (p95) | -75% |
| Webhook success | ~92% | >99% | +7pp |
| Manual adjustments / week | 25–30 | 5–7 | -70% workload |

## 🗂 Data Model Glimpse
```sql
-- Simplified commission rule
CREATE TABLE commission_rule (
	id BIGINT PRIMARY KEY AUTO_INCREMENT,
	channel VARCHAR(32) NOT NULL,
	strategy ENUM('PERCENT','FIXED','TIERED') NOT NULL,
	formula_json JSON NOT NULL,
	active TINYINT(1) DEFAULT 1,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Example Idempotent Insert (Pseudo-PHP)
```php
function ingestOrder($payload) {
	$key = hash('sha256', $payload['marketplace'].'/'.$payload['id'].'/'.$payload['version']);
	if (redis()->setNx('idem:'.$key, 1) === false) return 'DUPLICATE';
	redis()->expire('idem:'.$key, 86400);
	db()->beginTransaction();
	upsertOrder($payload);
	upsertLineItems($payload['items']);
	db()->commit();
	return 'OK';
}
```

## 🚧 Challenges & Solutions
| Challenge | Root Cause | Solution |
|-----------|-----------|----------|
| Token bursts expiring | All workers refreshing simultaneously | Pre-empt refresh at 80% lifetime + distributed lock |
| Inventory drift | Missed webhooks / partial failures | Scheduled diff + version counters |
| Commission complexity | Mixed per-channel logic | JSON rule engine + strategy enum |
| Rate limit spikes | Backfill + burst webhooks | Adaptive concurrency + exponential backoff |
| Duplicate orders | Retries + replay webhooks | Idempotency key with Redis setNX |

## 📥 Monitoring & Observability
- Structured JSON logs (source, batch, latency_ms, result).
- Simple metrics exported to dashboard: failures, retry_level, reconcile_drift_count.
- Alert thresholds (Slack): failure_rate >10%, drift_count >50 in 15m.

## 🧠 Lessons Learned
1. Idempotency & replay safety are mandatory with webhooks.
2. Backpressure + graceful degradation prevents cascading failures.
3. A narrow, explicit mapping layer keeps future marketplace additions cheap.
4. Commission logic benefits from data-driven JSON, not embedded conditionals.

## 🚀 Future Enhancements
- Replace cron + polling with event queue (Kafka / NATS) for scalability.
- Add OpenTelemetry tracing spans per order ingest.
- Introduce circuit breaker for high error APIs.
- Build self-service rule editor for commissions.

---
> Focus: Stability first, then speed. This integration reduced manual ops & set a base for scaling more channels.
