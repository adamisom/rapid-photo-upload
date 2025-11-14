# Connection Pool Size Analysis

## Current Requirements

**Peak Concurrent Connections Needed:**
- 100 URL requests (1 batch × 100) = 100 connections
- 20 upload completions = 20 connections
- Other API requests = ~10-20 connections
- **Total Peak: ~130-140 connections**

**Note:** We limit to 1 batch at a time to stay within Railway's PostgreSQL limit of 100 max_connections.

## Pool Size Options

### Option 1: 80 connections (Current)
**Pros:**
- ✅ Works within Railway PostgreSQL limit (100 max_connections)
- ✅ Leaves 20 connections for other processes (admin, monitoring)
- ✅ Lower memory usage (~2-3MB per connection = ~160-240MB)
- ✅ Handles 100 concurrent URL requests (1 batch at a time)
- ✅ Good balance for Railway's Pro plan

**Cons:**
- ⚠️ Only 1 batch of URLs at a time (slower URL fetching than 2 batches)
- ⚠️ Tight if multiple users upload simultaneously
- ⚠️ Could be limiting for very high traffic

**Verdict:** ✅ **Current configuration** - works within Railway limits

---

### Option 2: 100 connections
**Pros:**
- ✅ Handles 100 concurrent URL requests (1 batch)
- ✅ Leaves room for completions and other requests
- ✅ Still reasonable memory footprint (~200-300MB)
- ✅ Matches Railway PostgreSQL max_connections limit

**Cons:**
- ❌ **Exceeds Railway PostgreSQL limit** (100 max_connections)
- ❌ Uses all available connections, no room for other processes
- ❌ Will cause connection failures
- ❌ Not recommended for Railway

**Verdict:** ❌ **Not viable** - exceeds Railway's PostgreSQL limit

---

### Option 3: 200+ connections (Not possible on Railway)
**Pros:**
- ✅ Could handle 2 batches of URLs simultaneously (200 requests)
- ✅ Handles multiple concurrent users better
- ✅ Reduces connection wait times
- ✅ Better for production workloads

**Cons:**
- ❌ **Exceeds Railway PostgreSQL limit** (100 max_connections)
- ❌ Higher memory usage (~400-600MB)
- ❌ Would require dedicated PostgreSQL instance
- ❌ Not viable on Railway's current plan

**Verdict:** ❌ **Not possible** - exceeds Railway's PostgreSQL limit

---

### Option 4: 500+ connections
**Pros:**
- ✅ Handles multiple large uploads simultaneously
- ✅ Very comfortable buffer
- ✅ Future-proof for scaling

**Cons:**
- ❌ High memory usage (~1-1.5GB just for connections)
- ❌ PostgreSQL max_connections often defaults to 100-200
- ❌ Railway likely has limits
- ❌ Diminishing returns (connections sit idle)
- ❌ More expensive (memory costs)

**Verdict:** ❌ **Overkill** - waste of resources

---

## Railway PostgreSQL Limits

**Important:** Railway PostgreSQL has connection limits:
- **Free tier**: Usually 20-50 max connections
- **Pro tier**: **100 max connections** (confirmed via `check-db-connection-limits.sh`)
- **Enterprise**: Custom limits

**Current Status:**
- Railway PostgreSQL `max_connections`: **100** (confirmed)
- Current HikariCP pool size: **80** (leaves 20 for other processes)
- URL batch concurrency: **1 batch** (100 URLs at a time)

**Check your Railway plan limits before increasing pool size!**

---

## Recommendation

### For Railway PostgreSQL (100 max_connections limit):
**80 connections** - Current configuration:
- 100 for URL requests (1 batch at a time, short-lived)
- 20 for upload completions
- 20 reserved for other processes (admin, monitoring)
- **Total: Fits within 100 connection limit**

### Configuration (Current):
```properties
spring.datasource.hikari.maximum-pool-size=80
spring.datasource.hikari.minimum-idle=10
spring.datasource.hikari.connection-timeout=30000
```

### Frontend Configuration (Current):
- `MAX_CONCURRENT_URL_BATCHES = 1` (100 URLs at a time)
- This ensures we don't exceed the 100 connection limit

### If Railway Increases Limit:
If Railway allows higher `max_connections` (e.g., 200+):
- Could increase pool to 150-180
- Could increase `MAX_CONCURRENT_URL_BATCHES` to 2 (200 URLs at a time)
- Would improve performance for large uploads

---

## Current Solution: Reduced Concurrent URL Requests

**Implemented:**
- Reduced `MAX_CONCURRENT_URL_BATCHES` from 2 to 1 (100 URLs at a time)
- This reduces peak connections from 200 to 100
- Pool size of 80 is sufficient (leaves buffer)
- **Trade-off**: Slightly slower URL fetching, but stable within Railway limits

**Performance Impact:**
- Before: 2 batches (200 URLs) = faster URL fetching, but exceeded connection limit
- After: 1 batch (100 URLs) = slightly slower, but works reliably
- Still pipelined: Uploads start after first batch, remaining batches fetch in background

---

## Monitoring

After deployment, monitor:
1. **Connection pool utilization** - Are we hitting the max?
2. **Connection wait times** - Are requests waiting for connections?
3. **PostgreSQL connection count** - Are we hitting database limits?
4. **Memory usage** - Is the increased pool size causing issues?

