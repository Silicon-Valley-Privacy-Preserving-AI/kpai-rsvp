from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.model.user import User, UserRole
from src.model.seminar import Seminar
from src.model.seminar_rsvp import SeminarRSVP
from src.util.security import get_password_hash

class SystemService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def healthcheck(self):
        return {"message": "yes"}

    async def get_users(self):
        result = await self.db.execute(select(User))
        return result.scalars().all()

    async def get_seminars(self):
        result = await self.db.execute(select(Seminar))
        return result.scalars().all()

    async def get_seminarRSVPs(self):
        result = await self.db.execute(select(SeminarRSVP))
        return result.scalars().all()

    async def fill_mock_data(self) -> dict:
        """
        Insert a realistic set of mock seminars, users, RSVPs, and check-ins
        for debugging the Statistics page.  Safe to call multiple times —
        if the sentinel user already exists the call is a no-op.
        """
        SENTINEL_EMAIL = "mock_user_01@kpai.test"
        existing = await self.db.execute(
            select(User).where(User.email == SENTINEL_EMAIL)
        )
        if existing.scalar_one_or_none() is not None:
            return {"skipped": True, "message": "Mock data already exists. Delete mock users first to re-seed."}

        now = datetime.now(timezone.utc)
        hashed_pw = get_password_hash("password123")

        # ── 0. Create staff user (soo) ────────────────────────────────────────
        staff_soo_check = await self.db.execute(
            select(User).where(User.email == "soo@soo")
        )
        if staff_soo_check.scalar_one_or_none() is None:
            staff_user = User(
                email="soo@soo",
                username="soo",
                password=get_password_hash("sooo"),
                is_temporary=False,
                role=UserRole.STAFF,
            )
            self.db.add(staff_user)

        # ── 1. Create 20 mock members ─────────────────────────────────────────
        users: list[User] = []
        for i in range(1, 21):
            u = User(
                email=f"mock_user_{i:02d}@kpai.test",
                username=f"Mock User {i:02d}",
                password=hashed_pw,
                is_temporary=(i > 16),   # last 4 are temporary accounts
                role=UserRole.MEMBER,
            )
            self.db.add(u)
            users.append(u)
        await self.db.flush()   # populate user IDs

        # ── 2. Define 12 seminars spanning ~11 months ─────────────────────────
        # Each tuple: (title, host, location, days_ago, max_capacity,
        #              n_rsvp, checkin_rate, cover_image)
        # Cover images: picsum.photos/seed/{word}/800/450 — deterministic per seed
        # Locations are real, Google Maps-searchable venues in Silicon Valley
        seminar_specs = [
            ("Introduction to Python",          "Dr. Alice Kim",  "KOTRA Silicon Valley, 3003 N 1st St, San Jose, CA",        330, 30,   14, 0.79,
             "https://picsum.photos/seed/python/800/450"),
            ("Web Development Basics",           "Bob Park",       "Samsung Research America, 665 Clyde Ave, Mountain View, CA", 300, 25,   11, 0.73,
             "https://picsum.photos/seed/webdev/800/450"),
            ("Data Structures & Algorithms",     "Dr. Alice Kim",  "Online (Zoom)",                                             270, None, 17, 0.65,
             "https://picsum.photos/seed/algorithm/800/450"),
            ("Machine Learning Fundamentals",    "Carol Lee",      "Computer History Museum, 1401 N Shoreline Blvd, Mountain View, CA", 240, 40, 13, 0.85,
             "https://picsum.photos/seed/machinelearning/800/450"),
            ("Database Design",                  "Bob Park",       "Plug and Play Tech Center, 440 N Wolfe Rd, Sunnyvale, CA",  210, 20,   10, 0.60,
             "https://picsum.photos/seed/database/800/450"),
            ("Cloud Computing Overview",         "David Yoon",     "Samsung Research America, 665 Clyde Ave, Mountain View, CA", 180, 35,   16, 0.75,
             "https://picsum.photos/seed/cloudcomputing/800/450"),
            ("React & Frontend Frameworks",      "Carol Lee",      "Online (Zoom)",                                             150, None, 19, 0.84,
             "https://picsum.photos/seed/reactjs/800/450"),
            ("API Design & REST",                "Dr. Alice Kim",  "KOTRA Silicon Valley, 3003 N 1st St, San Jose, CA",        120, 30,   12, 0.67,
             "https://picsum.photos/seed/apidesign/800/450"),
            ("DevOps & CI/CD",                   "David Yoon",     "Plug and Play Tech Center, 440 N Wolfe Rd, Sunnyvale, CA",   90, 25,    9, 0.56,
             "https://picsum.photos/seed/devops/800/450"),
            ("Security Best Practices",          "Bob Park",       "Stanford d.school, 416 Escondido Mall, Stanford, CA",        60, 20,    8, 0.88,
             "https://picsum.photos/seed/cybersecurity/800/450"),
            ("System Design Interview Prep",     "Carol Lee",      "Online (Zoom)",                                              30, None, 15, 0.73,
             "https://picsum.photos/seed/systemdesign/800/450"),
            ("AI & Ethics in Tech",              "Dr. Alice Kim",  "Computer History Museum, 1401 N Shoreline Blvd, Mountain View, CA",  7, 40, 18, 0.67,
             "https://picsum.photos/seed/aiethics/800/450"),
        ]

        # ── Markdown descriptions (one per seminar, exercises different syntax) ─
        MOCK_DESCRIPTIONS: dict[str, str] = {
            "Introduction to Python": """\
## What You'll Learn

A hands-on introduction to Python for beginners and developers switching from other languages.

### Topics Covered

- **Variables & Types** — `int`, `float`, `str`, `bool`, `list`, `dict`
- **Control Flow** — `if / elif / else`, `for`, `while`
- **Functions** — defining, calling, `*args`, `**kwargs`
- **Modules** — `import`, `from … import`, the standard library

### Sample Code

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

for person in ["Alice", "Bob", "Carol"]:
    print(greet(person))
```

> **Note:** No prior programming experience required. Bring a laptop with Python 3.11+ installed.

---

Participants will leave with a working mini-project and a curated reading list.
""",

            "Web Development Basics": """\
## Overview

Get up to speed with the *fundamentals* of modern web development in a single afternoon session.

### Agenda

1. How the web works — HTTP, DNS, browsers
2. **HTML** — semantic structure, accessibility basics
3. **CSS** — the box model, flexbox, responsive units
4. **JavaScript** — DOM manipulation, event listeners, `fetch()`

### Why Attend?

> "The best way to learn web development is to build something real."
> — Bob Park, Session Host

You will build and deploy a small personal page **live during the session**.

### Prerequisites

| Skill | Required? |
|---|---|
| HTML basics | ✅ Helpful |
| Terminal usage | ❌ Not required |
| Any prior coding | ❌ Not required |
""",

            "Data Structures & Algorithms": """\
## Session Goals

Master the core data structures used in **technical interviews** and production systems.

---

### Data Structures

- **Array / Dynamic Array** — random access, amortised O(1) append
- **Linked List** — O(1) insert at head, O(n) search
- **Hash Map** — average O(1) get/set, collision strategies
- **Binary Tree / BST** — O(log n) search on balanced trees
- **Heap** — priority queues, `heapq` in Python

### Algorithm Patterns

| Pattern | Example Problem |
|---|---|
| Two Pointers | Remove duplicates from sorted array |
| Sliding Window | Longest substring without repeating chars |
| BFS / DFS | Number of islands |
| Dynamic Programming | Coin change, knapsack |

### Quick Example

```python
from collections import deque

def bfs(graph: dict, start: str) -> list[str]:
    visited, queue = set(), deque([start])
    while queue:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            queue.extend(graph.get(node, []))
    return list(visited)
```

> This session is recorded. Registered members receive the replay link within 48 hours.
""",

            "Machine Learning Fundamentals": """\
## Machine Learning Fundamentals

*No PhD required.* This session demystifies ML for software engineers.

---

### What is Machine Learning?

Machine learning is a subset of AI where systems **learn from data** rather than being explicitly programmed.

### Three Learning Paradigms

1. **Supervised Learning** — labelled training data (e.g. spam detection)
2. **Unsupervised Learning** — find hidden structure (e.g. customer segmentation)
3. **Reinforcement Learning** — learn via reward signals (e.g. game-playing agents)

### Core Concepts

- *Feature Engineering* — turning raw data into model inputs
- *Overfitting vs. Underfitting* — the bias-variance tradeoff
- *Train / Validation / Test Split* — never evaluate on training data
- *Metrics* — accuracy, precision, recall, F1, AUC-ROC

### Tools We'll Use

```bash
pip install scikit-learn pandas matplotlib
```

> **Bring your laptop.** We will train a real classifier on a real dataset together.
""",

            "Database Design": """\
## Database Design

Learn to model data correctly the *first* time.

### Why Database Design Matters

Poor schema choices compound over time — they cause slow queries, data anomalies, and painful migrations.

---

### Agenda

1. Relational model basics — tables, rows, columns, keys
2. **Normalisation** — 1NF → 2NF → 3NF with worked examples
3. **Indexing** — B-tree vs. hash indexes, `EXPLAIN ANALYZE`
4. **Transactions & ACID** — atomicity, consistency, isolation, durability
5. When to reach for NoSQL

### Normalisation Cheat-Sheet

| Normal Form | Rule |
|---|---|
| 1NF | No repeating groups; atomic values |
| 2NF | No partial dependencies on composite key |
| 3NF | No transitive dependencies |

### Sample Query

```sql
SELECT u.username, COUNT(r.id) AS rsvp_count
FROM users u
LEFT JOIN seminar_rsvps r ON r.user_id = u.id
GROUP BY u.id
ORDER BY rsvp_count DESC
LIMIT 10;
```

> Prerequisites: basic familiarity with SQL `SELECT` statements.
""",

            "Cloud Computing Overview": """\
## Cloud Computing Overview

*From bare metal to serverless* — a practical tour of the modern cloud.

---

### What We'll Cover

- **IaaS vs. PaaS vs. SaaS** — choosing the right abstraction
- **Core AWS Services** — EC2, S3, RDS, Lambda, CloudFront
- **Containers & Orchestration** — Docker basics, Kubernetes concepts
- **Cost Optimisation** — reserved instances, spot pricing, right-sizing

### Cloud vs. On-Premises

| Dimension | Cloud | On-Premises |
|---|---|---|
| Upfront cost | Low (OPEX) | High (CAPEX) |
| Scalability | Near-instant | Weeks–months |
| Maintenance | Provider handles | Your team |
| Control | Limited | Full |

### Hands-On Demo

We will deploy a containerised FastAPI app to AWS ECS and put CloudFront in front of it — **live**.

```bash
docker build -t my-api .
aws ecr get-login-password | docker login --username AWS --password-stdin <registry>
docker push <registry>/my-api:latest
```

> No AWS account needed for the demo — the host will screen-share.
""",

            "React & Frontend Frameworks": """\
## React & Frontend Frameworks

Build *fast*, *maintainable* UIs with React 19 and the modern ecosystem.

### Why React?

- **Component model** — composable, reusable UI primitives
- **Concurrent rendering** — React 19 Suspense & transitions
- **Huge ecosystem** — Vite, TanStack Query, Zustand, shadcn/ui

---

### Agenda

1. JSX & the virtual DOM
2. Hooks deep-dive — `useState`, `useEffect`, `useRef`, `useMemo`
3. Data fetching patterns — `fetch` vs. TanStack Query
4. Styling strategies — CSS Modules vs. styled-components vs. Tailwind
5. Performance — `React.memo`, `useCallback`, code-splitting

### Example — Custom Hook

```tsx
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

> Bring a laptop with **Node 20+** and your favourite editor.
""",

            "API Design & REST": """\
## API Design & REST

Design APIs that developers *love* to use.

---

### Core REST Principles

- **Uniform Interface** — resources identified by URIs
- **Statelessness** — no client state stored on the server
- **Layered System** — clients don't know if they're talking to a cache or origin
- **HATEOAS** — responses include links to related actions

### HTTP Method Semantics

| Method | Idempotent? | Safe? | Use |
|---|---|---|---|
| GET | ✅ | ✅ | Read resource |
| POST | ❌ | ❌ | Create resource |
| PUT | ✅ | ❌ | Full replace |
| PATCH | ❌ | ❌ | Partial update |
| DELETE | ✅ | ❌ | Remove resource |

### Versioning Strategy

```
/api/v1/seminars        ← stable
/api/v2/seminars        ← new shape, opt-in
```

> "A public API is forever. Design it as if you can never change it."

### Workshop

We'll design a RESTful API for a library system together, then review each other's designs.
""",

            "DevOps & CI/CD": """\
## DevOps & CI/CD

*Ship faster, break less.*

---

### What is DevOps?

DevOps is a **culture + practice** that unifies software development and IT operations to shorten the delivery cycle.

### The CI/CD Pipeline

1. **Code** — developer pushes to feature branch
2. **CI (Continuous Integration)** — automated tests + lint run on every push
3. **Build** — Docker image built and pushed to registry
4. **CD (Continuous Delivery)** — image deployed to staging automatically
5. **CD (Continuous Deployment)** — auto-promote to production on green staging

### GitHub Actions Example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest --cov=src
```

### Key Metrics

| Metric | Target |
|---|---|
| Deployment Frequency | Multiple times/day |
| Lead Time for Changes | < 1 hour |
| Change Failure Rate | < 5 % |
| MTTR | < 1 hour |

> This session includes a **live walkthrough** of a real GitHub Actions pipeline.
""",

            "Security Best Practices": """\
## Security Best Practices

*Security is not a feature — it's a requirement.*

---

### OWASP Top 10 Highlights

- **Injection** (SQL, Command, LDAP) — *parameterise everything*
- **Broken Authentication** — enforce MFA, short session TTLs
- **Sensitive Data Exposure** — encrypt at rest and in transit
- **Security Misconfiguration** — disable debug endpoints in production
- **Using Components with Known Vulnerabilities** — automate dependency scanning

### Secure Password Storage

```python
import bcrypt

hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
bcrypt.checkpw(candidate.encode(), hashed)   # True / False
```

> **Never** store passwords in plaintext. **Never** use MD5 or SHA-1 for passwords.

### Defence in Depth

| Layer | Control |
|---|---|
| Network | WAF, firewall rules, VPC |
| Application | Input validation, CSP headers |
| Data | Encryption, least-privilege DB user |
| Monitoring | SIEM, anomaly alerts |

---

Participants will perform a hands-on **code review** to find vulnerabilities in a deliberately insecure app.
""",

            "System Design Interview Prep": """\
## System Design Interview Prep

*Land your L5+ offer by thinking at scale.*

---

### The Framework

1. **Clarify requirements** — functional vs. non-functional, scale targets
2. **Estimate capacity** — QPS, storage, bandwidth
3. **High-level design** — draw the boxes and arrows
4. **Deep dive** — pick the hardest component and go deep
5. **Identify bottlenecks** — SPOF, hotspots, consistency issues

### Example Problem: Design a URL Shortener

| Requirement | Detail |
|---|---|
| Write QPS | 1,000 / sec |
| Read QPS | 100,000 / sec |
| URL TTL | 5 years |
| Storage | ~180 GB over 5 years |

### Key Concepts to Know

- **Horizontal vs. Vertical Scaling**
- **SQL vs. NoSQL trade-offs**
- **Caching** — cache-aside, write-through, TTL strategy
- **Message Queues** — Kafka, SQS, async decoupling
- **Consistent Hashing** — for distributed caches and sharded DBs

> Practice makes perfect. We'll mock-interview in pairs after the lecture.
""",

            "AI & Ethics in Tech": """\
## AI & Ethics in Tech

*Who is responsible when the model is wrong?*

---

### Why Ethics in AI?

Artificial intelligence systems are increasingly making — or influencing — decisions that affect people's **lives, livelihoods, and freedoms**. Understanding the ethical dimensions is no longer optional for engineers.

### Core Topics

- **Bias & Fairness** — protected attributes, disparate impact, fairness metrics
- **Transparency & Explainability** — black-box vs. interpretable models
- **Privacy** — differential privacy, federated learning, data minimisation
- **Accountability** — who is liable when an AI causes harm?
- **Regulation** — EU AI Act, NIST AI RMF, sector-specific rules

### A Famous Failure

> In 2018, Amazon scrapped an AI recruiting tool after discovering it **penalised résumés that included the word "women's"** — a direct result of training on historically male-dominated hiring data.

### Discussion Framework

| Question | Stakeholders |
|---|---|
| Who benefits from this system? | Users, company, society |
| Who bears the risk? | Affected communities |
| How is error corrected? | Appeal, override, audit |

---

*This session is intentionally discussion-heavy. Come ready to challenge assumptions — including your own.*
""",

            "Blockchain & Web3 Dev": """\
## Blockchain & Web3 Dev

*Build decentralised applications that no single entity controls.*

---

### What Is a Blockchain?

A **blockchain** is a distributed ledger — a chain of cryptographically linked blocks replicated across thousands of nodes. No central authority can alter history without consensus.

### Smart Contracts

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;

    function set(uint256 _val) public { value = _val; }
    function get() public view returns (uint256) { return value; }
}
```

### Web3 Stack

| Layer | Technology |
|---|---|
| Blockchain | Ethereum, Solana, Polygon |
| Smart Contracts | Solidity, Rust (Anchor) |
| Client Library | ethers.js, wagmi |
| Wallet | MetaMask, WalletConnect |

### Topics

- Consensus mechanisms — *Proof of Work* vs. *Proof of Stake*
- Gas fees and optimisation
- NFT standards — ERC-721, ERC-1155
- DeFi primitives — AMMs, liquidity pools

> Bring a laptop with MetaMask installed. We will deploy to a **testnet** together.
""",

            "Open Source Contribution Workshop": """\
## Open Source Contribution Workshop

*Your first (or fiftieth) pull request starts here.*

---

### Why Contribute to Open Source?

- **Learn** from production-quality codebases
- **Build** a public portfolio that speaks for itself
- **Connect** with a global engineering community
- **Give back** to the tools you rely on every day

### Workshop Flow

1. Finding a beginner-friendly issue (`good first issue`, `help wanted`)
2. Forking, cloning, and setting up the dev environment
3. Understanding the contribution guidelines (`CONTRIBUTING.md`)
4. Writing code + tests
5. Opening a pull request that gets *merged*

### Git Workflow

```bash
git clone https://github.com/you/project.git
git checkout -b fix/typo-in-readme
# make changes
git add README.md
git commit -m "fix: correct spelling of 'occurrence'"
git push origin fix/typo-in-readme
# open PR on GitHub
```

> **No contribution is too small.** Documentation improvements and test additions are equally valued.

---

*Maintainers from two popular open-source projects will join live to review PRs submitted during the workshop.*
""",

            "Tech Networking Night": """\
## Tech Networking Night 🚀

*The event is happening **right now** — walk in and start connecting!*

---

### Tonight's Programme

| Time | Activity |
|---|---|
| Now – +30 min | Open networking, food & drinks |
| +30 – +60 min | Lightning talks (3 × 5 min) |
| +60 – end | Open floor Q&A + more networking |

### Lightning Talk Topics

1. **"From Monolith to Microservices — Lessons Learned"** — Jiho Choi
2. **"Prompt Engineering That Actually Works"** — Mina Seo
3. **"Building in Public: 6 Months, 0 to 1,000 Users"** — Ryan Oh

### Tips for Networking

- Lead with *curiosity*, not your job title
- Ask **"What are you working on?"** instead of "What do you do?"
- Exchange LinkedIn / GitHub — not just business cards

> *Drinks and light snacks provided. Dietary restrictions? Let a volunteer know.*

---

See you inside! 🎉
""",
        }

        seminars: list[tuple[Seminar, int, float]] = []
        for title, host, location, days_ago, max_cap, n_rsvp, ci_rate, cover_image in seminar_specs:
            start = now - timedelta(days=days_ago)
            seminar = Seminar(
                title=title,
                host=host,
                location=location,
                start_time=start,
                end_time=start + timedelta(hours=2),
                max_capacity=max_cap,
                rsvp_enabled=True,
                waitlist_enabled=(max_cap is not None),
                cover_image=cover_image,
                description=MOCK_DESCRIPTIONS.get(title, f"A practical session on {title}."),
            )
            self.db.add(seminar)
            seminars.append((seminar, n_rsvp, ci_rate))

        # ── 3-extra. Upcoming seminars (for UI filter testing) ────────────────
        upcoming_specs = [
            ("Blockchain & Web3 Dev",
             "David Yoon",
             "Stanford d.school, 416 Escondido Mall, Stanford, CA",
             7, 30,
             "https://picsum.photos/seed/blockchain/800/450"),
            ("Open Source Contribution Workshop",
             "Carol Lee",
             "KOTRA Silicon Valley, 3003 N 1st St, San Jose, CA",
             21, None,
             "https://picsum.photos/seed/opensource/800/450"),
        ]
        for title, host, location, days_ahead, max_cap, cover_image in upcoming_specs:
            start = now + timedelta(days=days_ahead)
            s = Seminar(
                title=title, host=host, location=location,
                start_time=start,
                end_time=start + timedelta(hours=2),
                max_capacity=max_cap,
                rsvp_enabled=True,
                waitlist_enabled=(max_cap is not None),
                cover_image=cover_image,
                description=MOCK_DESCRIPTIONS.get(title, f"An upcoming session on {title}."),
            )
            self.db.add(s)
            seminars.append((s, 5, 0.0))   # a few RSVPs, no check-ins yet

        # ── 3-extra. Live Now seminar (starts 1 h ago, ends 1 h from now) ─────
        live_start = now - timedelta(hours=1)
        live_seminar = Seminar(
            title="Tech Networking Night",
            host="Bob Park",
            location="Samsung Research America, 665 Clyde Ave, Mountain View, CA",
            start_time=live_start,
            end_time=live_start + timedelta(hours=2),   # = now + 1 h
            max_capacity=50,
            rsvp_enabled=True,
            waitlist_enabled=True,
            cover_image="https://picsum.photos/seed/networking/800/450",
            description=MOCK_DESCRIPTIONS["Tech Networking Night"],
        )
        self.db.add(live_seminar)
        seminars.append((live_seminar, 12, 0.0))   # 12 RSVPs, event in progress

        await self.db.flush()   # populate seminar IDs

        # ── 3. Create RSVPs and check-ins ─────────────────────────────────────
        total_rsvps = 0
        total_checkins = 0

        for seminar, n_rsvp, ci_rate in seminars:
            n_checkin = round(n_rsvp * ci_rate)
            participants = users[:n_rsvp]
            for idx, user in enumerate(participants):
                checked_in = idx < n_checkin
                rsvp = SeminarRSVP(
                    seminar_id=seminar.id,
                    user_id=user.id,
                    checked_in=checked_in,
                    checked_in_at=(
                        seminar.start_time + timedelta(minutes=3 + idx * 2)
                        if checked_in else None
                    ),
                )
                self.db.add(rsvp)
                total_rsvps += 1
                if checked_in:
                    total_checkins += 1

        await self.db.commit()

        return {
            "skipped": False,
            "message": "Mock data created successfully.",
            "users_created": len(users),
            "seminars_created": len(seminars),
            "rsvps_created": total_rsvps,
            "checkins_created": total_checkins,
            "note": (
                "Mock members: mock_user_01@kpai.test … mock_user_20@kpai.test / password123. "
                "Staff user: soo@soo / sooo. Delete mock users to re-seed."
            ),
        }