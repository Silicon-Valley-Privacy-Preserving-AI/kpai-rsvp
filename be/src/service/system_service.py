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
                description=(
                    f"A practical session covering key concepts in {title.lower()}. "
                    "Participants will gain hands-on experience through live demos and Q&A."
                ),
            )
            self.db.add(seminar)
            seminars.append((seminar, n_rsvp, ci_rate))

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