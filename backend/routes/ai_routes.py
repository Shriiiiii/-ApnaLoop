from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth import get_current_user
from models import User
import random
import re
from datetime import datetime, timezone

router = APIRouter(prefix="/api/ai", tags=["ai"])

# ---- Smart Pattern-Matching AI Bot ----

GREETINGS = [
    "Hey there! 👋 How can I help you today?",
    "Hi! I'm ApnaLoop AI, your friendly assistant. What's on your mind?",
    "Hello! Great to see you. Ask me anything!",
    "Hey! Ready to help. What would you like to know?",
]

JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
    "Why did the developer go broke? Because he used up all his cache! 💰",
    "A SQL query walks into a bar, walks up to two tables and asks... 'Can I join you?' 🍺",
    "Why do Java developers wear glasses? Because they can't C#! 👓",
    "What's a programmer's favorite hangout place? Foo Bar! 🍕",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem! 💡",
    "Why was the JavaScript developer sad? Because he didn't Node how to Express himself! 😢",
    "What did the router say to the doctor? 'It hurts when IP!' 🏥",
]

MOTIVATIONAL = [
    "You're doing amazing! Keep pushing forward. Every expert was once a beginner. 🌟",
    "The only way to do great work is to love what you do. Keep going! 💪",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. 🚀",
    "Believe in yourself and all that you are. Know that there is something inside you greater than any obstacle. ✨",
    "Your potential is endless. Go do what you were created to do! 🔥",
]

FACTS = [
    "Did you know? India has the world's largest postal network with over 1,55,000 post offices! 📮",
    "Fun fact: The number zero was invented in India by Aryabhata! 🔢",
    "Did you know? India's Chandrayaan-3 successfully landed on the Moon's south pole in 2023! 🌙",
    "Fun fact: Chess was invented in India, originally called 'Chaturanga'! ♟️",
    "Did you know? The Taj Mahal's color changes throughout the day — pinkish in the morning, white during the day, and golden at night! 🏛️",
    "Fun fact: India has the world's largest cricket stadium — Narendra Modi Stadium in Ahmedabad! 🏏",
    "Did you know? Yoga originated in India over 5,000 years ago! 🧘",
    "Fun fact: India is the world's largest producer of milk! 🥛",
]

WEATHER_RESPONSES = [
    "I can't check real weather, but here's my prediction: It's a perfect day to code! ☀️ Stay hydrated! 💧",
    "Weather forecast from ApnaLoop AI: 100% chance of productivity today! ⚡ Don't forget to take breaks.",
    "I sense great vibes in the atmosphere today! Whether it's sunny or rainy, make the most of it! 🌈",
]

HELP_RESPONSES = [
    "Here's what I can do:\n• Tell you jokes 🎭\n• Share fun facts 📚\n• Give motivation 💪\n• Chat about anything 💬\n• Help with Nexus features ❓\n\nJust ask!",
]

ABOUT_RESPONSES = [
    "I'm ApnaLoop AI! 🤖 I'm your built-in assistant here on ApnaLoop. I can tell jokes, share facts, motivate you, and chat. I'm always at the top of your chat list!",
]

GOODBYE = [
    "See you later! Have a great day! 👋✨",
    "Bye! Don't be a stranger — I'm always here! 🤗",
    "Take care! Come chat anytime! 💜",
]

FALLBACK = [
    "That's interesting! Tell me more about it. 🤔",
    "I appreciate you sharing that! What else is on your mind? 😊",
    "Hmm, that's a great point. I'm still learning — anything else I can help with? 💡",
    "Cool! I love chatting with you. What's next? 🎉",
    "Nice! Let me know if you need help with anything on ApnaLoop. 🚀",
]


def get_ai_response(message: str) -> str:
    msg = message.lower().strip()

    # Greetings
    if any(w in msg for w in ["hi", "hello", "hey", "sup", "namaste", "hola", "yo"]):
        return random.choice(GREETINGS)

    # Jokes
    if any(w in msg for w in ["joke", "funny", "laugh", "humor", "haha"]):
        return random.choice(JOKES)

    # Motivation
    if any(w in msg for w in ["motivat", "inspire", "encourage", "sad", "down", "feeling low", "depressed"]):
        return random.choice(MOTIVATIONAL)

    # Facts
    if any(w in msg for w in ["fact", "did you know", "tell me something", "trivia", "interesting"]):
        return random.choice(FACTS)

    # Weather
    if any(w in msg for w in ["weather", "temperature", "rain", "sunny", "forecast"]):
        return random.choice(WEATHER_RESPONSES)

    # Help
    if any(w in msg for w in ["help", "what can you do", "features", "commands"]):
        return random.choice(HELP_RESPONSES)

    # About
    if any(w in msg for w in ["who are you", "about you", "your name", "what are you"]):
        return random.choice(ABOUT_RESPONSES)

    # Goodbye
    if any(w in msg for w in ["bye", "goodbye", "see you", "later", "cya", "good night"]):
        return random.choice(GOODBYE)

    # Time
    if any(w in msg for w in ["time", "what time", "clock"]):
        now = datetime.now(timezone.utc).strftime("%I:%M %p UTC")
        return f"The current time is {now} ⏰"

    # Thanks
    if any(w in msg for w in ["thanks", "thank you", "thx", "ty"]):
        return "You're welcome! Happy to help! 😊💜"

    # Compliment
    if any(w in msg for w in ["you're great", "awesome", "love you", "best", "amazing"]):
        return "Aww, thank you! You're pretty awesome yourself! 🥰✨"

    # Default
    return random.choice(FALLBACK)


class AIMessageRequest(BaseModel):
    message: str


class AIMessageResponse(BaseModel):
    response: str


@router.post("/chat", response_model=AIMessageResponse)
async def ai_chat(data: AIMessageRequest, current_user: User = Depends(get_current_user)):
    response = get_ai_response(data.message)
    return AIMessageResponse(response=response)
