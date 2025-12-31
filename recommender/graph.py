import os
import json
from typing import Annotated, TypedDict, List, Union
from typing_extensions import NotRequired

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# We will need the recommender instance. 
# Since we can't easily pass it into the graph building function structure cleanly 
# without a closure or class, we'll create a factory function.

class AgentState(TypedDict):
    """The state of the agent."""
    messages: Annotated[List[BaseMessage], add_messages]
    # We can track other state here if needed, like user profile or current recipe context
    
def create_chef_graph(recommender):
    
    # --- TOOLS ---
    
    @tool
    def search_recipes(query: str) -> str:
        """
        Search for recipes based on ingredients, food name, or description.
        """
        try:
            results = recommender.recommend(query=query, topk_final=5)
            if not results:
                return "No recipes found matching that query."
            
            # We serialize the full result object so the LLM has all info
            # But deepseek might hallucinate if we give too much JSON. 
            # Let's give a concise text format for the "Thinking" part, 
            # and use the ui_show_recipes tool for the "Showing" part.
            
            output = "Found the following recipes:\n"
            for r in results:
                output += f"- ID {r.recipe_id}: {r.name} (Ingredients: {', '.join(r.ingredients[:5])}...)\n"
            
            return output
        except Exception as e:
            return f"Error during search: {str(e)}"

    @tool
    def get_recipe_details(recipe_id: int) -> str:
        """
        Get full details (ingredients and steps) for a specific recipe by its ID.
        """
        try:
            data = recommender.get_recipe_by_id(recipe_id)
            if not data:
                return f"Recipe with ID {recipe_id} not found."
            return json.dumps(data) # Return JSON so the LLM can parse it if needed
        except Exception as e:
            return f"Error getting details: {str(e)}"

    @tool
    def find_leftover_recipes(ingredient: str) -> str:
        """
        Finds recipes specifically meant to use up a leftover ingredient.
        It searches for recipes using the ingredient and filters for relevance.
        Returns a carousel of matches.
        """
        try:
            # 1. Broad Search
            results = recommender.recommend(query=f"recipes with {ingredient}", topk_final=20)
            
            # 2. Strict Filter
            filtered = []
            for r in results:
                # Check if keyword matching
                if any(ingredient.lower() in ing.lower() for ing in r.ingredients):
                    filtered.append(r)
            
            # Take top 5 from filtered, or fallback to original results if none found (soft matches)
            matches = filtered[:5] if filtered else results[:5]
            
            if not matches:
                return f"Sorry, I couldn't find any recipes using {ingredient}."

            # 3. Format result JSON
            recipes_data = []
            for r in matches:
                recipes_data.append({
                    "id": r.recipe_id,
                    "name": r.name,
                    "description": r.description,
                    "ingredients": r.ingredients[:5]
                })
                
            return json.dumps({
                "type": "ui_component",
                "component": "RecipeCarousel",
                "props": {"recipes": recipes_data}
            })
        except Exception as e:
            return f"Error finding leftovers: {str(e)}"

    @tool
    def ui_show_recipes(recipe_ids: List[int]) -> str:
        """
        Display a carousel of recipe cards to the user.
        Call this tool ONLY when you have found specific recipes you want to suggest to the user.
        """
        # Fetch details for the UI
        recipes_data = []
        for rid in recipe_ids:
            r = recommender.get_recipe_by_id(rid)
            if r:
                recipes_data.append({
                    "id": r["recipe_id"],
                    "name": r["name"],
                    "description": r["description"],
                    "ingredients": r["ingredients"][:5] # Limit ingredients for card view
                })
        
        # Return a structured JSON signal that the frontend can parse.
        # We prefix it so we can easily regex it if needed, or just return raw JSON.
        return json.dumps({
            "type": "ui_component",
            "component": "RecipeCarousel",
            "props": {"recipes": recipes_data}
        })

    tools = [search_recipes, get_recipe_details, ui_show_recipes, find_leftover_recipes]
    
    # --- MODEL ---
    
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENAI_API_KEY")
    llm = ChatOpenAI(
        model="deepseek-chat", # Or deepseek-vl-chat if supporting vision specifically via a different model name
        api_key=api_key,
        base_url="https://api.deepseek.com",
        temperature=0.7
    ).bind_tools(tools)

    # --- NODES ---
    
    def chatbot(state: AgentState):
        """The main chatbot node that invokes the LLM."""
        return {"messages": [llm.invoke(state["messages"])]}

    from langgraph.prebuilt import ToolNode
    tool_node = ToolNode(tools)

    # --- GRAPH ---
    
    graph_builder = StateGraph(AgentState)
    graph_builder.add_node("chatbot", chatbot)
    graph_builder.add_node("tools", tool_node)

    graph_builder.add_edge(START, "chatbot")
    
    def tools_condition(state: AgentState):
        """Conditional edge: check if the last message has tool calls."""
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            return "tools"
        return END

    graph_builder.add_conditional_edges("chatbot", tools_condition)
    graph_builder.add_edge("tools", "chatbot") # Loop back to chatbot after tools

    return graph_builder.compile()

# System Prompt
SYSTEM_PROMPT = """You are the 'Conversational Chef', a friendly, expert nutritionist and cooking assistant.

Your capabilities:
1. SEE: You can understand images of ingredients (if provided).
2. SEARCH: Use `search_recipes` to find food.
3. SHOW: Use `ui_show_recipes` to display a beautiful carousel of cards to the user. THIS IS BETTER than just listing them in text.
4. DETAIL: Use `get_recipe_details` if the user wants to cook something.
5. LEFTOVERS: Use `find_leftover_recipes` if the user asks how to use up a specific ingredient (e.g. "What can I do with extra basil?").

Workflow:
- If User inputs image/ingredients -> `search_recipes`.
- If search returns good results -> Call `ui_show_recipes` with the IDs to show them visually, AND write a brief friendly summary.
- If user clicks/asks about a specific one -> `get_recipe_details`.
- If user asks about using leftovers -> `find_leftover_recipes(ingredient)`.

Formatting:
- When mentioning specific recipes in text, ALWAYS use Markdown links: [Recipe Name](/recipe/ID). Example: [Tomato Soup](/recipe/123).

Tone: Warm, encouraging. professional.
"""
