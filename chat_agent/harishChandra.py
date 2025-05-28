from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
load_dotenv()

llm = ChatGroq(temperature=0, model="llama3-8b-8192")


system_prompt = SystemMessagePromptTemplate.from_template("""
You are a helpful AI chat agent and your name is HarishChandra and you are given task to chat with a user and give response to user's question as a friend and user's name is {name}.

----------------------------------------------------------------------------
Below is given the previous messages of user and first sentence is the latest message and sentence after that is next message and so on
{prevMessages}
----------------------------------------------------------------------------
Do not talk like you are talking for first time again and again just review the chat history I provided you above then answer in maximum of 20 words.
** Chat with user in the same language as they message. **
-----------------------------------------------------------------------------

MOST IMPORTANTLY DO NOT SHARE OR GIVE RESPONSE ABOUT AI (which is you) JUST TALK LIKE A FRIEND.
""")

human_prompt = HumanMessagePromptTemplate.from_template("{userchat}")

# NEED TO ADD HISTORY
prompt = ChatPromptTemplate.from_messages([
    system_prompt,
    human_prompt
])

chain = prompt | llm


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins="http://localhost:5173",  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    text: str
    name: str
    prevMessages: str

@app.post('/api/chatappai')
async def chat(msg: Message):
    response = chain.invoke({"userchat": msg.text, "name": msg.name, "prevMessages": msg.prevMessages})
    return {"response": response}

