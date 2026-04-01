import os
from typing import List, Optional

from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# We assume this is imported in main.py, but for type hinting:
# from recommender.dense_recommender import DenseRecommender

def create_agent_executor(recommender):
    """
    Creates a LangChain AgentExecutor with access to the recommender tools.
    """
    
    @tool
    def search_recipes(query: str) -> str:
        """
        Search for recipes based on ingredients, food name, or description.
        Use this tool when the user asks for recipe suggestions, mentions specific ingredients, or describes a craving.
        
        Args:
            query: The search query. Can include ingredients (e.g. "chicken rice") or adjectives (e.g. "healthy spicy").
        """
        # The recommender uses semantic search, so we just pass the query directly
        try:
            results = recommender.recommend(query=query, topk_final=5)
            
            if not results:
                return "No recipes found matching that query."

            # Format results as a readable string for the LLM
            output = "Found the following recipes:\n"
            for r in results:
                output += f"- ID {r.recipe_id}: {r.name}\n"
                # Limit ingredients to first 5 for brevity in context
                ing_list = r.ingredients[:5]
                output += f"  Ingredients: {', '.join(ing_list)}{'...' if len(r.ingredients) > 5 else ''}\n"
                output += f"  Description: {r.description}\n\n"
                
            return output
        except Exception as e:
            return f"Error during search: {str(e)}"

    @tool
    def get_recipe_details(recipe_id: int) -> str:
        """
        Get full details (ingredients and steps) for a specific recipe by its ID.
        Use this when the user asks for "how to make [Recipe Name]" or wants to see the full recipe.
        
        Args:
            recipe_id: The integer ID of the recipe.
        """
        try:
            data = recommender.get_recipe_by_id(recipe_id)
            if not data:
                return f"Recipe with ID {recipe_id} not found."
                
            output = f"Recipe: {data['name']}\n"
            output += f"Description: {data['description']}\n"
            output += "Ingredients:\n" + "\n".join([f"- {x}" for x in data['ingredients']]) + "\n"
            output += "Steps:\n" + "\n".join([f"{i+1}. {x}" for x in data['steps']])
            return output
        except Exception as e:
            return f"Error getting details: {str(e)}"

    tools = [search_recipes, get_recipe_details]

    # Initialize LLM (Gemini)
    google_api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not google_api_key:
        print("WARNING: GOOGLE_API_KEY or GEMINI_API_KEY not found in environment.")

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=google_api_key,
        temperature=0.7
    )

    # Define Prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are the 'Conversational Chef', a friendly and expert nutritionist and cooking assistant.
        
        Your goal is to help users find tasty recipes and answer their cooking questions.
        
        GUIDELINES:
        1. USE TOOLS: When the user mentions ingredients or asks for food, call 'search_recipes'.
        2. BE PROACTIVE: If search results are broad, ask clarifying questions (e.g. "Do you want something quick?").
        3. FOLLOW UP: If the user picks a recipe, you can offer to show the full details using 'get_recipe_details'.
        4. ADAPT: If the user describes dietary goals (e.g. "healthy"), include that context in your search query or conversation.
        
        Example Interaction:
        User: "I have chicken."
        You: Call search_recipes("chicken") -> returns list.
        You: "I found Chicken Curry and Roast Chicken. Which sounds better?"
        User: "The curry."
        You: Call get_recipe_details(id) -> returns steps.
        You: "Here is the recipe for Chicken Curry..."
        """),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    return agent_executor
