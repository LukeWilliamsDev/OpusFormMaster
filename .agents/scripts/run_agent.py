import asyncio
import sys
import os

# Point to the IDE's custom language server binary wrapper to inherit OAuth credentials natively
os.environ["ANTIGRAVITY_HARNESS_PATH"] = r"C:\Users\Luke\AppData\Local\Programs\antigravity\resources\bin\language_server.exe"

from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
from google.antigravity.hooks import policy
from dotenv import load_dotenv

# Load developer environment variables
load_dotenv("C:/Users/Luke/Documents/OpusForm/opus-form-builder/.env")

async def main():
    if len(sys.argv) < 4:
        print("Usage: python run_agent.py <prompt> <instructions_path> <workspace_path>")
        sys.exit(1)
        
    prompt = sys.argv[1]
    instructions_path = sys.argv[2]
    workspace_path = sys.argv[3]
    
    # Read system instructions/rules from the SKILL.md file
    system_instructions = ""
    if os.path.exists(instructions_path):
        with open(instructions_path, 'r', encoding='utf-8') as f:
            system_instructions = f.read()
            
    # Configure the agent with full capabilities, safety policies and target workspace
    config = LocalAgentConfig(
        system_instructions=system_instructions,
        capabilities=CapabilitiesConfig(),
        workspaces=[workspace_path],
        policies=[policy.allow_all()],
        api_key="dummy"
    )
    
    output_path = os.path.join(workspace_path, "agent_output.log")
    
    # Run the agent using the config
    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        
        # Write agent thoughts and final output to a local log file
        with open(output_path, "w", encoding="utf-8") as out:
            async for token in response:
                out.write(token)
                
if __name__ == "__main__":
    asyncio.run(main())
