"""Seed the database with Indian-centric dummy data and Nexus AI bot."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, async_session, Base
from models import User, Post, Follow, Conversation, ConversationMember, Message
from auth import hash_password
from datetime import datetime, timezone, timedelta


PLACEHOLDER_IMAGES = [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800",
    "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=800",
    "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800",
]

CAPTIONS = [
    "Golden hour at the Himalayas 🏔️",
    "Nature never goes out of style 🌿",
    "Wanderlust vibes from Goa ✈️",
    "Chasing sunsets in Jaipur 🌅",
    "Into the wild — Ranthambore 🐅",
    "Ocean breeze at Marina Beach 🌊",
    "Paradise found in Kerala 🏖️",
    "Starry night at Ladakh 🌌",
    "Backwaters of Alleppey 🛶",
    "Morning mist in Munnar ☕",
    "Weekend trek near Coorg 🥾",
    "Vibes from Hampi ruins 🏛️",
]


async def seed():
    # Recreate all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Create ApnaLoop AI bot user (always id=1)
        ai_bot = User(
            username="apnaloop_ai",
            email="ai@apnaloop.app",
            display_name="ApnaLoop AI",
            bio="Your intelligent assistant 🤖 | Ask me anything!",
            hashed_password=hash_password("apnaloop_ai_bot_secret_2024"),
            avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=apnaloop_ai&backgroundColor=6366f1",
        )
        db.add(ai_bot)
        await db.flush()
        await db.refresh(ai_bot)

        # Create Indian users
        users_data = [
            {"username": "praveen", "email": "praveen@apnaloop.app", "display_name": "Praveen", "bio": "Photography enthusiast | Travel lover 📸 | Mumbai"},
            {"username": "manu", "email": "manu@apnaloop.app", "display_name": "Manu", "bio": "Developer by day, gamer by night 🎮 | Bangalore"},
            {"username": "prajwal", "email": "prajwal@apnaloop.app", "display_name": "Prajwal", "bio": "Coffee addict ☕ | Music lover 🎵 | Delhi"},
            {"username": "raviteja", "email": "raviteja@apnaloop.app", "display_name": "Raviteja", "bio": "Fitness | Cricket | Positive vibes ✨ | Hyderabad"},
            {"username": "rakshith", "email": "rakshith@apnaloop.app", "display_name": "Rakshith", "bio": "Artist & Designer 🎨 | Creating beautiful things | Chennai"},
            {"username": "sachin", "email": "sachin@apnaloop.app", "display_name": "Sachin", "bio": "Startup founder 🚀 | Tech nerd | Pune"},
            {"username": "shashank", "email": "shashank@apnaloop.app", "display_name": "Shashank", "bio": "Traveler 🌍 | Foodie 🍕 | Kolkata"},
            {"username": "rehman", "email": "rehman@apnaloop.app", "display_name": "Rehman", "bio": "Musician 🎸 | Night owl 🦉 | Lucknow"},
            {"username": "yashwanth", "email": "yashwanth@apnaloop.app", "display_name": "Yashwanth", "bio": "Full-stack dev 💻 | Anime fan | Mangalore"},
        ]

        users = []
        for ud in users_data:
            user = User(
                username=ud["username"],
                email=ud["email"],
                display_name=ud["display_name"],
                bio=ud["bio"],
                hashed_password=hash_password("ApnaLoop2024!"),
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={ud['username']}",
            )
            db.add(user)
            users.append(user)

        await db.flush()
        for u in users:
            await db.refresh(u)

        # Create follows (various connections)
        follow_pairs = [
            (0, 1), (0, 2), (0, 3), (0, 5),
            (1, 0), (1, 2), (1, 4),
            (2, 0), (2, 3), (2, 4), (2, 8),
            (3, 0), (3, 1), (3, 5), (3, 6),
            (4, 0), (4, 2), (4, 7),
            (5, 0), (5, 1), (5, 3),
            (6, 0), (6, 2), (6, 4), (6, 7),
            (7, 0), (7, 3), (7, 5), (7, 8),
            (8, 0), (8, 1), (8, 6),
        ]
        for fi, ti in follow_pairs:
            db.add(Follow(follower_id=users[fi].id, following_id=users[ti].id))

        # Create posts
        now = datetime.now(timezone.utc)
        for i in range(12):
            author = users[i % len(users)]
            post = Post(
                author_id=author.id,
                image_url=PLACEHOLDER_IMAGES[i],
                caption=CAPTIONS[i],
                likes_count=i * 3 + 2,
                created_at=now - timedelta(hours=i * 5),
            )
            db.add(post)

        # Create AI conversation for every user
        for user in users:
            ai_conv = Conversation(name="", is_group=False, updated_at=now - timedelta(minutes=5))
            db.add(ai_conv)
            await db.flush()
            await db.refresh(ai_conv)
            db.add(ConversationMember(conversation_id=ai_conv.id, user_id=user.id))
            db.add(ConversationMember(conversation_id=ai_conv.id, user_id=ai_bot.id))

            db.add(Message(
                conversation_id=ai_conv.id,
                sender_id=ai_bot.id,
                content="Hey! 👋 I'm ApnaLoop AI, your intelligent assistant. Ask me anything — jokes, facts, motivation, or just chat!",
                created_at=now - timedelta(minutes=5),
            ))

        # User conversations
        conv1 = Conversation(name="", is_group=False, updated_at=now - timedelta(minutes=10))
        db.add(conv1)
        await db.flush()
        await db.refresh(conv1)
        db.add(ConversationMember(conversation_id=conv1.id, user_id=users[0].id))
        db.add(ConversationMember(conversation_id=conv1.id, user_id=users[1].id))

        conv2 = Conversation(name="", is_group=False, updated_at=now - timedelta(hours=1))
        db.add(conv2)
        await db.flush()
        await db.refresh(conv2)
        db.add(ConversationMember(conversation_id=conv2.id, user_id=users[0].id))
        db.add(ConversationMember(conversation_id=conv2.id, user_id=users[2].id))

        conv3 = Conversation(name="", is_group=False, updated_at=now - timedelta(hours=2))
        db.add(conv3)
        await db.flush()
        await db.refresh(conv3)
        db.add(ConversationMember(conversation_id=conv3.id, user_id=users[3].id))
        db.add(ConversationMember(conversation_id=conv3.id, user_id=users[4].id))

        conv4 = Conversation(name="", is_group=False, updated_at=now - timedelta(hours=3))
        db.add(conv4)
        await db.flush()
        await db.refresh(conv4)
        db.add(ConversationMember(conversation_id=conv4.id, user_id=users[5].id))
        db.add(ConversationMember(conversation_id=conv4.id, user_id=users[6].id))

        messages_data = [
            (conv1.id, users[0].id, "Hey Manu! Kya haal hai bro? 😊", now - timedelta(minutes=30)),
            (conv1.id, users[1].id, "Sab badhiya Praveen! Working on ApnaLoop 🚀", now - timedelta(minutes=28)),
            (conv1.id, users[0].id, "Nice yaar! What's the new feature?", now - timedelta(minutes=25)),
            (conv1.id, users[1].id, "Real-time chat with AI bot 😄", now - timedelta(minutes=20)),
            (conv1.id, users[0].id, "Sick! Let's test it together!", now - timedelta(minutes=10)),
            (conv2.id, users[0].id, "Prajwal, did you see the sunset yesterday?", now - timedelta(hours=2)),
            (conv2.id, users[2].id, "Haan yaar! It was absolutely stunning 🌅", now - timedelta(hours=1, minutes=50)),
            (conv2.id, users[0].id, "Got some amazing photos from Marine Drive", now - timedelta(hours=1, minutes=40)),
            (conv2.id, users[2].id, "Post them on ApnaLoop bro!", now - timedelta(hours=1)),
            (conv3.id, users[3].id, "Rakshith, cricket match this weekend?", now - timedelta(hours=3)),
            (conv3.id, users[4].id, "Definitely! Sunday morning? 🏏", now - timedelta(hours=2, minutes=30)),
            (conv3.id, users[3].id, "Perfect, 7 AM at the ground! 💪", now - timedelta(hours=2)),
            (conv4.id, users[5].id, "Shashank, check out this new restaurant!", now - timedelta(hours=4)),
            (conv4.id, users[6].id, "Where? Send me the location 🍕", now - timedelta(hours=3, minutes=30)),
        ]

        for conv_id, sender_id, content, created in messages_data:
            db.add(Message(
                conversation_id=conv_id,
                sender_id=sender_id,
                content=content,
                created_at=created,
            ))

        await db.commit()

    print("✅ Database seeded successfully!")
    print("   🤖 ApnaLoop AI bot created (id=1)")
    print("   Users: praveen, manu, prajwal, raviteja, rakshith, sachin, shashank, rehman, yashwanth")
    print("   Password for all users: ApnaLoop2024!")
    print("   Posts created: 12")


if __name__ == "__main__":
    asyncio.run(seed())
