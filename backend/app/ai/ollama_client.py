import httpx
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger

class OllamaClient:
    def __init__(self, base_url: str = settings.OLLAMA_URL):
        self.base_url = base_url.rstrip("/")

    async def check_health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    return {
                        "connected": True,
                        "url": self.base_url,
                        "models": models,
                        "default_model": settings.DEFAULT_AI_MODEL if settings.DEFAULT_AI_MODEL in models else (models[0] if models else "")
                    }
        except Exception as e:
            logger.debug(f"Ollama connection check failed: {e}")
            
        return {
            "connected": False,
            "url": self.base_url,
            "models": [],
            "default_model": None,
            "error": "Ollama is offline or unreachable at " + self.base_url
        }

    async def list_models(self) -> List[str]:
        health = await self.check_health()
        return health.get("models", [])

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        chosen_model = model or settings.DEFAULT_AI_MODEL
        
        # Verify model exists, otherwise fallback to first available
        health = await self.check_health()
        if not health["connected"]:
            return "Local Ollama service is not currently running. Start Ollama and try again."
            
        available_models = health.get("models", [])
        if chosen_model not in available_models and available_models:
            chosen_model = available_models[0]

        payload = {
            "model": chosen_model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("message", {}).get("content", "")
                else:
                    return f"Ollama error (HTTP {res.status_code}): {res.text}"
        except Exception as e:
            logger.error(f"Error communicating with Ollama: {e}")
            return f"Failed to get AI response: {str(e)}"

ollama_client = OllamaClient()
